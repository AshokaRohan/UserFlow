import assert from 'node:assert/strict';
import test from 'node:test';
import { detectSuggestions } from '../src/core.js';
import { getScenarioEvents } from '../src/scenarios.js';
import {
  approveWorkflowSkill,
  createWorkflowSkillDraft,
  dryRunWorkflowSkill,
  evaluateWorkflowSkills,
  recordDryRun
} from '../src/workflowSkills.js';

test('Workflow Skill draft includes permissions, policies, replay, and ROI', () => {
  const events = getScenarioEvents('inbox-triage');
  const suggestion = detectSuggestions(events)[0];
  const skill = createWorkflowSkillDraft(suggestion, events);

  assert.equal(skill.kind, 'workflow_skill');
  assert.equal(skill.status, 'draft');
  assert.equal(skill.active, false);
  assert.ok(skill.permissions.length >= 2);
  assert.ok(skill.policies.length >= 1);
  assert.ok(skill.replay.triggerPath.length > 0);
  assert.ok(skill.roi.estimatedMonthlyMinutesSaved > 0);
});

test('Workflow Skill approval enables non-blocked skills', () => {
  const events = getScenarioEvents('inbox-triage');
  const suggestion = detectSuggestions(events)[0];
  const draft = createWorkflowSkillDraft(suggestion, events);
  const approved = approveWorkflowSkill(draft, {
    name: 'Customer triage skill',
    reviewedBy: 'tester'
  });

  assert.equal(approved.name, 'Customer triage skill');
  assert.equal(approved.status, 'active');
  assert.equal(approved.active, true);
});

test('Workflow Skill policy blocks sensitive destructive skills', () => {
  const events = getScenarioEvents('sensitive-blocked');
  const suggestion = detectSuggestions(events)[0];
  const draft = createWorkflowSkillDraft(suggestion, events);
  const approved = approveWorkflowSkill(draft, { reviewedBy: 'tester' });

  assert.equal(approved.status, 'needs_admin_review');
  assert.equal(approved.active, false);
  assert.ok(approved.policies.some((policy) => policy.severity === 'block'));
});

test('Workflow Skill dry-run and evaluation follow active trigger matching', () => {
  const events = getScenarioEvents('report-export');
  const suggestion = detectSuggestions(events)[0];
  const approved = approveWorkflowSkill(createWorkflowSkillDraft(suggestion, events));
  const dryRun = dryRunWorkflowSkill(approved, events);
  const updated = recordDryRun(approved, dryRun, true);
  const activations = evaluateWorkflowSkills(events, [updated]);

  assert.equal(dryRun.triggerMatched, true);
  assert.equal(updated.runStats.successfulDryRuns, 1);
  assert.equal(activations.length, 1);
  assert.equal(activations[0].skillId, updated.id);
});
