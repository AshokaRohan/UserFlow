# UserFlow — Workflow Automation Copilot

UserFlow is a **consent-first, privacy-first** automation copilot that watches how you work, detects repeated patterns, and suggests Workflow Skills you can review, approve, and run — without ever capturing raw typed text or running in the background.

**Live demo:** [userflow-indol.vercel.app](https://userflow-indol.vercel.app)

---

## What it does

1. **Observes** — Tracks clicks, focus changes, form interactions, and safe keyboard metadata (shortcuts, Enter, navigation keys) inside the app window only. No raw text. No OS-level hooks.
2. **Detects** — Finds repeated sequences and frequent action clusters in your interaction history.
3. **Suggests** — Proposes a named Workflow Skill with a trigger, steps, permissions, policies, and an ROI estimate.
4. **Reviews** — Shows you exactly what the skill can and cannot do before you enable it.
5. **Approves** — You check a consent box and click Approve. Nothing activates without that.
6. **Dry-runs** — On the next trigger match, shows a step-by-step preview. You click Accept or Dismiss.
7. **Activates** — After accepted dry-runs, the skill goes live and logs every run.

---

## Quick start

**Requirements:** Node.js 18+

```bash
# Install dependencies (none required — pure Node.js)
npm test        # run the 18-test suite
npm start       # start server at http://127.0.0.1:4321
```

Open [http://127.0.0.1:4321](http://127.0.0.1:4321) in your browser.

---

## How to use the app

1. Click **Start observing** to begin capturing interactions.
2. Use the **Customer Operations** demo workspace — change the Priority filter, assign a teammate, click Mark ready. Repeat the sequence 2–3 times.
3. A **Suggestion** card will appear. Click **Review Skill**.
4. Read through the permissions, policies, ROI, and steps. Correct any fields.
5. Check the consent box, then click **Approve and start**.
6. Click **Dry-run** on the approved skill card. Review the preview, then click **Accept** to confirm.
7. Or click **Run demo scenario** to auto-generate a full inbox-triage pattern in one step.

---

## Project structure

```
UserFlow/
├── index.html              # Single-page app shell
├── styles.css              # Responsive UI styles
├── server.js               # Node.js HTTP server — REST API + MCP endpoint
├── package.json
├── src/
│   ├── app.js              # Browser event capture, UI rendering, state
│   ├── core.js             # Pattern detection, tokenization, intent inference
│   ├── workflowSkills.js   # Skill schema, policies, ROI, dry-run, approval
│   ├── brain.js            # AI brain abstraction (local heuristics + API slot)
│   ├── mcp.js              # MCP JSON-RPC tool handler
│   ├── subscriptions.js    # Subscription plans and API key resolution
│   └── scenarios.js        # Built-in test scenarios
├── tests/
│   ├── core.test.js
│   ├── workflowSkills.test.js
│   └── platform.test.js
├── public/
│   └── agent-manifest.json # Agent discovery manifest
└── docs/
    └── PRODUCT_ARCHITECTURE.md
```

---

## Workflow Skill lifecycle

```
Detected pattern
  → Suggestion card (confidence score, trigger description)
    → Review dialog (permissions · policies · ROI · editable fields)
      → Approve (consent checkbox required)
        → Dry-run (step preview · Accept or Dismiss)
          → Active skill (fires on trigger · run log · pause/delete)
```

---

## REST API

The server runs on port `4321`. All API routes require the `x-api-key` header.

**Demo API keys:**

| Key | Plan |
|---|---|
| `local-free-key` | Free |
| `local-pro-key` | Pro |
| `local-team-key` | Team |
| `local-enterprise-key` | Enterprise |

**Health check:**
```bash
curl http://127.0.0.1:4321/api/v1/health \
  -H 'x-api-key: local-pro-key'
```

**Run a built-in scenario:**
```bash
curl -X POST http://127.0.0.1:4321/api/v1/scenarios/run \
  -H 'content-type: application/json' \
  -H 'x-api-key: local-pro-key' \
  -d '{"id": "inbox-triage"}'
```

Available scenarios: `inbox-triage`, `report-export`, `sensitive-blocked`

**Key endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Server status and subscription info |
| GET | `/api/v1/scenarios` | List available test scenarios |
| POST | `/api/v1/scenarios/run` | Inject a scenario's events |
| POST | `/api/v1/events` | Ingest one or more events |
| GET | `/api/v1/suggestions` | Get current automation suggestions |
| GET | `/api/v1/skills` | List all Workflow Skills |
| POST | `/api/v1/skills/draft` | Create a skill draft from a suggestion |
| POST | `/api/v1/skills/review` | Review a skill's policies and dry-run |
| POST | `/api/v1/skills/approve` | Approve a skill (with optional corrections) |
| POST | `/api/v1/skills/dry-run` | Run a dry-run and record user acceptance |
| POST | `/api/v1/skills/evaluate` | Check active skills against an event stream |
| POST | `/api/v1/brain/analyze` | AI brain analysis of events and patterns |
| GET | `/api/v1/audit` | Audit log of all actions |
| POST | `/api/v1/state/reset` | Reset server-side state (for testing) |

---

## MCP tool interface

UserFlow exposes an MCP-compatible JSON-RPC endpoint at `POST /mcp`.

**List available tools:**
```bash
curl -X POST http://127.0.0.1:4321/mcp \
  -H 'content-type: application/json' \
  -H 'x-api-key: local-pro-key' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

**Draft a skill via MCP:**
```bash
curl -X POST http://127.0.0.1:4321/mcp \
  -H 'content-type: application/json' \
  -H 'x-api-key: local-pro-key' \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "skills.draft",
      "arguments": { "suggestionId": "<id>", "events": [] }
    }
  }'
