# Detailed Plan

## Goal

Create a local software prototype that notices how a user works from mouse and keyboard interaction patterns, understands repeated workflows, and asks whether it should create an automation for that work. If accepted, the software creates an automation with a trigger and runs the automation when the trigger pattern appears again.

## Safety and Privacy Boundaries

1. Consent first: tracking starts only when the user presses the start button.
2. Local only: all data stays in the browser memory and local storage.
3. Page scoped: the prototype observes only interactions inside this app, not global OS activity.
4. No raw text capture: typed characters are never stored. Keys are reduced to safe categories like `Enter`, `Tab`, arrows, or shortcut names.
5. Transparent controls: the user can pause tracking, clear data, inspect suggestions, and delete automations.
6. Simulated execution: automations show local actions rather than taking control of other apps.

## Product Flow

1. User opens the local app and presses `Start observing`.
2. The app records interaction metadata:
   - Mouse movement density and click targets.
   - Safe keyboard metadata.
   - Focus, form changes, and button/menu actions.
3. The inference engine summarizes the recent interaction stream:
   - Current intent, such as triage, reporting, editing, navigation, or admin work.
   - Repeated event sequences.
   - Frequent actions on the same target.
4. When a meaningful pattern appears, the app suggests:
   - What it thinks the user is doing.
   - The trigger that could activate the automation.
   - A simulated action plan.
5. User opens a review draft.
6. The app shows what the automation can do, cannot do, what data it uses, safety checks, and an execution preview.
7. User corrects the name, trigger, action, or steps.
8. User explicitly approves the reviewed draft.
9. The app enables the automation and watches for the trigger pattern.
10. When the pattern occurs again, the automation activates and logs its run.

## Architecture

### Browser UI

- `index.html`: application shell and demo workspace.
- `styles.css`: responsive, app-like interface.
- `src/app.js`: DOM wiring, capture lifecycle, UI rendering, local persistence.
- `src/core.js`: pure event sanitization, inference, suggestion, and trigger logic.
- `server.js`: local REST API, MCP endpoint, static hosting, and in-memory prototype store.
- `src/brain.js`: AI brain provider abstraction.
- `src/mcp.js`: MCP-style JSON-RPC tool handler.
- `src/subscriptions.js`: local subscription plan and API key model.
- `src/workflowSkills.js`: Workflow Skill schema, policy checks, ROI scoring, replay, approval, and dry-run logic.
- `src/scenarios.js`: built-in test scenarios for safe, reporting, and blocked workflows.

### Core Engine

- `sanitizeKeyEvent`: converts keyboard input into safe metadata.
- `normalizeEvent`: converts UI events into pattern tokens.
- `inferIntent`: scores recent events into intent labels.
- `detectSuggestions`: finds repeated sequences and high-frequency actions.
- `createAutomationFromSuggestion`: creates a trigger definition.
- `evaluateAutomations`: activates automations when trigger patterns match.

### Agent Platform Layer

- Agents discover the product through `GET /api/v1/agent-manifest`.
- Agents can call REST endpoints for events, suggestions, automations, and brain analysis.
- Agents can call MCP-style tools through `POST /mcp`.
- Subscription plans gate which MCP tools are available.
- The AI brain accepts privacy-filtered metadata and can be wired to external model APIs.
- Workflow Skills are the first-class automation format for humans and agents.
- Skills expose permissions, policies, replay, ROI, dry-run, and audit metadata.

## Test Plan

1. Unit test safe keyboard handling.
2. Unit test repeated sequence suggestion detection.
3. Unit test frequent action suggestion detection.
4. Unit test automation trigger activation.
5. Unit test AI brain summaries and subscription gating.
6. Unit test MCP tool calls.
7. Smoke test served files and API endpoints over local HTTP.

## Future Production Path

1. Add native app wrappers only with explicit OS permission prompts.
2. Replace heuristic detection with a local intent model that never sends raw events away.
3. Add app-specific connectors for approved tasks.
4. Add a review screen before any automation can act outside the app.
5. Add audit logs and one-click disable for every automation.
