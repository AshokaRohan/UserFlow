import {
  approveAutomationDraft,
  createAutomationDraftFromSuggestion,
  detectSuggestions,
  evaluateAutomations
} from './core.js';
import { analyzeWithBrain } from './brain.js';
import { enforceToolAccess, getPlans, redactSubscription } from './subscriptions.js';
import {
  approveWorkflowSkill,
  createWorkflowSkillDraft,
  dryRunWorkflowSkill,
  evaluateSkillPolicies,
  evaluateWorkflowSkills,
  getSkillTemplates
} from './workflowSkills.js';

export const MCP_TOOLS = [
  {
    name: 'plans.list',
    description: 'List subscription plans, features, limits, and MCP tool access.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'subscription.check',
    description: 'Return the subscription connected to the API key.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'brain.analyze',
    description: 'Analyze sanitized interaction events and return intent, suggestions, and next actions.',
    inputSchema: {
      type: 'object',
      properties: {
        events: { type: 'array' },
        automations: { type: 'array' }
      }
    }
  },
  {
    name: 'suggestions.detect',
    description: 'Detect repeated workflows from sanitized interaction events.',
    inputSchema: {
      type: 'object',
      properties: {
        events: { type: 'array' },
        automations: { type: 'array' }
      }
    }
  },
  {
    name: 'skills.templates',
    description: 'List installable Workflow Skill templates.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'skills.draft',
    description: 'Create a reviewable Workflow Skill draft from a suggestion.',
    inputSchema: {
      type: 'object',
      required: ['suggestion'],
      properties: {
        suggestion: { type: 'object' },
        events: { type: 'array' },
        options: { type: 'object' }
      }
    }
  },
  {
    name: 'skills.review',
    description: 'Evaluate policies and review data for a Workflow Skill draft.',
    inputSchema: {
      type: 'object',
      required: ['skill'],
      properties: {
        skill: { type: 'object' }
      }
    }
  },
  {
    name: 'skills.approve',
    description: 'Approve a reviewed Workflow Skill draft and enable it if policies allow.',
    inputSchema: {
      type: 'object',
      required: ['skill'],
      properties: {
        skill: { type: 'object' },
        corrections: { type: 'object' }
      }
    }
  },
  {
    name: 'skills.run_dry',
    description: 'Run a supervised dry-run preview for a Workflow Skill.',
    inputSchema: {
      type: 'object',
      required: ['skill'],
      properties: {
        skill: { type: 'object' },
        events: { type: 'array' }
      }
    }
  },
  {
    name: 'skills.evaluate',
    description: 'Evaluate active Workflow Skills against recent events.',
    inputSchema: {
      type: 'object',
      properties: {
        events: { type: 'array' },
        skills: { type: 'array' }
      }
    }
  },
  {
    name: 'automations.create',
    description: 'Create a disabled automation draft from a suggestion for human review.',
    inputSchema: {
      type: 'object',
      required: ['suggestion'],
      properties: {
        suggestion: { type: 'object' }
      }
    }
  },
  {
    name: 'automations.approve',
    description: 'Approve a reviewed automation draft and make it active.',
    inputSchema: {
      type: 'object',
      required: ['draft'],
      properties: {
        draft: { type: 'object' },
        corrections: { type: 'object' }
      }
    }
  },
  {
    name: 'automations.evaluate',
    description: 'Evaluate whether active automations should fire for the latest event stream.',
    inputSchema: {
      type: 'object',
      properties: {
        events: { type: 'array' },
        automations: { type: 'array' }
      }
    }
  },
  {
    name: 'connectors.invoke',
    description: 'Placeholder for paid external API connector execution.',
    inputSchema: {
      type: 'object',
      properties: {
        connector: { type: 'string' },
        action: { type: 'string' },
        payload: { type: 'object' }
      }
    }
  }
];

export async function handleMcpRequest(message, subscription) {
  if (message.method === 'initialize') {
    return mcpResult(message.id, {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'userflow-automation-copilot',
        version: '0.2.0'
      },
      capabilities: {
        tools: {}
      }
    });
  }

  if (message.method === 'tools/list') {
    return mcpResult(message.id, {
      tools: MCP_TOOLS.filter((tool) => canListTool(subscription, tool.name))
    });
  }

  if (message.method === 'tools/call') {
    const toolName = message.params?.name;
    const args = message.params?.arguments || {};
    enforceToolAccess(subscription, toolName);
    const result = await callTool(toolName, args, subscription);
    return mcpResult(message.id, {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    });
  }

  return mcpError(message.id, -32601, `Unknown MCP method: ${message.method}`);
}

async function callTool(toolName, args, subscription) {
  if (toolName === 'plans.list') return { plans: getPlans() };
  if (toolName === 'subscription.check') return redactSubscription(subscription);
  if (toolName === 'brain.analyze') {
    return analyzeWithBrain({
      events: args.events || [],
      automations: args.automations || []
    });
  }
  if (toolName === 'suggestions.detect') {
    return { suggestions: detectSuggestions(args.events || [], args.automations || []) };
  }
  if (toolName === 'skills.templates') return { templates: getSkillTemplates() };
  if (toolName === 'skills.draft') {
    return { skill: createWorkflowSkillDraft(args.suggestion, args.events || [], args.options || {}) };
  }
  if (toolName === 'skills.review') {
    return {
      skill: args.skill,
      policies: evaluateSkillPolicies(args.skill),
      dryRun: dryRunWorkflowSkill(args.skill, args.events || [])
    };
  }
  if (toolName === 'skills.approve') {
    return { skill: approveWorkflowSkill(args.skill, args.corrections || {}) };
  }
  if (toolName === 'skills.run_dry') {
    return { dryRun: dryRunWorkflowSkill(args.skill, args.events || []) };
  }
  if (toolName === 'skills.evaluate') {
    return { activations: evaluateWorkflowSkills(args.events || [], args.skills || []) };
  }
  if (toolName === 'automations.create') {
    return { automation: createAutomationDraftFromSuggestion(args.suggestion) };
  }
  if (toolName === 'automations.approve') {
    return { automation: approveAutomationDraft(args.draft, args.corrections || {}) };
  }
  if (toolName === 'automations.evaluate') {
    return { activations: evaluateAutomations(args.events || [], args.automations || []) };
  }
  if (toolName === 'connectors.invoke') {
    return {
      status: 'dry-run',
      connector: args.connector,
      action: args.action,
      acceptedByPlan: subscription.plan.id,
      message: 'Connector execution is stubbed for the local prototype.'
    };
  }
  throw Object.assign(new Error(`Unknown tool: ${toolName}`), { status: 404 });
}

function canListTool(subscription, toolName) {
  try {
    enforceToolAccess(subscription, toolName);
    return true;
  } catch {
    return false;
  }
}

function mcpResult(id, result) {
  return {
    jsonrpc: '2.0',
    id,
    result
  };
}

function mcpError(id, code, message) {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message }
  };
}
