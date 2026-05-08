export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Individual Free',
    monthlyPriceUsd: 0,
    limits: {
      eventsPerDay: 500,
      automations: 3,
      mcpTools: [
        'plans.list',
        'brain.analyze',
        'suggestions.detect',
        'skills.templates',
        'skills.draft',
        'skills.review'
      ]
    },
    features: [
      'Local observation',
      'Heuristic suggestions',
      'Personal automation drafts'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Individual Pro',
    monthlyPriceUsd: 19,
    limits: {
      eventsPerDay: 10000,
      automations: 50,
      mcpTools: [
        'plans.list',
        'subscription.check',
        'brain.analyze',
        'suggestions.detect',
        'skills.templates',
        'skills.draft',
        'skills.review',
        'skills.approve',
        'skills.run_dry',
        'skills.evaluate',
        'automations.create',
        'automations.approve',
        'automations.evaluate'
      ]
    },
    features: [
      'AI-enhanced workflow summaries',
      'API access',
      'Automation trigger testing',
      'Local audit log'
    ]
  },
  team: {
    id: 'team',
    name: 'Company Team',
    monthlyPriceUsd: 49,
    perSeat: true,
    limits: {
      eventsPerDay: 100000,
      automations: 500,
      mcpTools: [
        'plans.list',
        'subscription.check',
        'brain.analyze',
        'suggestions.detect',
        'skills.templates',
        'skills.draft',
        'skills.review',
        'skills.approve',
        'skills.run_dry',
        'skills.evaluate',
        'automations.create',
        'automations.approve',
        'automations.evaluate',
        'connectors.invoke',
        'audit.search'
      ]
    },
    features: [
      'Team workspaces',
      'Admin controls',
      'Connector API access',
      'Policy-gated automations',
      'Audit export'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPriceUsd: null,
    limits: {
      eventsPerDay: 1000000,
      automations: 5000,
      mcpTools: ['*']
    },
    features: [
      'Private deployment',
      'Custom MCP tools',
      'SSO and SCIM ready',
      'Data residency controls',
      'Advanced policy engine'
    ]
  }
};

const API_KEYS = {
  'local-free-key': {
    accountId: 'acct_local_free',
    plan: 'free',
    subject: 'local-user'
  },
  'local-pro-key': {
    accountId: 'acct_local_pro',
    plan: 'pro',
    subject: 'local-pro-user'
  },
  'local-team-key': {
    accountId: 'acct_local_team',
    plan: 'team',
    subject: 'local-team-admin'
  },
  'local-enterprise-key': {
    accountId: 'acct_local_enterprise',
    plan: 'enterprise',
    subject: 'local-enterprise-admin'
  }
};

export function getPlans() {
  return Object.values(SUBSCRIPTION_PLANS);
}

export function resolveSubscription(apiKey = 'local-free-key') {
  const account = API_KEYS[apiKey] || API_KEYS['local-free-key'];
  const plan = SUBSCRIPTION_PLANS[account.plan];
  return {
    ...account,
    plan
  };
}

export function canUseTool(subscription, toolName) {
  const allowed = subscription.plan.limits.mcpTools;
  return allowed.includes('*') || allowed.includes(toolName);
}

export function enforceToolAccess(subscription, toolName) {
  if (canUseTool(subscription, toolName)) return;
  const error = new Error(`The ${toolName} tool requires a higher subscription tier.`);
  error.code = 'SUBSCRIPTION_REQUIRED';
  error.status = 402;
  throw error;
}

export function redactSubscription(subscription) {
  return {
    accountId: subscription.accountId,
    subject: subscription.subject,
    plan: subscription.plan
  };
}
