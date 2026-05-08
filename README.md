# UserFlow — Workflow Automation Copilot

**UserFlow watches how knowledge workers use their SaaS tools, detects repeated patterns, and proposes Workflow Skills they can review, approve, and control — without capturing raw typed text, without involving IT, and without writing a single rule.**

**Live demo:** [userflow-indol.vercel.app](https://userflow-indol.vercel.app)

---

## The problem

Knowledge workers spend 30–40% of their time on repeated, low-value workflow steps:
triage the inbox → assign teammate → mark ready. Filter → chart → export. Open lead → update stage → log note.

Existing automation tools (Zapier, Make, Workato) require developer skill, IT procurement, and rule authoring. The people doing the repetitive work can't use them.

**The result:** $47B in lost productivity annually across US knowledge workers alone.¹

---

## What UserFlow does

UserFlow is an **AI-powered workflow automation copilot** that learns directly from how users work — not from rules they write.

1. **Observes** — Tracks clicks, focus changes, and safe keyboard metadata (shortcuts, Enter, navigation) inside the browser tab only. No raw text. No OS hooks. No clipboard access.
2. **Detects** — An AI brain (Claude) finds repeated sequences and frequent action clusters, scoring them for confidence and ROI.
3. **Suggests** — Proposes a named Workflow Skill with a trigger, steps, permissions, policies, and time-saved estimate.
4. **Reviews** — Shows the complete skill before anything activates: capabilities, restrictions, data used, safety checks.
5. **Approves** — The user checks a consent box and clicks Approve. Nothing activates without that.
6. **Dry-runs** — On the next trigger match, shows a step-by-step preview. Accept or Dismiss.
7. **Activates** — After accepted dry-runs, the skill fires live. Every run is logged. Pause or delete anytime.

---

## Why now

- **LLMs made pattern extraction tractable** — detecting workflow intent from interaction metadata is now a 400-token prompt, not a PhD thesis
- **MCP standardized agent tooling** — any enterprise SaaS tool can now be a UserFlow connector through a single protocol
- **Privacy legislation is tightening** — GDPR, CCPA, and enterprise security reviews are blocking traditional screen-recording automation tools; UserFlow's no-raw-text architecture passes where competitors fail
- **AI copilot budgets are unlocked** — enterprise IT is actively looking for AI productivity tools that don't require sharing sensitive data with third-party LLMs

---

## Traction

- Working prototype with full skill lifecycle (detect → review → approve → dry-run → activate)
- REST API + MCP tool interface for agent integrations
- Policy engine that auto-blocks sensitive data, destructive actions, and admin scopes
- 4 enterprise scenario templates (Support, Sales, Engineering, Finance)
- 11 connector integrations defined (Salesforce, Notion, Jira, Slack, HubSpot, Zendesk, Linear, Google Workspace, Asana, Intercom, MCP-custom)
- Vercel deployment live and shareable

---

## Business model

| Plan | Price | Target |
|---|---|---|
| Individual Free | $0 | Personal use, developer evaluation |
| Individual Pro | $19/mo | Power users, indie consultants |
| Company Team | $49/seat/mo | SMB and mid-market teams |
| Enterprise | Custom | Large org, private deployment, compliance |

**ACV target:** $2,400–$30,000+ per company account at Team/Enterprise tier.

---

## Market

- **TAM:** $47B+ knowledge worker productivity market
- **SAM:** $15B workflow automation market (Gartner, 2025), growing 23% YoY
- **SOM:** 50M knowledge workers in English-speaking markets using 3+ SaaS tools daily

---

## Moat

1. **Privacy-first architecture** — no raw text stored, consent-gated, audit-trailed. Competitors (Zapier, Workato, Bardeen) record screens or require data sharing. UserFlow passes enterprise security review where they fail.
2. **Pattern corpus** — every approved skill becomes training signal for better detection across the user base (with consent).
3. **MCP native** — built on the same tool protocol as Claude, GPT, and Gemini agents. As agentic AI goes mainstream, UserFlow is already the automation layer.
4. **Consent UX** — the dry-run-first, review-before-activate flow creates trust loops that make users comfortable sharing more pattern data, improving model quality.

---

## Tech stack

- **Frontend:** Vanilla JavaScript ES modules, HTML5, CSS3 — no framework, zero dependencies
- **Backend:** Node.js built-in `http` module — no Express, no runtime dependencies
- **AI:** Claude (Anthropic API) for pattern analysis and workflow summarization
- **Agent protocol:** MCP JSON-RPC tool interface at `POST /mcp`
- **Storage:** `localStorage` (browser) + in-memory store (server) — production would use Postgres + Redis
- **Deployment:** Vercel (static CDN + Node.js serverless)
- **Tests:** Node.js native `node:test` — 18 tests, zero external test dependencies

---

## Quick start

**Requirements:** Node.js 18+

```bash
git clone https://github.com/AshokaRohan/UserFlow.git
cd UserFlow
npm test       # run the 18-test suite
npm start      # start server at http://127.0.0.1:4321
```

Open [http://127.0.0.1:4321](http://127.0.0.1:4321) for the landing page.  
Open [http://127.0.0.1:4321/app](http://127.0.0.1:4321/app) for the live demo.

**To enable Claude AI brain** (optional):
```bash
ANTHROPIC_API_KEY=sk-ant-... npm start
```

Without the key, the app uses local heuristics and works fully offline.

---

## Demo scenarios

Run any scenario from the app's scenario selector to see the full skill lifecycle:

| Scenario | Domain | What it shows |
|---|---|---|
| Inbox triage | Customer Support | Priority → assign → mark ready pattern → skill creation |
| Report export | Finance | Filter → chart → export pattern → export permissions |
| Salesforce lead | Sales / CRM | Lead stage → owner → save pattern → CRM connector scopes |
| Jira triage | Engineering | Ticket → sprint → reviewer pattern → project scopes |
| Policy block | Admin | Sensitive field label → policy engine blocks activation |

---

## REST API

Server runs on port `4321`. All endpoints require `x-api-key` header.

**Demo keys:**

| Key | Plan |
|---|---|
| `local-free-key` | Individual Free |
| `local-pro-key` | Individual Pro |
| `local-team-key` | Company Team |
| `local-enterprise-key` | Enterprise |

**Key endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Server status, AI provider, subscription info |
| GET | `/api/v1/scenarios` | List available demo scenarios |
| POST | `/api/v1/scenarios/run` | Inject a scenario's events |
| POST | `/api/v1/events` | Ingest one or more events |
| GET | `/api/v1/suggestions` | Current automation suggestions |
| GET | `/api/v1/skills` | All Workflow Skills |
| POST | `/api/v1/skills/draft` | Create a skill draft from a suggestion |
| POST | `/api/v1/skills/review` | Review policies + dry-run preview |
| POST | `/api/v1/skills/approve` | Approve a skill (with optional corrections) |
| POST | `/api/v1/skills/dry-run` | Run a dry-run and record acceptance |
| POST | `/api/v1/skills/evaluate` | Evaluate active skills against an event stream |
| POST | `/api/v1/brain/analyze` | AI brain analysis (Claude if key set, local otherwise) |
| GET | `/api/v1/connectors` | List available connector integrations |
| GET | `/api/v1/connectors/:id` | Get a specific connector definition |
| GET | `/api/v1/audit` | Audit log of all actions |
| POST | `/api/v1/state/reset` | Reset server-side state |

---

## MCP interface

UserFlow exposes a JSON-RPC MCP endpoint at `POST /mcp` — compatible with Claude, GPT-4o, Gemini, and any agent using the Model Context Protocol.

```bash
curl -X POST http://127.0.0.1:4321/mcp \
  -H 'content-type: application/json' \
  -H 'x-api-key: local-pro-key' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Agent discovery manifest: `GET /api/v1/agent-manifest`

---

## Connector ecosystem

11 connectors defined across CRM, support, project management, knowledge, and communication:

Salesforce · Notion · Jira · Slack · HubSpot · Zendesk · Google Workspace · Linear · Asana · Intercom · Custom via MCP

Each connector defines explicit OAuth2 scopes, plan requirements, and supported actions. Skills only receive the scopes they declare in their permissions list.

---

## Privacy guarantees

- **No raw text** — keyboard events are reduced to safe metadata only (`Enter`, `Meta+K`, `[character]`). Typed content is never stored.
- **Page-scoped** — observation limited to the active browser tab. No OS hooks, no clipboard, no background activity.
- **Consent-gated** — no skill activates without an explicit checkbox + Approve click.
- **Dry-run-first** — every new skill runs in preview mode before going live.
- **Policy engine** — sensitive data, destructive actions, outbound sends, and admin scopes are auto-flagged or blocked.
- **Audit trail** — every draft, approval, dry-run, and activation is logged with timestamps.

---

## Project structure

```
UserFlow/
├── index.html              # Marketing landing page
├── app.html                # Live demo app shell
├── styles.css              # Design system — landing + app
├── server.js               # Node.js API server (REST + MCP)
├── package.json
├── vercel.json
├── src/
│   ├── app.js              # Browser event capture, UI rendering, state
│   ├── core.js             # Pattern detection, tokenization, intent inference
│   ├── workflowSkills.js   # Skill schema, policies, ROI, dry-run, approval
│   ├── brain.js            # AI brain — Claude API + local heuristic fallback
│   ├── connectors.js       # Connector catalog (11 integrations defined)
│   ├── mcp.js              # MCP JSON-RPC tool handler
│   ├── subscriptions.js    # Subscription plans and API key resolution
│   └── scenarios.js        # 5 enterprise demo scenarios
├── tests/
│   ├── core.test.js
│   ├── workflowSkills.test.js
│   └── platform.test.js
├── public/
│   └── agent-manifest.json
└── docs/
    └── PRODUCT_ARCHITECTURE.md
```

---

## Roadmap

**v1.1 — Multi-user foundations**
- Persistent storage (Postgres + Redis)
- Auth (email/password + SSO via WorkOS)
- Team workspaces and shared skill library
- Connector OAuth2 flows (Salesforce, Notion, Jira)

**v1.2 — Agent integrations**
- Claude agent orchestration via MCP
- Webhook-triggered skill execution
- Skill marketplace (import/export community skills)

**v1.3 — Enterprise**
- Private deployment (Docker + Kubernetes)
- SCIM provisioning
- Data residency (EU/US/APAC)
- Advanced policy engine with custom rules
- SIEM integration (audit log export)

---

## Extending

| Goal | File |
|---|---|
| Add a connector | `CONNECTORS` array in `src/connectors.js` |
| Add a policy rule | `SENSITIVE_PATTERNS` / `DESTRUCTIVE_PATTERNS` in `src/workflowSkills.js` |
| Add a subscription plan | `SUBSCRIPTION_PLANS` in `src/subscriptions.js` |
| Add a demo scenario | `TEST_SCENARIOS` in `src/scenarios.js` |
| Wire a different AI provider | `analyzeWithBrain()` in `src/brain.js` |
| Add an MCP tool | `MCP_TOOLS` array + `callTool()` in `src/mcp.js` |

---

## Contact

**hello@userflow.ai** — for pilots, partnerships, and investor conversations.

---

¹ McKinsey Global Institute, "The Future of Work After COVID-19", 2021. Extrapolated to 2025 at 2.3% productivity cost inflation.
