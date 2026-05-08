import { humanizeToken, normalizeEvent } from './core.js';

const SENSITIVE_PATTERNS = /\b(password|secret|api[_-]?key|otp|cvv|ssn|pan|aadhaar|salary|bank[_-]?account)\b/i;
const DESTRUCTIVE_PATTERNS = /\b(delete|remove|archive|close|cancel|refund|terminate|wipe|purge)\b/i;
const SEND_PATTERNS = /\b(send|submit|publish|post|email|message|reply)\b/i;
const ADMIN_PATTERNS = /\b(admin|permission|role|billing|settings)\b/i;

export function createWorkflowSkillDraft(suggestion, events = [], options = {}) {
  const sequence = suggestion.sequence || [];
  const steps = sequence.map((token, index) => ({
    id: `step-${index + 1}`,
    order: index + 1,
    title: humanizeToken(token),
    sourceToken: token,
    executionMode: 'assistive',
    requiresConfirmation: index === sequence.length - 1 || SEND_PATTERNS.test(token)
  }));

  const skill = {
    id: stableId(`skill-${suggestion.fingerprint}-${Date.now()}`),
    kind: 'workflow_skill',
    schemaVersion: '2026-05-08',
    name: options.name || suggestion.title.replace(' detected', ' Skill'),
    goal: options.goal || suggestion.summary,
    description: options.description || 'A reviewable skill generated from repeated consented work patterns.',
    status: 'draft',
    active: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    approvedAt: null,
    trigger: {
      type: suggestion.type === 'frequency' ? 'frequency' : 'sequence',
      label: suggestion.trigger,
      sequence,
      confidence: suggestion.confidence,
      fingerprint: suggestion.fingerprint
    },
    fingerprint: suggestion.fingerprint,
    permissions: inferPermissions(sequence),
    dataUsed: inferDataUsed(sequence),
    steps,
    replay: buildReplay(sequence, events),
    roi: scoreRoi(events, suggestion),
    policies: [],
    approval: {
      required: true,
      state: 'needs_review',
      question: 'Is this correct, and should this skill be enabled?',
      reviewedBy: null,
      notes: ''
    },
    runMode: 'dry-run-first',
    runStats: {
      dryRuns: 0,
      successfulDryRuns: 0,
      liveRuns: 0,
      lastRunAt: null
    },
    audit: [
      {
        action: 'skill.drafted',
        at: new Date().toISOString(),
        note: 'Draft created from detected workflow pattern.'
      }
    ]
  };

  return {
    ...skill,
    policies: evaluateSkillPolicies(skill)
  };
}

export function approveWorkflowSkill(skill, corrections = {}) {
  const updated = applySkillCorrections(skill, corrections);
  const policies = evaluateSkillPolicies(updated);
  const blocking = policies.filter((policy) => policy.severity === 'block');

  return {
    ...updated,
    status: blocking.length ? 'needs_admin_review' : 'active',
    active: blocking.length === 0,
    approvedAt: blocking.length ? null : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    policies,
    approval: {
      ...updated.approval,
      required: blocking.length > 0,
      state: blocking.length ? 'blocked_by_policy' : 'approved',
      reviewedBy: corrections.reviewedBy || 'local-user',
      notes: corrections.notes || updated.approval?.notes || ''
    },
    audit: [
      ...(updated.audit || []),
      {
        action: blocking.length ? 'skill.policy_blocked' : 'skill.approved',
        at: new Date().toISOString(),
        note: blocking.length
          ? 'Approval paused because a blocking policy matched.'
          : 'Human approved the reviewed skill.'
      }
    ]
  };
}

export function applySkillCorrections(skill, corrections = {}) {
  const steps = normalizeSteps(corrections.steps, skill.steps);
  const corrected = {
    ...skill,
    name: cleanText(corrections.name, skill.name),
    goal: cleanText(corrections.goal, skill.goal),
    description: cleanText(corrections.description, skill.description),
    trigger: {
      ...skill.trigger,
      label: cleanText(corrections.triggerLabel, skill.trigger?.label)
    },
    permissions: normalizePermissions(corrections.permissions, skill.permissions),
    steps,
    dataUsed: normalizeList(corrections.dataUsed, skill.dataUsed),
    updatedAt: new Date().toISOString()
  };

  return {
    ...corrected,
    policies: evaluateSkillPolicies(corrected),
    replay: {
      ...corrected.replay,
      proposedSteps: steps.map((step) => step.title)
    }
  };
}

