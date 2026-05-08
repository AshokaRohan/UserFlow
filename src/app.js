import { detectSuggestions, humanizeToken, inferIntent, normalizeEvent, sanitizeKeyEvent } from './core.js';
import {
  approveWorkflowSkill,
  createWorkflowSkillDraft,
  dryRunWorkflowSkill,
  evaluateWorkflowSkills,
  recordDryRun
} from './workflowSkills.js';

const state = {
  observing: false,
  events: [],
  suggestions: [],
  reviewDraft: null,
  automations: load('automations', []),
  skills: load('skills', []),
  currentDryRun: null,
  runs: load('runs', []),
  brain: null,
  platform: null,
  moveSampleAt: 0
};

const nodes = {
  observeToggle: document.querySelector('[data-action="toggle-observing"]'),
  clearData: document.querySelector('[data-action="clear-data"]'),
  runScenario: document.querySelector('[data-action="run-scenario"]'),
  analyzeBrain: document.querySelector('[data-action="analyze-brain"]'),
  eventCount: document.querySelector('[data-stat="event-count"]'),
  automationCount: document.querySelector('[data-stat="automation-count"]'),
  runCount: document.querySelector('[data-stat="run-count"]'),
  intentLabel: document.querySelector('[data-intent-label]'),
  intentMeter: document.querySelector('[data-intent-meter]'),
  eventStream: document.querySelector('[data-event-stream]'),
  suggestions: document.querySelector('[data-suggestions]'),
  automations: document.querySelector('[data-automations]'),
  runs: document.querySelector('[data-runs]'),
  privacyMode: document.querySelector('[data-privacy-mode]'),
  brainSummary: document.querySelector('[data-brain-summary]'),
  brainActions: document.querySelector('[data-brain-actions]'),
  apiStatus: document.querySelector('[data-api-status]'),
  planLabel: document.querySelector('[data-plan-label]'),
  reviewDialog: document.querySelector('[data-review-dialog]'),
  reviewTitle: document.querySelector('[data-review-title]'),
  reviewExplanation: document.querySelector('[data-review-explanation]'),
  reviewCapabilities: document.querySelector('[data-review-capabilities]'),
  reviewCannotDo: document.querySelector('[data-review-cannot-do]'),
  reviewDataUsed: document.querySelector('[data-review-data-used]'),
  reviewSafeguards: document.querySelector('[data-review-safeguards]'),
  reviewRoi: document.querySelector('[data-review-roi]'),
  reviewPolicies: document.querySelector('[data-review-policies]'),
  reviewPermissions: document.querySelector('[data-review-permissions]'),
  reviewName: document.querySelector('[data-review-name]'),
  reviewTrigger: document.querySelector('[data-review-trigger]'),
  reviewAction: document.querySelector('[data-review-action]'),
  reviewSteps: document.querySelector('[data-review-steps]'),
  reviewConsent: document.querySelector('[data-review-consent]'),
  closeReview: document.querySelector('[data-action="close-review"]'),
  approveReview: document.querySelector('[data-action="approve-review"]'),
  dryRunReview: document.querySelector('[data-action="dry-run-review"]')
};

document.addEventListener('pointermove', capturePointerMove, { passive: true });
document.addEventListener('click', captureClick, true);
document.addEventListener('keydown', captureKey, true);
document.addEventListener('focusin', captureFocus, true);
document.addEventListener('change', captureChange, true);
document.addEventListener('submit', (event) => event.preventDefault());

nodes.observeToggle.addEventListener('click', () => {
  state.observing = !state.observing;
  nodes.observeToggle.textContent = state.observing ? 'Pause observing' : 'Start observing';
  nodes.observeToggle.dataset.state = state.observing ? 'active' : 'idle';
  recordSystemEvent(state.observing ? 'Observation started' : 'Observation paused');
  render();
});

nodes.clearData.addEventListener('click', () => {
  state.events = [];
  state.suggestions = [];
  state.automations = [];
  state.skills = [];
  state.runs = [];
  persist();
  render();
});

