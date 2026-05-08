import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeWithBrain } from '../src/brain.js';
import { handleMcpRequest } from '../src/mcp.js';
import { canUseTool, resolveSubscription } from '../src/subscriptions.js';

const repeatedEvents = [
  { type: 'click', targetLabel: 'Open inbox' },
  { type: 'click', targetLabel: 'Priority filter' },
  { type: 'change', targetLabel: 'Priority filter' },
  { type: 'click', targetLabel: 'Open inbox' },
  { type: 'click', targetLabel: 'Priority filter' },
  { type: 'change', targetLabel: 'Priority filter' }
];

test('analyzeWithBrain returns local AI summary and enriched suggestions', async () => {
  const result = await analyzeWithBrain({ events: repeatedEvents });
  assert.equal(result.provider, 'local');
  assert.ok(result.summary.includes('Workflow Skill candidate'));
  assert.ok(result.suggestions.length > 0);
  assert.ok(result.skillDrafts.length > 0);
  assert.ok(result.suggestions[0].aiReason);
});

test('subscription plans gate MCP tools', () => {
  const free = resolveSubscription('local-free-key');
  const team = resolveSubscription('local-team-key');

  assert.equal(canUseTool(free, 'connectors.invoke'), false);
  assert.equal(canUseTool(free, 'skills.draft'), true);
  assert.equal(canUseTool(team, 'connectors.invoke'), true);
});

test('MCP tools/list returns only tools allowed by subscription', async () => {
  const response = await handleMcpRequest(
    { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
    resolveSubscription('local-free-key')
  );

  const toolNames = response.result.tools.map((tool) => tool.name);
  assert.ok(toolNames.includes('brain.analyze'));
  assert.ok(toolNames.includes('skills.draft'));
  assert.equal(toolNames.includes('connectors.invoke'), false);
});

test('MCP brain.analyze returns JSON content payload', async () => {
  const response = await handleMcpRequest(
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'brain.analyze',
        arguments: { events: repeatedEvents }
      }
    },
    resolveSubscription('local-pro-key')
  );

  assert.equal(response.result.content[0].type, 'text');
  const payload = JSON.parse(response.result.content[0].text);
  assert.equal(payload.provider, 'local');
  assert.ok(payload.suggestions.length > 0);
});

test('MCP automations.create returns a disabled review draft', async () => {
  const analysis = await analyzeWithBrain({ events: repeatedEvents });
  const response = await handleMcpRequest(
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'automations.create',
        arguments: { suggestion: analysis.suggestions[0] }
      }
    },
    resolveSubscription('local-pro-key')
  );

  const payload = JSON.parse(response.result.content[0].text);
  assert.equal(payload.automation.status, 'draft');
  assert.equal(payload.automation.active, false);
  assert.ok(payload.automation.review.confirmationQuestion);
});

test('MCP skills.draft returns a Workflow Skill draft with policy and ROI metadata', async () => {
  const analysis = await analyzeWithBrain({ events: repeatedEvents });
  const response = await handleMcpRequest(
    {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'skills.draft',
        arguments: {
          suggestion: analysis.suggestions[0],
          events: repeatedEvents
        }
      }
    },
    resolveSubscription('local-pro-key')
  );

  const payload = JSON.parse(response.result.content[0].text);
  assert.equal(payload.skill.kind, 'workflow_skill');
  assert.equal(payload.skill.status, 'draft');
  assert.ok(payload.skill.roi.estimatedMonthlyMinutesSaved > 0);
});

test('MCP blocks paid connector tool on free plan', async () => {
  await assert.rejects(
    handleMcpRequest(
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'connectors.invoke',
          arguments: { connector: 'crm', action: 'create_task' }
        }
      },
      resolveSubscription('local-free-key')
    ),
    /higher subscription tier/
  );
});