export function evaluateWorkflowSkills(events, skills) {
  const tokens = events.filter((event) => event.type !== 'move').map((event) => normalizeEvent(event));
  return skills
    .filter((skill) => skill.active && skill.status === 'active')
    .filter((skill) => endsWithSequence(tokens, skill.trigger?.sequence || []))
    .map((skill) => ({
      skillId: skill.id,
      name: skill.name,
      action: 'dry-run-ready',
      firedAt: new Date().toISOString(),
      dryRun: dryRunWorkflowSkill(skill, events)
    }));
}

export function dryRunWorkflowSkill(skill, events = []) {
  const tokens = events.filter((event) => event.type !== 'move').map((event) => normalizeEvent(event));
  const triggerMatched = endsWithSequence(tokens, skill.trigger?.sequence || []);
  const policies = evaluateSkillPolicies(skill);
  const blocking = policies.filter((policy) => policy.severity === 'block');

  return {
    skillId: skill.id,
    name: skill.name,
    status: triggerMatched && !blocking.length ? 'ready_for_approval' : 'not_ready',
    triggerMatched,
    canAutoRun: triggerMatched && !blocking.length && skill.runStats.successfulDryRuns >= 3,
    requiresHumanApproval: true,
    policySummary: summarizePolicies(policies),
    steps: skill.steps.map((step) => ({
      ...step,
      status: 'planned',
      preview: `Would ${step.title.toLowerCase()}`
    })),
    nextPrompt: triggerMatched
      ? 'This skill is ready for a supervised dry run.'
      : 'The trigger pattern has not appeared yet.'
  };
}

export function recordDryRun(skill, dryRun, accepted = false) {
  const successfulDryRuns = skill.runStats.successfulDryRuns + (accepted ? 1 : 0);
  return {
    ...skill,
    runStats: {
      ...skill.runStats,
      dryRuns: skill.runStats.dryRuns + 1,
      successfulDryRuns,
      lastRunAt: new Date().toISOString()
    },
    audit: [
      ...(skill.audit || []),
      {
        action: accepted ? 'skill.dry_run_accepted' : 'skill.dry_run_viewed',
        at: new Date().toISOString(),
        note: dryRun.nextPrompt
      }
    ]
  };
}

export function evaluateSkillPolicies(skill) {
  const text = [
    skill.name,
    skill.goal,
    skill.description,
    skill.trigger?.label,
    ...(skill.steps || []).map((step) => step.title),
    ...(skill.dataUsed || [])
  ].join(' ');
  const policies = [];

  if (SENSITIVE_PATTERNS.test(text)) {
    policies.push({
      id: 'sensitive-data',
      severity: 'block',
      title: 'Sensitive data review required',
      detail: 'This skill appears to touch sensitive fields or secrets.'
    });
  }
  if (DESTRUCTIVE_PATTERNS.test(text)) {
    policies.push({
      id: 'destructive-action',
      severity: 'block',
      title: 'Destructive action blocked',
      detail: 'Deleting, refunding, canceling, or closing records requires admin review.'
    });
  }
  if (SEND_PATTERNS.test(text)) {
    policies.push({
      id: 'external-send',
      severity: 'warn',
      title: 'Outbound action needs confirmation',
      detail: 'Sending, submitting, or publishing should require a final human confirmation.'
    });
  }
  if (ADMIN_PATTERNS.test(text)) {
    policies.push({
      id: 'admin-scope',
      severity: 'warn',
      title: 'Admin scope detected',
      detail: 'Admin settings and permission changes should be limited by role.'
    });
  }

  if (!policies.length) {
    policies.push({
      id: 'standard-human-review',
      severity: 'info',
      title: 'Human approval required',
      detail: 'The skill can be approved after reviewing its trigger, steps, and data usage.'
    });
  }

  return policies;
}

export function scoreRoi(events, suggestion) {
  const repetitions = Math.max(1, Math.round((suggestion.confidence || 0.5) * 5));
  const secondsPerRun = Math.max(20, (suggestion.sequence?.length || 2) * 18);
  const monthlyRuns = repetitions * 12;
  const monthlyMinutesSaved = Math.round((monthlyRuns * secondsPerRun) / 60);

  return {
    repetitionsObserved: repetitions,
    estimatedSecondsPerRun: secondsPerRun,
    estimatedMonthlyRuns: monthlyRuns,
    estimatedMonthlyMinutesSaved: monthlyMinutesSaved,
    confidence: suggestion.confidence || 0.5,
    valueLabel:
      monthlyMinutesSaved >= 120 ? 'High ROI' : monthlyMinutesSaved >= 45 ? 'Medium ROI' : 'Emerging ROI'
  };
}