```

Agent discovery manifest: `GET /api/v1/agent-manifest`

---

## Privacy and safety guarantees

- **No raw text capture** — keyboard events are reduced to safe metadata (`Enter`, `Meta+K`, `[character]`). Typed content is never stored.
- **Page-scoped only** — observation is limited to this page. No OS-level hooks, no clipboard access, no background activity.
- **Consent required** — no skill activates without an explicit checkbox + Approve click.
- **Dry-run first** — every new skill runs in preview mode before going live.
- **Policy engine** — sensitive data, destructive actions, outbound sends, and admin scopes are automatically flagged or blocked.
- **Audit trail** — every draft, approval, dry-run, and activation is logged with timestamps.

---

## Tech stack

- **Frontend:** Vanilla JavaScript (ES modules), HTML5, CSS3 — no framework
- **Backend:** Node.js built-in `http` module — no Express, no external dependencies
- **Tests:** Node.js native `node:test` module
- **Storage:** `localStorage` (browser) + in-memory store (server)
- **Deployment:** Vercel (static + Node.js server)

---

## Extending the project

| Goal | Where to change |
|---|---|
| Add a new policy rule | `SENSITIVE_PATTERNS` / `DESTRUCTIVE_PATTERNS` in `src/workflowSkills.js` |
| Add a new subscription plan | `SUBSCRIPTION_PLANS` in `src/subscriptions.js` |
| Add a new test scenario | `TEST_SCENARIOS` in `src/scenarios.js` |
| Wire in a real AI provider | `analyzeWithBrain()` in `src/brain.js` |
| Add a new MCP tool | `MCP_TOOLS` array + `callTool()` in `src/mcp.js` |

---

## Further reading

- [PLAN.md](./PLAN.md) — implementation plan and safety boundaries
- [USER_WORKFLOW_GUIDE.md](./USER_WORKFLOW_GUIDE.md) — step-by-step usage guide
- [docs/PRODUCT_ARCHITECTURE.md](./docs/PRODUCT_ARCHITECTURE.md) — full architecture documentation
