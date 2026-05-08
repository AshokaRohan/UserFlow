const SAFE_KEYS = new Set([
  'Enter',
  'Tab',
  'Escape',
  'Backspace',
  'Delete',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight'
]);

const SHORTCUT_KEYS = new Set([
  'a',
  'c',
  'f',
  'k',
  'p',
  's',
  'v',
  'x',
  'z',
  'Enter',
  'Backspace'
]);

export function sanitizeKeyEvent(event) {
  const modifiers = [];
  if (event.metaKey) modifiers.push('Meta');
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');

  const hasModifier = modifiers.length > 0;
  const key = String(event.key || '');

  if (hasModifier && SHORTCUT_KEYS.has(key.length === 1 ? key.toLowerCase() : key)) {
    return {
      kind: 'shortcut',
      label: [...modifiers, key.length === 1 ? key.toUpperCase() : key].join('+')
    };
  }

  if (SAFE_KEYS.has(key)) {
    return { kind: 'safe-key', label: key };
  }

  if (key.length === 1) {
    return { kind: 'redacted-character', label: '[character]' };
  }

  return { kind: 'other-key', label: '[key]' };
}

export function normalizeTargetLabel(label = '') {
  return String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'workspace';
}

export function normalizeEvent(event) {
  const target = normalizeTargetLabel(event.targetLabel || event.zone || event.target || 'workspace');
  if (event.type === 'key') return `key:${normalizeTargetLabel(event.keyLabel || event.keyKind || 'key')}`;
  if (event.type === 'move') return `move:${normalizeTargetLabel(event.zone || 'workspace')}`;
  if (event.type === 'focus') return `focus:${target}`;
  if (event.type === 'change') return `change:${target}`;
  return `${event.type}:${target}`;
}

export function inferIntent(events) {
  const recent = events.slice(-40);
  const scores = {
    triage: 0,
    reporting: 0,
    editing: 0,
    navigation: 0,
    admin: 0
  };

  for (const event of recent) {
    const token = normalizeEvent(event);
    if (/inbox|assign|status|priority|case|lead/.test(token)) scores.triage += 2;
    if (/export|report|metric|filter|date|chart/.test(token)) scores.reporting += 2;
    if (/note|description|comment|editor|compose|draft/.test(token)) scores.editing += 2;
    if (/nav|tab|menu|back|forward|open/.test(token)) scores.navigation += 1.5;
    if (/settings|admin|permission|team/.test(token)) scores.admin += 1.5;
    if (event.type === 'key') scores.editing += event.keyKind === 'redacted-character' ? 0.2 : 0;
  }

  const [intent, score] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const labels = {
    triage: 'Triage workflow',
    reporting: 'Reporting workflow',
    editing: 'Editing or drafting',
    navigation: 'Navigation',
    admin: 'Admin setup'
  };

  return {
    intent,
    label: score > 0 ? labels[intent] : 'Watching for a pattern',
    confidence: Math.min(0.94, Math.max(0.18, score / 16))
  };
}

export function detectSuggestions(events, existingAutomations = []) {
  const recent = events.slice(-90);
  const suggestions = [];
  const existingFingerprints = new Set(existingAutomations.map((automation) => automation.fingerprint));
  const tokens = recent
    .filter((event) => event.type !== 'move')
    .map((event) => normalizeEvent(event));

  const sequenceSuggestion = findRepeatedSequence(tokens, existingFingerprints);
  if (sequenceSuggestion) suggestions.push(sequenceSuggestion);

  const frequencySuggestion = findFrequentAction(recent, existingFingerprints);
  if (frequencySuggestion) suggestions.push(frequencySuggestion);

  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4);
}

