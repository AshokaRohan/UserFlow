import { createReadStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeWithBrain } from './src/brain.js';
import { getConnectors, getConnectorById } from './src/connectors.js';
import {
  approveAutomationDraft,
  createAutomationDraftFromSuggestion,
  detectSuggestions,
  evaluateAutomations
} from './src/core.js';
import { handleMcpRequest } from './src/mcp.js';
import { getScenarioEvents, getScenarioList } from './src/scenarios.js';
import { getPlans, redactSubscription, resolveSubscription } from './src/subscriptions.js';
import {
  approveWorkflowSkill,
  createWorkflowSkillDraft,
  dryRunWorkflowSkill,
  evaluateSkillPolicies,
  evaluateWorkflowSkills,
  getSkillTemplates,
  recordDryRun
} from './src/workflowSkills.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4321);
const VERSION = '1.0.0';
const store = {
  events: [],
  automations: [],
  skills: [],
  runs: [],
  audit: []
};

const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'content-type, x-api-key');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const subscription = resolveSubscription(request.headers['x-api-key']);

    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url, subscription);
      return;
    }

    if (url.pathname === '/mcp') {
      await handleMcp(request, response, subscription);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, error.status || 500, {
      error: error.code || 'SERVER_ERROR',
      message: error.message
    });
  }
});

server.listen(port, () => {
  console.log(`UserFlow Automation Copilot running at http://127.0.0.1:${port}`);
});