export function getSkillTemplates() {
  return [
    {
      id: 'template-inbox-triage',
      name: 'Inbox Triage Skill',
      category: 'Customer operations',
      trigger: 'When priority filter and assignment steps repeat',
      outcome: 'Prepare an assignment checklist and mark the case ready after approval'
    },
    {
      id: 'template-report-export',
      name: 'Report Export Skill',
      category: 'Reporting',
      trigger: 'When filter and export actions repeat',
      outcome: 'Prepare report export steps and log the run'
    },
    {
      id: 'template-crm-update',
      name: 'CRM Update Skill',
      category: 'Sales',
      trigger: 'When lead status and owner changes repeat',
      outcome: 'Draft CRM updates with scoped connector permissions'
    }
  ];
}

function inferPermissions(sequence) {
  const labels = sequence.join(' ');
  const permissions = [
    {
      scope: 'observe.workflow_metadata',
      level: 'read',
      reason: 'Detect repeated steps without raw typed text.'
    },
    {
      scope: 'skill.dry_run',
      level: 'execute',
      reason: 'Preview planned steps before live execution.'
    }
  ];

  if (/report|export|metric/.test(labels)) {
    permissions.push({
      scope: 'reports.prepare_export',
      level: 'draft',
      reason: 'Prepare report export actions after approval.'
    });
  }
  if (/assign|status|case|lead|priority/.test(labels)) {
    permissions.push({
      scope: 'crm.update_status',
      level: 'draft',
      reason: 'Draft workflow updates for review.'
    });
  }
  if (SEND_PATTERNS.test(labels)) {
    permissions.push({
      scope: 'outbound.send',
      level: 'confirm_each_time',
      reason: 'Outbound actions need explicit confirmation.'
    });
  }

  return permissions;
}

function inferDataUsed(sequence) {
  const data = new Set(['Sanitized event sequence', 'Target labels', 'Interaction timing']);
  for (const token of sequence) {
    if (/assign|status|case|lead|priority/.test(token)) data.add('Workflow field labels');
    if (/report|export|metric/.test(token)) data.add('Report control labels');
    if (/key:/.test(token)) data.add('Safe keyboard metadata');
  }
  return [...data];
}

function buildReplay(sequence, events) {
  return {
    observedCount: events.length,
    triggerPath: sequence.map(humanizeToken),
    proposedSteps: sequence.map(humanizeToken),
    note: 'Replay is generated from sanitized event metadata, not screen recordings or typed content.'
  };
}

function normalizeSteps(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((step, index) => ({
      id: step.id || `step-${index + 1}`,
      order: index + 1,
      title: cleanText(step.title || step, `Step ${index + 1}`),
      sourceToken: step.sourceToken || fallback[index]?.sourceToken || '',
      executionMode: step.executionMode || fallback[index]?.executionMode || 'assistive',
      requiresConfirmation: Boolean(step.requiresConfirmation ?? fallback[index]?.requiresConfirmation)
    }));
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)
      .map((title, index) => ({
        id: fallback[index]?.id || `step-${index + 1}`,
        order: index + 1,
        title,
        sourceToken: fallback[index]?.sourceToken || '',
        executionMode: fallback[index]?.executionMode || 'assistive',
        requiresConfirmation: fallback[index]?.requiresConfirmation ?? index === 0
      }));
  }

  return fallback;
}

function normalizePermissions(value, fallback = []) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((scope) => ({
      scope,
      level: 'draft',
      reason: 'Added during human review.'
    }));
}

function normalizeList(value, fallback = []) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value)
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

function summarizePolicies(policies) {
  return {
    highestSeverity: policies.some((policy) => policy.severity === 'block')
      ? 'block'
      : policies.some((policy) => policy.severity === 'warn')
        ? 'warn'
        : 'info',
    policies
  };
}

function endsWithSequence(tokens, sequence) {
  if (!sequence.length || sequence.length > tokens.length) return false;
  const offset = tokens.length - sequence.length;
  return sequence.every((token, index) => tokens[offset + index] === token);
}

function cleanText(value, fallback = '') {
  const cleaned = String(value || '').trim();
  return cleaned || fallback;
}

function stableId(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return `id-${Math.abs(hash).toString(36)}`;
}
