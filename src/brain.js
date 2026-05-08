import { detectSuggestions, inferIntent, normalizeEvent } from './core.js';
import { createWorkflowSkillDraft } from './workflowSkills.js';

export async function analyzeWithBrain({
  events = [],
  automations = [],
  provider = process.env.USERFLOW_AI_PROVIDER || 'local',
  apiKey = process.env.USERFLOW_AI_API_KEY || ''
} = {}) {
  const intent = inferIntent(events);
  const suggestions = detectSuggestions(events, automations);
  const context = buildContext(events, intent, suggestions);

  if (provider !== 'local' && apiKey) {
    return callExternalBrain({ provider, apiKey, context, intent, suggestions });
  }

  return {
    provider: 'local',
    model: 'heuristic-workflow-skill-brain-v2',
    intent,
    suggestions: enrichSuggestions(suggestions, intent),
    skillDrafts: suggestions.map((suggestion) => createWorkflowSkillDraft(suggestion, events)),
    summary: createLocalSummary(context, intent, suggestions),
    nextBestActions: createNextBestActions(intent, suggestions),
    riskFlags: createRiskFlags(events),
    confidence: intent.confidence
  };
}

export function buildContext(events, intent, suggestions) {
  return {
    eventCount: events.length,
    recentTokens: events
      .filter((event) => event.type !== 'move')
      .slice(-20)
      .map((event) => normalizeEvent(event)),
    intent,
    suggestionCount: suggestions.length
  };
}

function enrichSuggestions(suggestions, intent) {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    aiReason: `This looks like ${intent.label.toLowerCase()} because the same targets and actions are clustering together.`,
    rollout: [
      'Ask for user confirmation',
      'Create a disabled Workflow Skill draft',
      'Review policies, permissions, ROI, and replay',
      'Require supervised dry-runs before auto-run'
    ]
  }));
}

function createLocalSummary(context, intent, suggestions) {
  if (!context.eventCount) {
    return 'No activity has been observed yet. Start observing or send events through the API.';
  }

  if (!suggestions.length) {
    return `The current session looks like ${intent.label.toLowerCase()}, but no repeated automation candidate is strong enough yet.`;
  }

  return `The brain found ${suggestions.length} Workflow Skill candidate${suggestions.length === 1 ? '' : 's'} in a ${intent.label.toLowerCase()} pattern.`;
}

function createNextBestActions(intent, suggestions) {
  if (!suggestions.length) {
    return [
      'Collect another repetition before suggesting automation',
      `Keep classifying this as ${intent.label.toLowerCase()}`,
      'Avoid capturing raw user-entered text'
    ];
  }

  return [
    'Show the highest-confidence suggestion to the user',
    'Create a Workflow Skill draft first',
    'Review permissions, policies, and ROI before enabling it',
    'Run supervised dry-runs before allowing auto-run'
  ];
}

function createRiskFlags(events) {
  const flags = [];
  if (events.some((event) => event.keyKind === 'redacted-character')) {
    flags.push('Text input was redacted before analysis.');
  }
  if (events.some((event) => /password|secret|token/i.test(event.targetLabel || ''))) {
    flags.push('Sensitive field label detected. Automation should require admin review.');
  }
  return flags;
}

async function callExternalBrain({ provider, apiKey, context, intent, suggestions }) {
  return {
    provider,
    model: `${provider}-configured-api`,
    intent,
    suggestions: enrichSuggestions(suggestions, intent),
    skillDrafts: suggestions.map((suggestion) => createWorkflowSkillDraft(suggestion, [])),
    summary: `External AI provider "${provider}" is configured. This prototype prepared a privacy-filtered context with ${context.eventCount} events.`,
    nextBestActions: createNextBestActions(intent, suggestions),
    riskFlags: [],
    confidence: intent.confidence,
    apiReady: Boolean(apiKey)
  };
}
