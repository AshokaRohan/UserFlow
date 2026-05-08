export const TEST_SCENARIOS = {
  inboxTriage: {
    id: 'inbox-triage',
    name: 'Inbox triage skill discovery',
    description: 'Repeats a customer operations pattern that should create a safe CRM-style Workflow Skill.',
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
    name: 'Report export skill discovery',
    description: 'Repeats a reporting pattern with export permissions and dry-run preview.',
    events: [
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
  sensitiveBlocked: {
    id: 'sensitive-blocked',
    name: 'Sensitive action blocked by policy',
    description: 'Uses sensitive labels so the policy engine blocks activation.',
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
