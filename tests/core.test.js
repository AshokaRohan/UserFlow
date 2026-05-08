import assert from 'node:assert/strict';
import test from 'node:test';
import {
  approveAutomationDraft,
  createAutomationDraftFromSuggestion,
  createAutomationFromSuggestion,
  detectSuggestions,
  evaluateAutomations,
  inferIntent,
  normalizeEvent,
  sanitizeKeyEvent
} from '../src/core.js';

test('sanitizeKeyEvent redacts typed characters', () => {
  assert.deepEqual(sanitizeKeyEvent({ key: 'a' }), {
    kind: 'redacted-character',
    label: '[character]'
  });
  assert.deepEqual(sanitizeKeyEvent({ key: 'Enter' }), {
    kind: 'safe-key',
    label: 'Enter'
  });
  assert.deepEqual(sanitizeKeyEvent({ key: 'k', metaKey: true }), {
    kind: 'shortcut',
    label: 'Meta+K'
  });
});

test('normalizeEvent creates stable workflow tokens', () => {
  assert.equal(
    normalizeEvent({ type: 'click', targetLabel: 'Export Report' }),
    'click:export-report'
  );
  assert.equal(
    normalizeEvent({ type: 'key', keyLabel: 'Meta+K' }),
    'key:meta-k'
  );
});

test('detectSuggestions finds repeated workflows', () => {
  const sequence = [
    { type: 'click', targetLabel: 'Open inbox' },
    { type: 'click', targetLabel: 'Priority filter' },
    { type: 'change', targetLabel: 'Priority filter' },
    { type: 'click', targetLabel: 'Assign teammate' }
  ];
  const suggestions = detectSuggestions([...sequence, ...sequence]);
  assert.equal(suggestions[0].type, 'sequence');
  assert.ok(suggestions[0].confidence > 0.6);
});

test('detectSuggestions finds frequent repeated action', () => {
  const events = Array.from({ length: 4 }, () => ({
    type: 'click',
    targetLabel: 'Export report'
  }));
  const suggestions = detectSuggestions(events);
  assert.ok(suggestions.some((suggestion) => suggestion.type === 'frequency'));
});

test('createAutomationFromSuggestion and evaluateAutomations activate on matching trigger', () => {
  const events = [
    { type: 'click', targetLabel: 'Open inbox' },
    { type: 'click', targetLabel: 'Priority filter' },
    { type: 'change', targetLabel: 'Priority filter' }
  ];
  const suggestion = detectSuggestions([...events, ...events])[0];
  const automation = createAutomationFromSuggestion(suggestion);
  const activations = evaluateAutomations(events, [automation]);
  assert.equal(activations.length, 1);
  assert.equal(activations[0].automationId, automation.id);
});

test('automation drafts require review approval before they can activate', () => {
  const events = [
    { type: 'click', targetLabel: 'Open inbox' },
    { type: 'click', targetLabel: 'Priority filter' },
    { type: 'change', targetLabel: 'Priority filter' }
  ];
  const suggestion = detectSuggestions([...events, ...events])[0];
  const draft = createAutomationDraftFromSuggestion(suggestion);

  assert.equal(draft.active, false);
  assert.equal(draft.status, 'draft');
  assert.ok(draft.review.capabilities.length > 0);
  assert.equal(evaluateAutomations(events, [draft]).length, 0);

  const approved = approveAutomationDraft(draft, {
    name: 'Reviewed inbox triage',
    action: 'Open the triage checklist and prefill the safe steps',
    corrected: true
  });

  assert.equal(approved.active, true);
  assert.equal(approved.status, 'active');
  assert.equal(approved.name, 'Reviewed inbox triage');
  assert.equal(evaluateAutomations(events, [approved]).length, 1);
});

test('inferIntent labels triage and reporting patterns', () => {
  assert.equal(
    inferIntent([{ type: 'click', targetLabel: 'Assign teammate' }]).intent,
    'triage'
  );
  assert.equal(
    inferIntent([{ type: 'click', targetLabel: 'Export report' }]).intent,
    'reporting'
  );
});
