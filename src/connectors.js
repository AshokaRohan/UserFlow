export const CONNECTORS = [
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'CRM',
    description: 'Update leads, contacts, opportunities, and cases with scoped connector permissions.',
    scopes: ['leads.read', 'leads.update', 'contacts.read', 'cases.read', 'cases.update', 'opportunities.draft'],
    plans: ['team', 'enterprise'],
    status: 'available',
    authMethod: 'oauth2'
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'Knowledge',
    description: 'Read and create pages, query databases, and append blocks — with explicit page-level scopes.',
    scopes: ['pages.read', 'pages.create', 'databases.query', 'blocks.append'],
    plans: ['pro', 'team', 'enterprise'],
    status: 'available',
    authMethod: 'oauth2'
  },
  {
    id: 'jira',
    name: 'Jira',
    category: 'Project management',
    description: 'Read and update issues, assign sprints, set priorities, and add comments with project-scoped permissions.',
    scopes: ['issues.read', 'issues.update', 'sprints.read', 'comments.create'],
    plans: ['team', 'enterprise'],
    status: 'available',
    authMethod: 'oauth2'
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Communication',
    description: 'Post messages, update statuses, and create follow-up reminders — requires explicit channel approval.',
    scopes: ['messages.send', 'status.update', 'reminders.create'],
    plans: ['team', 'enterprise'],
    status: 'available',
    authMethod: 'oauth2'
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'CRM',
    description: 'Update deal stages, contact properties, and log activities with fine-grained object scopes.',
    scopes: ['deals.update', 'contacts.update', 'activities.create'],
    plans: ['team', 'enterprise'],
    status: 'available',
    authMethod: 'oauth2'
  },
  {
    id: 'zendesk',
    name: 'Zendesk',
    category: 'Support',
    description: 'Triage tickets, assign agents, update SLA fields, and add internal notes — read-heavy by default.',
    scopes: ['tickets.read', 'tickets.update', 'agents.assign', 'notes.create'],
    plans: ['team', 'enterprise'],
    status: 'available',
    authMethod: 'oauth2'
  },
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    category: 'Productivity',
    description: 'Create calendar events, draft Gmail replies, and append to Docs — each action requires explicit consent.',
    scopes: ['calendar.events.create', 'gmail.drafts.create', 'docs.append'],
    plans: ['pro', 'team', 'enterprise'],
    status: 'available',
    authMethod: 'oauth2'
  },
  {
    id: 'linear',
    name: 'Linear',
    category: 'Project management',
    description: 'Create and update issues, assign cycles, and change priorities with team-scoped permissions.',
    scopes: ['issues.create', 'issues.update', 'cycles.assign'],
    plans: ['pro', 'team', 'enterprise'],
    status: 'available',
    authMethod: 'api_key'
  },
  {
    id: 'asana',
    name: 'Asana',
    category: 'Project management',
    description: 'Create tasks, update assignees, and manage project sections — with workspace-level access controls.',
    scopes: ['tasks.create', 'tasks.update', 'sections.manage'],
    plans: ['team', 'enterprise'],
    status: 'available',
    authMethod: 'oauth2'
  },
  {
    id: 'intercom',
    name: 'Intercom',
    category: 'Support',
    description: 'Update conversation state, assign owners, and apply tags — requires agent-level permission.',
    scopes: ['conversations.update', 'teams.assign', 'tags.apply'],
    plans: ['team', 'enterprise'],
    status: 'available',
    authMethod: 'oauth2'
  },
  {
    id: 'mcp-custom',
    name: 'Custom via MCP',
    category: 'Protocol',
    description: 'Expose any internal tool as a UserFlow connector using the Model Context Protocol (MCP) — no SDK required.',
    scopes: ['*'],
    plans: ['enterprise'],
    status: 'available',
    authMethod: 'mcp'
  }
];

export function getConnectors(planId) {
  if (!planId || planId === 'free') {
    return CONNECTORS.filter((c) => c.plans.includes('pro'));
  }
  return CONNECTORS.filter((c) => c.plans.includes(planId));
}

export function getConnectorById(id) {
  return CONNECTORS.find((c) => c.id === id) || null;
}

export function listConnectorScopes(connectorId) {
  const connector = getConnectorById(connectorId);
  return connector ? connector.scopes : [];
}