async function handleApi(request, response, url, subscription) {
  if (request.method === 'GET' && url.pathname === '/api/v1/health') {
    sendJson(response, 200, {
      ok: true,
      service: 'userflow-automation-copilot',
      version: VERSION,
      aiProvider: process.env.ANTHROPIC_API_KEY ? 'claude' : 'local',
      subscription: redactSubscription(subscription)
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/connectors') {
    const connectors = getConnectors(subscription.plan.id);
    sendJson(response, 200, { connectors });
    return;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/v1/connectors/')) {
    const id = url.pathname.replace('/api/v1/connectors/', '');
    const connector = getConnectorById(id);
    if (!connector) {
      sendJson(response, 404, { error: 'CONNECTOR_NOT_FOUND' });
      return;
    }
    sendJson(response, 200, { connector });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/plans') {
    sendJson(response, 200, { plans: getPlans() });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/state/reset') {
    store.events = [];
    store.automations = [];
    store.skills = [];
    store.runs = [];
    store.audit = [];
    audit('state.reset', subscription, { reason: 'local test reset' });
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/agent-manifest') {
    sendJson(response, 200, await readJsonFile('public/agent-manifest.json'));
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/scenarios') {
    sendJson(response, 200, { scenarios: getScenarioList() });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/scenarios/run') {
    const body = await readJson(request);
    const events = getScenarioEvents(body.id);
    const enriched = events.map((event) => ({
      ...event,
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString()
    }));
    store.events.push(...enriched);
    store.events = store.events.slice(-1000);
    const suggestions = detectSuggestions(store.events, [...store.automations, ...store.skills]);
    audit('scenario.run', subscription, { id: body.id || 'inbox-triage', events: enriched.length });
    sendJson(response, 200, { accepted: enriched.length, suggestions, totalEvents: store.events.length });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/events') {
    const body = await readJson(request);
    const events = Array.isArray(body.events) ? body.events : [body.event].filter(Boolean);
    const enriched = events.map((event) => ({
      ...event,
      id: event.id || crypto.randomUUID(),
      receivedAt: new Date().toISOString()
    }));
    store.events.push(...enriched);
    store.events = store.events.slice(-1000);
    audit('events.ingested', subscription, { count: enriched.length });
    sendJson(response, 201, { accepted: enriched.length, totalEvents: store.events.length });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/suggestions') {
    sendJson(response, 200, {
      suggestions: detectSuggestions(store.events, [...store.automations, ...store.skills])
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/skills/templates') {
    sendJson(response, 200, { templates: getSkillTemplates() });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/skills') {
    sendJson(response, 200, { skills: store.skills });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/skills/draft') {
    const body = await readJson(request);
    const skill = createWorkflowSkillDraft(body.suggestion, body.events || store.events, body.options || {});
    store.skills.unshift(skill);
    audit('skill.drafted', subscription, { skillId: skill.id });
    sendJson(response, 201, { skill });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/skills/review') {
    const body = await readJson(request);
    sendJson(response, 200, {
      skill: body.skill,
      policies: evaluateSkillPolicies(body.skill),
      dryRun: dryRunWorkflowSkill(body.skill, body.events || store.events)
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/skills/approve') {
    const body = await readJson(request);
    const approved = approveWorkflowSkill(body.skill, body.corrections || {});
    store.skills = [approved, ...store.skills.filter((skill) => skill.id !== body.skill.id)];
    audit('skill.approved', subscription, { skillId: approved.id, status: approved.status });
    sendJson(response, 200, { skill: approved });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/skills/dry-run') {
    const body = await readJson(request);
    const dryRun = dryRunWorkflowSkill(body.skill, body.events || store.events);
    const accepted = Boolean(body.accepted);
    const updated = recordDryRun(body.skill, dryRun, accepted);
    store.skills = [updated, ...store.skills.filter((skill) => skill.id !== body.skill.id)];
    audit('skill.dry_run', subscription, { skillId: updated.id, accepted });
    sendJson(response, 200, { dryRun, skill: updated });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/skills/evaluate') {
    const body = await readJson(request);
    const activations = evaluateWorkflowSkills(body.events || store.events, body.skills || store.skills);
    store.runs.unshift(...activations);
    store.runs = store.runs.slice(0, 100);
    sendJson(response, 200, { activations });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/brain/analyze') {
    const body = await readJson(request);
    const analysis = await analyzeWithBrain({
      events: body.events || store.events,
      automations: body.automations || store.automations
    });
    audit('brain.analyzed', subscription, { eventCount: (body.events || store.events).length });
    sendJson(response, 200, analysis);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/automations') {
    sendJson(response, 200, { automations: store.automations });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/automations') {
    const body = await readJson(request);
    const automation = createAutomationDraftFromSuggestion(body.suggestion);
    store.automations.unshift(automation);
    audit('automation.draft_created', subscription, { automationId: automation.id });
    sendJson(response, 201, { automation });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/automations/approve') {
    const body = await readJson(request);
    const approved = approveAutomationDraft(body.draft, body.corrections || {});
    store.automations = [
      approved,
      ...store.automations.filter((automation) => automation.id !== body.draft.id)
    ];
    audit('automation.approved', subscription, { automationId: approved.id });
    sendJson(response, 200, { automation: approved });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/automations/evaluate') {
    const body = await readJson(request);
    const activations = evaluateAutomations(
      body.events || store.events,
      body.automations || store.automations
    );
    store.runs.unshift(...activations);
    store.runs = store.runs.slice(0, 100);
    sendJson(response, 200, { activations });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/audit') {
    sendJson(response, 200, { audit: store.audit.slice(0, 100) });
    return;
  }

  sendJson(response, 404, { error: 'NOT_FOUND' });
}

async function handleMcp(request, response, subscription) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const message = await readJson(request);
  const result = await handleMcpRequest(message, subscription);
  sendJson(response, 200, result);
}

async function serveStatic(pathname, response) {
  const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');

  // /app and /app/ serve the app shell
  if (safePath === '/app' || safePath === '/app/') {
    const appPath = join(root, 'app.html');
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache, no-store, must-revalidate' });
    createReadStream(appPath).pipe(response);
    return;
  }

  const filePath = join(root, safePath === '/' ? 'index.html' : safePath);
  const finalPath = existsSync(filePath) ? filePath : join(root, 'index.html');
  const type = contentType(extname(finalPath));
  const headers = { 'content-type': type };
  if (type.startsWith('text/html')) headers['cache-control'] = 'no-cache, no-store, must-revalidate';
  response.writeHead(200, headers);
  createReadStream(finalPath).pipe(response);
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('Invalid JSON in request body');
    error.status = 400;
    error.code = 'INVALID_JSON';
    throw error;
  }
}

async function readJsonFile(path) {
  return JSON.parse(await readFile(join(root, path), 'utf8'));
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(payload, null, 2));
}

function contentType(extension) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  }[extension] || 'application/octet-stream';
}

function audit(action, subscription, details) {
  store.audit.unshift({
    id: crypto.randomUUID(),
    action,
    accountId: subscription.accountId,
    plan: subscription.plan.id,
    details,
    at: new Date().toISOString()
  });
  store.audit = store.audit.slice(0, 500);
}
