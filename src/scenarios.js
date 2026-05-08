export const TEST_SCENARIOS = {
  inboxTriage: {
    id: 'inbox-triage',
    name: 'Customer support: Inbox triage',
    description: 'A support agent repeatedly sets priority, assigns a teammate, and marks the case ready. Creates an inbox triage Workflow Skill.',
    events: [
      ['click', 'Open inbox', 'triage'],
      ['click', 'Priority filter', 'triage'],
      ['change', 'Priority filter', 'triage'],
      ['click', 'Assign teammate', 'triage'],
      ['change', 'Assign teammate', 'triage'],
      ['click', 'Mark ready', 'triage'],
      ['click', 'Open inbox', 'triage'],
      ['click', 'Priority filter', 'triage'],
      ['change', 'Priority filter', 'triage'],
      ['click', 'Assign teammate', 'triage'],
      ['change', 'Assign teammate', 'triage'],
      ['click', 'Mark ready', 'triage']
    ]
  },

  reportExport: {
    id: 'report-export',
    name: 'Finance: Report export workflow',
    description: 'A finance analyst repeatedly applies date filters, reviews a chart, and exports — creating a reportable Workflow Skill with export permissions.',
    events: [
      ['click', 'Date filter', 'reporting'],
      ['change', 'Date filter', 'reporting'],
      ['click', 'Metric chart', 'reporting'],
      ['click', 'Export report', 'reporting'],
      ['click', 'Date filter', 'reporting'],
      ['change', 'Date filter', 'reporting'],
      ['click', 'Metric chart', 'reporting'],
      ['click', 'Export report', 'reporting'],
      ['click', 'Date filter', 'reporting'],
      ['change', 'Date filter', 'reporting'],
      ['click', 'Metric chart', 'reporting'],
      ['click', 'Export report', 'reporting']
    ]
  },

  salesforceLead: {
    id: 'salesforce-lead',
    name: 'Sales: Salesforce lead qualification',
    description: 'A sales rep repeatedly opens a lead, updates the stage, reassigns the owner, and logs a note — creating a CRM update skill with scoped connector permissions.',
    events: [
      ['click', 'Open lead', 'crm'],
      ['change', 'Lead stage', 'crm'],
      ['click', 'Assign owner', 'crm'],
      ['change', 'Assign owner', 'crm'],
      ['focus', 'Next step note', 'crm'],
      ['click', 'Save lead', 'crm'],
      ['click', 'Open lead', 'crm'],
      ['change', 'Lead stage', 'crm'],
      ['click', 'Assign owner', 'crm'],
      ['change', 'Assign owner', 'crm'],
      ['click', 'Save lead', 'crm'],
      ['click', 'Open lead', 'crm'],
      ['change', 'Lead stage', 'crm'],
      ['click', 'Save lead', 'crm']
    ]
  },

  jiraTriage: {
    id: 'jira-triage',
    name: 'Engineering: Jira ticket triage',
    description: 'An engineering lead repeatedly opens a ticket, sets sprint, assigns reviewer, and updates priority — creating a Jira triage Workflow Skill.',
    events: [
      ['click', 'Open ticket', 'devops'],
      ['change', 'Sprint assignment', 'devops'],
      ['click', 'Assign reviewer', 'devops'],
      ['change', 'Priority label', 'devops'],
      ['click', 'Update ticket', 'devops'],
      ['click', 'Open ticket', 'devops'],
      ['change', 'Sprint assignment', 'devops'],
      ['click', 'Assign reviewer', 'devops'],
      ['change', 'Priority label', 'devops'],
      ['click', 'Update ticket', 'devops'],
      ['click', 'Open ticket', 'devops'],
      ['change', 'Sprint assignment', 'devops'],
      ['click', 'Update ticket', 'devops']
    ]
  },

  sensitiveBlocked: {
    id: 'sensitive-blocked',
    name: 'Policy demo: Sensitive action blocked',
    description: 'Uses sensitive field labels so the policy engine automatically blocks the skill from activating — demonstrating safety controls.',
    events: [
      ['focus', 'Password token', 'admin'],
      ['change', 'Password token', 'admin'],
      ['click', 'Delete billing user', 'admin'],
      ['focus', 'Password token', 'admin'],
      ['change', 'Password token', 'admin'],
      ['click', 'Delete billing user', 'admin']
    ]
  }
};

export function getScenarioEvents(id) {
  const scenario = Object.values(TEST_SCENARIOS).find((item) => item.id === id) || TEST_SCENARIOS.inboxTriage;
  return scenario.events.map(([type, targetLabel, zone]) => ({ type, targetLabel, zone }));
}

export function getScenarioList() {
  return Object.values(TEST_SCENARIOS).map(({ id, name, description }) => ({ id, name, description }));
}
