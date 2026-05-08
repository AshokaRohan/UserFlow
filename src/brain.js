import { detectSuggestions, inferIntent, normalizeEvent } from './core.js';
import { createWorkflowSkillDraft } from './workflowSkills.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = process.env.USERFLOW_AI_MODEL || 'claude-sonnet-4-6';

export async function analyzeWithBrain({
  events = [],
  automations = [],
  provider = process.env.USERFLOW_AI_PROVIDER || 'local',
  apiKey = process.env.ANTHROPIC_API_KEY || process.env.USERFLOW_AI_API_KEY || ''
} = {}) {
  const intent = inferIntent(events);
  const suggestions = detectSuggestions(events, automations);
  const context = buildContext(events, intent, suggestions);

  if (apiKey) {
    try {
      const claudeResult = await callClaudeAPI({ apiKey, context, intent, suggestions });
      return {
        provider: 'claude',
        model: DEFAULT_MODEL,
        intent,
        suggestions: enrichSuggestions(suggestions, intent),
        skillDrafts: suggestions.map((s) => createWorkflowSkillDraft(s, events)),
        summary: claudeResult.summary,
        nextBestActions: claudeResult.nextBestActions || [],
        riskFlags: claudeResult.riskFlags || [],
        confidence: claudeResult.confidence ?? intent.confidence
      };
    } catch (error) {
      console.error('[brain] Claude API error, falling back to local:', error.message);
    }
  }

  return {
    provider: 'local',
    model: 'heuristic-workflow-skill-brain-v2',
    intent,
    suggestions: enrichSuggestions(suggestions, intent),
    skillDrafts: suggestions.map((s) => createWorkflowSkillDraft(s, events)),
    summary: createLocalSummary(context, intent, suggestions),
    nextBestActions: createNextBestActions(intent, suggestions),
    riskFlags: createRiskFlags(events),
    confidence: intent.confidence
  };
}

async function callClaudeAPI({ apiKey, context, intent, suggestions }) {
  const suggestionText = suggestions.length
    ? suggestions
        .map((s, i) => `${i + 1}. "${s.title}" — ${s.summary} (${Math.round(s.confidence * 100)}% confidence)`)
        .join('\n')
    : 'None detected yet.';

  const tokenSample = context.recentTokens.slice(0, 14).join(', ') || 'none';

  const userMessage = `You are the AI brain for UserFlow, a consent-first workflow automation copilot. Analyze these privacy-safe workflow patterns.

IMPORTANT: All data below is interaction metadata only — no raw text, no content was captured.

Session summary:
- Events observed: ${context.eventCount}
- Detected intent: ${intent.label} (${Math.round(intent.confidence * 100)}% confidence)
- Automation candidates found: ${suggestions.length}

Detected patterns:
${suggestionText}

Recent action tokens (sanitized metadata, no user content):
${tokenSample}

Respond with a JSON object — nothing else, no markdown — using exactly these keys:
{
  "summary": "1-2 sentence explanation of what workflow pattern you see and why it's worth automating",
  "nextBestActions": ["specific action 1", "specific action 2", "specific action 3"],
  "riskFlags": ["risk or note if any, omit array items if none"],
  "confidence": 0.0
}`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const err = new Error(`Claude API ${response.status}: ${body.slice(0, 200)}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // fall through to text extraction
    }
  }

  return {
    summary: text.slice(0, 300).trim(),
    nextBestActions: ['Review the detected automation candidate', 'Approve and run a supervised dry-run'],
    riskFlags: [],
    confidence: 0.7
  };
}

export function buildContext(events, intent, suggestions) {
  return {
    eventCount: events.length,
    recentTokens: events
      .filter((e) => e.type !== 'move')
      .slice(-20)
      .map((e) => normalizeEvent(e)),
    intent,
    suggestionCount: suggestions.length
  };
}

function enrichSuggestions(suggestions, intent) {
  return suggestions.map((s) => ({
    ...s,
    aiReason: `This looks like ${intent.label.toLowerCase()} — the same targets and actions are clustering in a repeated sequence.`,
    rollout: [
      'Show suggestion to the user',
      'Create a disabled Workflow Skill draft',
      'Review policies, permissions, ROI, and replay',
      'Require supervised dry-runs before any live run'
    ]
  }));
}

function createLocalSummary(context, intent, suggestions) {
  if (!context.eventCount) {
    return 'No activity observed yet. Start observing or inject events through the API.';
  }
  if (!suggestions.length) {
    return `Session looks like ${intent.label.toLowerCase()}, but no repeated automation candidate is strong enough yet. Keep going.`;
  }
  return `Found ${suggestions.length} Workflow Skill candidate${suggestions.length === 1 ? '' : 's'} in a ${intent.label.toLowerCase()} pattern. Ready for review.`;
}

function createNextBestActions(intent, suggestions) {
  if (!suggestions.length) {
    return [
      'Collect another repetition of the pattern before suggesting automation',
      `Continue classifying this as ${intent.label.toLowerCase()}`,
      'Avoid capturing raw user-entered text at all times'
    ];
  }
  return [
    'Show the highest-confidence suggestion to the user for review',
    'Create a Workflow Skill draft from the top candidate',
    'Review permissions, policies, and ROI before enabling',
    'Run supervised dry-runs before allowing any auto-run'
  ];
}

function createRiskFlags(events) {
  const flags = [];
  if (events.some((e) => e.keyKind === 'redacted-character')) {
    flags.push('Text input was redacted before analysis — no content was stored.');
  }
  if (events.some((e) => /password|secret|token/i.test(e.targetLabel || ''))) {
    flags.push('Sensitive field label detected. Any automation touching this field requires admin review.');
  }
  return flags;
}