nodes.runScenario.addEventListener('click', () => {
  state.observing = true;
  nodes.observeToggle.textContent = 'Pause observing';
  nodes.observeToggle.dataset.state = 'active';
  runSyntheticScenario();
});

nodes.analyzeBrain.addEventListener('click', () => analyzeBrain());
nodes.closeReview.addEventListener('click', closeAutomationReview);
nodes.approveReview.addEventListener('click', approveReviewedAutomation);
nodes.dryRunReview.addEventListener('click', previewReviewedSkill);
nodes.reviewConsent.addEventListener('change', () => {
  nodes.approveReview.disabled = !nodes.reviewConsent.checked;
});
nodes.reviewDialog.addEventListener('click', (event) => {
  if (event.target === nodes.reviewDialog) closeAutomationReview();
});

document.querySelector('[data-demo-form]').addEventListener('submit', () => {
  recordEvent({
    type: 'submit',
    targetLabel: 'Send report',
    zone: 'reporting'
  });
});

loadPlatformInfo();
render();

function capturePointerMove(event) {
  if (!state.observing) return;
  const now = performance.now();
  if (now - state.moveSampleAt < 700) return;
  state.moveSampleAt = now;
  recordEvent({
    type: 'move',
    targetLabel: getTargetLabel(event.target),
    zone: getZone(event.target),
    x: Math.round(event.clientX),
    y: Math.round(event.clientY)
  });
}

function captureClick(event) {
  if (!state.observing) return;
  const target = event.target.closest('button, a, input, select, textarea, [data-track-label]') || event.target;
  recordEvent({
    type: 'click',
    targetLabel: getTargetLabel(target),
    zone: getZone(target)
  });
}

function captureKey(event) {
  if (!state.observing) return;
  const safeKey = sanitizeKeyEvent(event);
  recordEvent({
    type: 'key',
    targetLabel: getTargetLabel(event.target),
    zone: getZone(event.target),
    keyKind: safeKey.kind,
    keyLabel: safeKey.label
  });
}

function captureFocus(event) {
  if (!state.observing) return;
  recordEvent({
    type: 'focus',
    targetLabel: getTargetLabel(event.target),
    zone: getZone(event.target)
  });
}

function captureChange(event) {
  if (!state.observing) return;
  recordEvent({
    type: 'change',
    targetLabel: getTargetLabel(event.target),
    zone: getZone(event.target)
  });
}

function recordEvent(event) {
  const enriched = {
    ...event,
    id: crypto.randomUUID(),
    at: new Date().toISOString()
  };
  state.events.push(enriched);
  state.events = state.events.slice(-220);
  state.suggestions = detectSuggestions(state.events, [...state.automations, ...state.skills]);
  const activations = evaluateWorkflowSkills(state.events, state.skills);

  if (activations.length) {
    for (const activation of activations) {
      state.runs.unshift(activation);
      const skill = state.skills.find((item) => item.id === activation.skillId);
      if (skill) {
        skill.runStats.liveRuns += 1;
        skill.runStats.lastRunAt = activation.firedAt;
      }
    }
    state.runs = state.runs.slice(0, 20);
  }

  persist();
  syncEventToApi(enriched);
  render();
}

function recordSystemEvent(label) {
  state.events.push({
    id: crypto.randomUUID(),
    type: 'system',
    targetLabel: label,
    zone: 'system',
    at: new Date().toISOString()
  });
  state.events = state.events.slice(-220);
}

function runSyntheticScenario() {
  const sequence = [
    ['click', 'Open inbox', 'triage'],
    ['click', 'Priority filter', 'triage'],
    ['change', 'Priority filter', 'triage'],
    ['click', 'Assign teammate', 'triage'],
    ['change', 'Assign teammate', 'triage'],
    ['click', 'Mark ready', 'triage']
  ];

  const events = [...sequence, ...sequence, ...sequence.slice(0, 3)];
  events.forEach(([type, targetLabel, zone], index) => {
    setTimeout(() => recordEvent({ type, targetLabel, zone }), index * 90);
  });
}

function createAutomation(suggestionId) {
  const suggestion = state.suggestions.find((item) => item.id === suggestionId);
  if (!suggestion) return;
  state.reviewDraft = createWorkflowSkillDraft(suggestion, state.events);
  state.currentDryRun = null;
  renderAutomationReview();
  nodes.reviewDialog.showModal();
}

