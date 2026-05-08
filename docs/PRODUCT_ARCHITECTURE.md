# Product Architecture

## Product Shape

UserFlow Automation Copilot is designed as an agent-friendly automation platform for individuals and companies. The product watches consented user interaction metadata, understands repeated workflows, and proposes automations that can be reviewed, tested, and activated.

The local prototype now has five layers:

1. Web app: local UI for observation, suggestions, Workflow Skills, dry-runs, and run logs.
2. REST API: agent-readable endpoints for ingesting events, analyzing workflows, and managing Workflow Skills.
3. MCP endpoint: JSON-RPC tool surface for agents and external orchestrators.
4. AI brain: provider abstraction that uses the local heuristic brain today and can call external model APIs later.
5. Workflow Skill engine: first-class automation objects with permissions, policies, ROI, replay, dry-runs, and audit metadata.

## Automation Review Lifecycle

Automations do not start immediately when suggested. Suggestions become disabled Workflow Skill drafts first. The user sees:

- What the automation can do.
- What it cannot do.
- What data it uses.
- Safety checks.
- Editable name, trigger, action, and execution preview.
- ROI estimate and time-saved score.
- Scoped permissions.
- Blocking and warning policy checks.

Only after the user approves the reviewed draft does it become active. This is intentionally similar to a skill installation flow, but more transparent because every trigger and action is visible before activation.

## Agent-Friendly Design

Agents should not need to scrape the UI. They can use:

- `GET /api/v1/agent-manifest` to discover capabilities.
- `POST /api/v1/events` to send sanitized events.
- `POST /api/v1/brain/analyze` to ask the AI brain what is happening.
- `POST /mcp` for MCP-style tools.

The API returns structured JSON for all important product concepts: plans, subscriptions, suggestions, Workflow Skills, policies, dry-runs, activations, and audit events.

## MCP Tool Surface

- `plans.list`: returns subscription packages.
- `subscription.check`: returns current account and plan.
- `brain.analyze`: returns intent, suggestions, risk flags, and next actions.
- `suggestions.detect`: detects repeated workflows without extra narrative.
- `skills.templates`: returns installable Workflow Skill templates.
- `skills.draft`: creates a disabled Workflow Skill draft from a suggestion.
- `skills.review`: evaluates policies and dry-run readiness.
- `skills.approve`: approves a reviewed Workflow Skill if policies allow.
- `skills.run_dry`: returns a supervised dry-run preview.
- `skills.evaluate`: evaluates active Workflow Skills against recent events.
- `automations.create`: creates a disabled automation draft from a suggestion.
- `automations.approve`: approves a reviewed draft and makes it active.
- `automations.evaluate`: tests whether triggers would fire.
- `connectors.invoke`: paid-tier placeholder for external API execution.

## Subscription Strategy

### Individual Free

For testing, personal productivity, and viral adoption.

- Local observation.
- Heuristic suggestions.
- Limited automation drafts.

### Individual Pro

For solo professionals.

- AI-enhanced summaries.
- API access.
- Automation trigger tests.
- Higher event and automation limits.

### Company Team

For teams and startups.

- Team workspaces.
- Admin controls.
- Connector APIs.
- Policy-gated automations.
- Audit export.

### Enterprise

For larger companies.

- Private deployment.
- SSO and SCIM ready.
- Custom MCP tools.
- Data residency controls.
- Advanced policy engine.

## AI Brain

The AI brain accepts privacy-filtered event context rather than raw screen recordings or typed text.

Current prototype:

- Local heuristic provider.
- Structured intent classification.
- Suggestion enrichment.
- Risk flags.
- Next-best-action generation.

Production path:

- Add provider adapters for model APIs.
- Add tenant-level model policy.
- Add per-plan model access.
- Add evaluation harness for suggestion quality.
- Add human approval before any high-risk automation executes.

## Features Worth Adding Next

1. Browser extension for consented per-site tracking.
2. Desktop wrapper with OS permissions and visible recording state.
3. Connector marketplace for Gmail, Slack, Notion, Linear, CRMs, and internal APIs.
4. Team admin dashboard with automation approval workflows.
5. Policy engine to block sensitive workflows automatically.
6. Workflow replay simulator before enabling automations.
7. Analytics showing time saved, false positives, and accepted suggestions.
8. On-prem/enterprise deployment mode.
