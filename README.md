# Local Interaction Automation Copilot

A consent-first local prototype that observes mouse and keyboard interaction metadata inside its own page, infers repeated workflows, and suggests automations the user can activate.

The app does not run in the background, does not capture global OS input, and does not store raw typed text. Keyboard events are reduced to safe metadata such as `Enter`, navigation keys, or shortcut combinations.

## Run

```bash
npm test
npm start
```

Then open `http://127.0.0.1:4321`.

## Prototype Scope

- Tracks pointer movement, clicks, focus changes, form changes, and safe keyboard metadata inside the app window.
- Infers intent from recent interaction clusters.
- Detects repeated event sequences and frequent task actions.
- Suggests a local automation with an activation trigger.
- Opens a review step before enabling any automation.
- Lets the user correct the automation name, trigger, action, and execution preview.
- Starts automation only after explicit approval.
- Simulates automation execution when an approved trigger appears again.
- Converts repeated work into Workflow Skills with permissions, policies, ROI scoring, replay, and dry-run support.
- Exposes REST APIs and an MCP-style JSON-RPC endpoint for agents.
- Includes subscription-aware tool access and API keys for local demos.
- Includes an AI brain abstraction with a local heuristic provider and an external API slot.

See [USER_WORKFLOW_GUIDE.md](./USER_WORKFLOW_GUIDE.md) for how to use and test the product.

See [PLAN.md](./PLAN.md) for the detailed implementation plan and safety boundaries.

## Workflow Skill Lifecycle

`Suggestion -> Workflow Skill draft -> Review replay/policies/permissions/ROI -> Correct fields -> Approve -> Dry-run -> Active skill`

Local test scenarios:

- `inbox-triage`: safe customer operations skill.
- `report-export`: reporting/export skill with draft permissions.
- `sensitive-blocked`: sensitive/destructive skill blocked by policy.

## Agent and API Usage

Local demo API keys:

- `local-free-key`
- `local-pro-key`
- `local-team-key`
- `local-enterprise-key`

Health check:

```bash
curl -s http://127.0.0.1:4321/api/v1/health -H 'x-api-key: local-pro-key'
```

Run a built-in scenario:

```bash
curl -s http://127.0.0.1:4321/api/v1/scenarios/run \
  -H 'content-type: application/json' \
  -H 'x-api-key: local-pro-key' \
  -d '{"id":"inbox-triage"}'
```

Key Skill API routes:

- `GET /api/v1/scenarios`
- `POST /api/v1/scenarios/run`
- `GET /api/v1/skills/templates`
- `GET /api/v1/skills`
- `POST /api/v1/skills/draft`
- `POST /api/v1/skills/review`
- `POST /api/v1/skills/approve`
- `POST /api/v1/skills/dry-run`
- `POST /api/v1/skills/evaluate`
- `POST /api/v1/state/reset`

MCP-style tool call:

```bash
curl -s http://127.0.0.1:4321/mcp \
  -H 'content-type: application/json' \
  -H 'x-api-key: local-pro-key' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

See [docs/PRODUCT_ARCHITECTURE.md](./docs/PRODUCT_ARCHITECTURE.md) for the product, subscription, MCP, and AI brain architecture.