function closeAutomationReview() {
  state.reviewDraft = null;
  state.currentDryRun = null;
  nodes.reviewConsent.checked = false;
  nodes.approveReview.disabled = true;
  nodes.reviewDialog.close();
  render();
}

function approveReviewedAutomation() {
  if (!state.reviewDraft || !nodes.reviewConsent.checked) return;
  const original = state.reviewDraft;
  const corrections = {
    name: nodes.reviewName.value,
    goal: nodes.reviewAction.value,
    triggerLabel: nodes.reviewTrigger.value,
    steps: nodes.reviewSteps.value,
    corrected:
      nodes.reviewName.value !== original.name ||
      nodes.reviewTrigger.value !== original.trigger.label ||
      nodes.reviewAction.value !== original.goal ||
      nodes.reviewSteps.value !== original.steps.map((step) => step.title).join('\n')
  };
  state.skills.unshift(approveWorkflowSkill(original, corrections));
  state.reviewDraft = null;
  state.currentDryRun = null;
  nodes.reviewConsent.checked = false;
  nodes.approveReview.disabled = true;
  nodes.reviewDialog.close();
  state.suggestions = detectSuggestions(state.events, [...state.automations, ...state.skills]);
  persist();
  render();
}

function previewReviewedSkill() {
  if (!state.reviewDraft) return;
  const corrected = {
    ...state.reviewDraft,
    name: nodes.reviewName.value || state.reviewDraft.name,
    goal: nodes.reviewAction.value || state.reviewDraft.goal,
    trigger: {
      ...state.reviewDraft.trigger,
      label: nodes.reviewTrigger.value || state.reviewDraft.trigger.label
    },
    steps: nodes.reviewSteps.value
      .split('\n')
      .map((title, index) => ({
        ...(state.reviewDraft.steps[index] || {}),
        id: state.reviewDraft.steps[index]?.id || `step-${index + 1}`,
        order: index + 1,
        title: title.replace(/^\d+\.\s*/, '').trim()
      }))
      .filter((step) => step.title)
  };
  state.currentDryRun = dryRunWorkflowSkill(corrected, state.events);
  renderAutomationReview();
}

async function loadPlatformInfo() {
  try {
    const response = await fetch('/api/v1/health', {
      headers: { 'x-api-key': 'local-pro-key' }
    });
    if (!response.ok) return;
    state.platform = await response.json();
    render();
  } catch {
    state.platform = null;
  }
}

async function analyzeBrain() {
  nodes.brainSummary.textContent = 'Analyzing workflow...';
  try {
    const response = await fetch('/api/v1/brain/analyze', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'local-pro-key'
      },
      body: JSON.stringify({
        events: state.events,
        automations: state.automations
      })
    });
    state.brain = await response.json();
  } catch {
    state.brain = {
      summary: 'The local API server is not available, so the browser is using in-page heuristics only.',
      nextBestActions: ['Start the Node server with npm start']
    };
  }
  render();
}

function syncEventToApi(event) {
  fetch('/api/v1/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': 'local-pro-key'
    },
    body: JSON.stringify({ event })
  }).catch(() => {});
}

function deleteAutomation(id) {
  state.automations = state.automations.filter((automation) => automation.id !== id);
  state.skills = state.skills.filter((skill) => skill.id !== id);
  persist();
  render();
}

function toggleAutomation(id) {
  const automation = state.automations.find((item) => item.id === id);
  if (automation) automation.active = !automation.active;
  const skill = state.skills.find((item) => item.id === id);
  if (skill) {
    skill.active = !skill.active;
    skill.status = skill.active ? 'active' : 'paused';
  }
  persist();
  render();
}

function render() {
  const intent = inferIntent(state.events);
  nodes.eventCount.textContent = String(state.events.length);
  nodes.automationCount.textContent = String(state.skills.length);
  nodes.runCount.textContent = String(state.runs.length);
  nodes.intentLabel.textContent = intent.label;
  nodes.intentMeter.style.width = `${Math.round(intent.confidence * 100)}%`;
  nodes.privacyMode.textContent = state.observing ? 'Observing this page' : 'Paused';
  renderPlatform();

  renderEvents();
  renderSuggestions();
  renderAutomations();
  renderRuns();
}