function findRepeatedSequence(tokens, existingFingerprints) {
  const counts = new Map();

  for (let size = 3; size <= 6; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const sequence = tokens.slice(index, index + size);
      if (new Set(sequence).size < 2) continue;
      const key = sequence.join('>');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const best = [...counts.entries()]
    .filter(([fingerprint, count]) => count >= 2 && !existingFingerprints.has(fingerprint))
    .sort((a, b) => b[1] - a[1] || b[0].split('>').length - a[0].split('>').length)[0];

  if (!best) return null;

  const [fingerprint, count] = best;
  const sequence = fingerprint.split('>');

  return {
    id: stableId(`suggestion-${fingerprint}`),
    type: 'sequence',
    title: 'Repeated workflow detected',
    summary: `This ${sequence.length}-step pattern appeared ${count} times.`,
    trigger: `When this sequence appears again: ${humanizeSequence(sequence)}`,
    action: 'Prepare the same workflow steps and show a one-click run checklist.',
    confidence: Math.min(0.95, 0.52 + count * 0.12 + sequence.length * 0.025),
    sequence,
    fingerprint
  };
}

function findFrequentAction(events, existingFingerprints) {
  const actionCounts = new Map();
  for (const event of events) {
    if (!['click', 'change', 'submit'].includes(event.type)) continue;
    const token = normalizeEvent(event);
    actionCounts.set(token, (actionCounts.get(token) || 0) + 1);
  }

  const best = [...actionCounts.entries()]
    .filter(([token, count]) => count >= 4 && !existingFingerprints.has(`frequency:${token}`))
    .sort((a, b) => b[1] - a[1])[0];

  if (!best) return null;

  const [token, count] = best;
  return {
    id: stableId(`suggestion-frequency-${token}`),
    type: 'frequency',
    title: 'Frequent action detected',
    summary: `${humanizeToken(token)} happened ${count} times in this session.`,
    trigger: `When ${humanizeToken(token)} happens twice in a short window.`,
    action: 'Offer to bundle the surrounding steps into a reusable automation.',
    confidence: Math.min(0.9, 0.46 + count * 0.08),
    sequence: [token, token],
    fingerprint: `frequency:${token}`
  };
}

export function createAutomationFromSuggestion(suggestion) {
  return {
    id: stableId(`automation-${suggestion.fingerprint}-${Date.now()}`),
    name: suggestion.title.replace(' detected', ''),
    createdAt: new Date().toISOString(),
    active: true,
    status: 'active',
    runs: 0,
    lastRunAt: null,
    trigger: suggestion.trigger,
    action: suggestion.action,
    review: buildAutomationReview(suggestion),
    approvedAt: new Date().toISOString(),
    sequence: suggestion.sequence,
    fingerprint: suggestion.fingerprint
  };
}

export function createAutomationDraftFromSuggestion(suggestion) {
  return {
    id: stableId(`draft-${suggestion.fingerprint}-${Date.now()}`),
    name: suggestion.title.replace(' detected', ''),
    createdAt: new Date().toISOString(),
    active: false,
    status: 'draft',
    runs: 0,
    lastRunAt: null,
    trigger: suggestion.trigger,
    action: suggestion.action,
    review: buildAutomationReview(suggestion),
    approval: {
      confirmed: false,
      correctedAt: null,
      approvedAt: null
    },
    sequence: suggestion.sequence,
    fingerprint: suggestion.fingerprint
  };
}

export function approveAutomationDraft(draft, corrections = {}) {
  const review = {
    ...draft.review,
    capabilities: normalizeList(corrections.capabilities, draft.review?.capabilities),
    previewSteps: normalizeList(corrections.previewSteps, draft.review?.previewSteps),
    safeguards: normalizeList(corrections.safeguards, draft.review?.safeguards)
  };

  return {
    ...draft,
    name: cleanText(corrections.name, draft.name),
    trigger: cleanText(corrections.trigger, draft.trigger),
    action: cleanText(corrections.action, draft.action),
    review,
    active: true,
    status: 'active',
    approvedAt: new Date().toISOString(),
    approval: {
      confirmed: true,
      correctedAt: corrections.corrected ? new Date().toISOString() : draft.approval?.correctedAt || null,
      approvedAt: new Date().toISOString()
    }
  };
}

export function buildAutomationReview(suggestion) {
  const sequence = suggestion.sequence || [];
  return {
    explanation: `I will watch for this pattern and prepare the matching workflow only after the trigger repeats.`,
    capabilities: [
      'Detect the repeated trigger pattern from sanitized interaction metadata',
      'Create a reusable workflow draft for the same task',
      'Run a dry check before every activation',
      'Log each activation for review'
    ],
    cannotDo: [
      'Read raw typed text',
      'Run outside the approved workspace',
      'Take destructive actions without another approval step'
    ],
    dataUsed: [
      'Clicked target labels',
      'Changed control labels',
      'Safe keyboard metadata',
      'Timing and workflow sequence'
    ],
    previewSteps: sequence.length
      ? sequence.map((token, index) => `${index + 1}. ${humanizeToken(token)}`)
      : ['1. Watch for the repeated action', '2. Prepare a reviewable workflow checklist'],
    safeguards: [
      'Starts disabled until you approve this review',
      'Can be paused or deleted at any time',
      'Sensitive field labels require manual review'
    ],
    confirmationQuestion: 'Is this the correct automation to create and enable?'
  };
}

export function evaluateAutomations(events, automations) {
  const tokens = events
    .filter((event) => event.type !== 'move')
    .map((event) => normalizeEvent(event));
  const activated = [];

  for (const automation of automations) {
    if (!automation.active || !automation.sequence?.length) continue;
    if (endsWithSequence(tokens, automation.sequence)) {
      activated.push({
        automationId: automation.id,
        name: automation.name,
        action: automation.action,
        firedAt: new Date().toISOString()
      });
    }
  }

  return activated;
}

export function humanizeSequence(sequence) {
  return sequence.map(humanizeToken).join(' -> ');
}

export function humanizeToken(token) {
  const [type, rawLabel = 'workspace'] = token.split(':');
  const label = rawLabel.replace(/-/g, ' ');
  if (type === 'key') return `press ${label}`;
  if (type === 'focus') return `focus ${label}`;
  if (type === 'change') return `change ${label}`;
  if (type === 'move') return `move in ${label}`;
  return `${type} ${label}`;
}

function endsWithSequence(tokens, sequence) {
  if (sequence.length > tokens.length) return false;
  const offset = tokens.length - sequence.length;
  return sequence.every((token, index) => tokens[offset + index] === token);
}

function cleanText(value, fallback) {
  const cleaned = String(value || '').trim();
  return cleaned || fallback;
}

function normalizeList(value, fallback = []) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
  }
  return fallback;
}

function stableId(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return `id-${Math.abs(hash).toString(36)}`;
}