function renderPlatform() {
  if (state.platform) {
    nodes.apiStatus.textContent = `${state.platform.service} ${state.platform.version}`;
    nodes.planLabel.textContent = state.platform.subscription.plan.name;
  } else {
    nodes.apiStatus.textContent = 'Static mode';
    nodes.planLabel.textContent = 'browser-only';
  }

  if (state.brain) {
    nodes.brainSummary.textContent = state.brain.summary;
    nodes.brainActions.textContent = (state.brain.nextBestActions || []).slice(0, 2).join(' | ');
  } else {
    nodes.brainSummary.textContent = state.suggestions.length
      ? 'Automation candidate ready for brain review'
      : 'Local heuristic brain ready';
    nodes.brainActions.textContent = state.suggestions.length
      ? 'Analyze now to convert patterns into agent-ready recommendations.'
      : 'Run the demo scenario to generate an AI workflow summary.';
  }
}

function renderEvents() {
  nodes.eventStream.replaceChildren(
    ...state.events.slice(-18).reverse().map((event) => {
      const item = document.createElement('li');
      item.className = 'event-row';
      const token = event.type === 'system' ? event.targetLabel : humanizeToken(normalizeEvent(event));
      item.innerHTML = `
        <span>${escapeHtml(token)}</span>
        <time>${new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
      `;
      return item;
    })
  );
}

function renderSuggestions() {
  if (!state.suggestions.length) {
    nodes.suggestions.innerHTML = '<p class="empty">Interact with the workspace or run the demo scenario to surface automation ideas.</p>';
    return;
  }

  nodes.suggestions.replaceChildren(
    ...state.suggestions.map((suggestion) => {
      const card = document.createElement('article');
      card.className = 'suggestion';
      card.innerHTML = `
        <div>
          <h3>${escapeHtml(suggestion.title)}</h3>
          <p>${escapeHtml(suggestion.summary)}</p>
          <p class="trigger">${escapeHtml(suggestion.trigger)}</p>
        </div>
        <div class="suggestion-footer">
          <span>${Math.round(suggestion.confidence * 100)}% confidence</span>
          <button type="button" data-create="${suggestion.id}">Review Skill</button>
        </div>
      `;
      card.querySelector('button').addEventListener('click', () => createAutomation(suggestion.id));
      return card;
    })
  );
}

function renderAutomationReview() {
  const draft = state.reviewDraft;
  if (!draft) return;

  nodes.reviewTitle.textContent = draft.name;
  nodes.reviewExplanation.textContent = draft.description;
  nodes.reviewName.value = draft.name;
  nodes.reviewTrigger.value = draft.trigger.label;
  nodes.reviewAction.value = draft.goal;
  nodes.reviewSteps.value = draft.steps.map((step) => step.title).join('\n');
  renderList(nodes.reviewCapabilities, [
    'Detect a repeated work pattern',
    'Prepare a reusable Workflow Skill',
    'Dry-run the steps before live use',
    'Expose the skill to agents through API/MCP'
  ]);
  renderList(nodes.reviewCannotDo, [
    'Read raw typed text',
    'Bypass policy checks',
    'Run destructive actions without admin approval',
    'Use connectors outside the requested scopes'
  ]);
  renderList(nodes.reviewDataUsed, draft.dataUsed);
  renderList(nodes.reviewSafeguards, [
    'Starts as a disabled draft',
    'Requires your approval',
    'Runs supervised dry-runs first',
    'Keeps an audit trail'
  ]);
  renderList(nodes.reviewPermissions, draft.permissions.map((permission) => `${permission.scope} (${permission.level})`));
  renderList(nodes.reviewPolicies, draft.policies.map((policy) => `${policy.severity.toUpperCase()}: ${policy.title}`));
  renderList(nodes.reviewRoi, [
    draft.roi.valueLabel,
    `${draft.roi.estimatedMonthlyMinutesSaved} estimated minutes saved/month`,
    `${draft.roi.repetitionsObserved} repetitions observed`
  ]);

  if (state.currentDryRun) {
    renderList(nodes.reviewSafeguards, [
      `Dry-run status: ${state.currentDryRun.status}`,
      `Trigger matched: ${state.currentDryRun.triggerMatched ? 'yes' : 'no'}`,
      state.currentDryRun.nextPrompt
    ]);
  }
}

function renderAutomations() {
  const skills = state.skills;
  if (!skills.length) {
    nodes.automations.innerHTML = '<p class="empty">Approved Workflow Skills will appear here with permissions, ROI, and dry-run controls.</p>';
    return;
  }

  nodes.automations.replaceChildren(
    ...skills.map((automation) => {
      const card = document.createElement('article');
      card.className = 'automation';
      card.innerHTML = `
        <div>
          <h3>${escapeHtml(automation.name)} <span class="status-pill">${escapeHtml(automation.status)}</span></h3>
          <p>${escapeHtml(automation.trigger.label)}</p>
          <p class="trigger">${escapeHtml(automation.goal)}</p>
          <ol class="automation-preview">${automation.steps.map((step) => `<li>${escapeHtml(step.title)}</li>`).join('')}</ol>
          <small>${automation.roi.valueLabel} - ${automation.roi.estimatedMonthlyMinutesSaved} min/month saved - ${automation.runStats.liveRuns} live runs</small>
        </div>
        <div class="automation-actions">
          <button type="button" data-dry-run="${automation.id}" class="secondary">Dry-run</button>
          <button type="button" data-toggle="${automation.id}">${automation.active ? 'Pause' : 'Enable'}</button>
          <button type="button" data-delete="${automation.id}" class="secondary">Delete</button>
        </div>
      `;
      card.querySelector('[data-dry-run]').addEventListener('click', () => runSkillDryRun(automation.id));
      card.querySelector('[data-toggle]').addEventListener('click', () => toggleAutomation(automation.id));
      card.querySelector('[data-delete]').addEventListener('click', () => deleteAutomation(automation.id));
      return card;
    })
  );
}

function runSkillDryRun(id) {
  const skill = state.skills.find((item) => item.id === id);
  if (!skill) return;
  const dryRun = dryRunWorkflowSkill(skill, state.events);
  const updated = recordDryRun(skill, dryRun, dryRun.triggerMatched);
  state.skills = [updated, ...state.skills.filter((item) => item.id !== id)];
  state.runs.unshift({
    skillId: id,
    name: skill.name,
    action: dryRun.status,
    firedAt: new Date().toISOString()
  });
  persist();
  render();
}

function renderList(node, items) {
  node.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    })
  );
}

function renderRuns() {
  if (!state.runs.length) {
    nodes.runs.innerHTML = '<p class="empty">Automation runs will be logged here.</p>';
    return;
  }

  nodes.runs.replaceChildren(
    ...state.runs.slice(0, 8).map((run) => {
      const item = document.createElement('li');
      item.className = 'run-row';
      item.innerHTML = `
        <span>${escapeHtml(run.name)} activated</span>
        <time>${new Date(run.firedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
      `;
      return item;
    })
  );
}

function getTargetLabel(target) {
  if (!target) return 'workspace';
  const explicit = target.closest?.('[data-track-label]')?.dataset.trackLabel;
  if (explicit) return explicit;
  if (target.getAttribute?.('aria-label')) return target.getAttribute('aria-label');
  if (target.labels?.[0]?.textContent) return target.labels[0].textContent.trim();
  if (target.placeholder) return target.placeholder;
  if (target.name) return target.name;
  if (target.textContent?.trim()) return target.textContent.trim().slice(0, 50);
  return target.tagName?.toLowerCase() || 'workspace';
}

function getZone(target) {
  return target?.closest?.('[data-zone]')?.dataset.zone || 'workspace';
}

function persist() {
  localStorage.setItem('automations', JSON.stringify(state.automations));
  localStorage.setItem('skills', JSON.stringify(state.skills));
  localStorage.setItem('runs', JSON.stringify(state.runs));
}

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
