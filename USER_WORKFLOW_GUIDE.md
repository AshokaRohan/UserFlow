# User Workflow Guide

This guide explains how to use the local UserFlow Automation Copilot prototype and how to get the best results from it.

## 1. What This Software Does

UserFlow watches consented interaction metadata, detects repeated workflows, and converts them into reviewable Workflow Skills.

A Workflow Skill is a safer, more transparent version of an automation. It includes:

- The goal of the workflow.
- The trigger pattern.
- The exact steps it plans to perform.
- The data it uses.
- The permissions it needs.
- Policy checks.
- ROI and time-saved estimate.
- A dry-run preview.
- Human approval before activation.

The lifecycle is:

`Observe work -> Detect pattern -> Suggest Skill -> Review Skill -> Correct Skill -> Approve Skill -> Dry-run -> Activate`

## 2. Start The App

From the project folder:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4321
```

The app runs locally. No cloud account is required for this prototype.

## 3. First-Time Testing Flow

Use this flow to confirm the system is working end to end.

1. Open the app.
2. Click `Clear` to reset the browser-side session.
3. Click `Start observing`.
4. Click `Run demo scenario`.
5. Wait for activity to appear in the Activity Stream.
6. Look at the `Suggestions` panel.
7. Click `Review Skill`.
8. Read the review screen.
9. Click `Preview dry-run`.
10. Edit the Skill if needed.
11. Check the approval checkbox.
12. Click `Approve and start`.
13. The approved Skill appears in the `Workflow Skills` panel.
14. Click `Dry-run` on the approved Skill to test the planned execution.

## 4. How To Create A Good Workflow Skill

The system works best when a task is repeated clearly.

Good examples:

- Filtering an inbox, assigning a teammate, and marking a case ready.
- Selecting report filters and exporting the same report.
- Updating a CRM lead status after reviewing a lead.
- Preparing a draft message from repeated support triage steps.

Poor examples:

- One-off creative work.
- Tasks where every run is completely different.
- High-risk actions like deleting records, sending money, or changing permissions.
- Anything involving passwords, secrets, OTPs, or payment details.

## 5. Understanding The Review Screen

When you click `Review Skill`, the app shows a Skill draft.

### What It Can Do

This explains the allowed behavior, such as detecting the trigger, preparing steps, and creating a dry-run.

### What It Cannot Do

This is the safety boundary. The Skill should not read raw typed text, bypass policies, or run destructive actions without approval.

### Data It Uses

The prototype uses metadata such as:

- Clicked target labels.
- Changed control labels.
- Safe keyboard metadata.
- Timing and workflow sequence.

It does not store raw typed characters.

### Permissions

Permissions describe what the Skill is allowed to do. Example:

```text
observe.workflow_metadata (read)
skill.dry_run (execute)
crm.update_status (draft)
```

In production, these should map to real connector scopes like Gmail, Slack, CRM, browser, or internal APIs.

### Policies

Policies decide whether a Skill can be approved.

Policy severities:

- `INFO`: safe enough to review and approve.
- `WARN`: allowed, but should require confirmation.
- `BLOCK`: cannot activate without admin review.

Examples of blocked patterns:

- Passwords or secrets.
- Deleting records.
- Billing changes.
- Refunds.
- Admin permission changes.

### ROI Estimate

The ROI estimate helps you understand whether the Skill is worth building.

It includes:

- Repetitions observed.
- Estimated time saved per month.
- Value label: Emerging, Medium, or High ROI.

## 6. Correcting A Skill Before Approval

Before approving, edit:

- Skill name.
- Trigger.
- Goal/action.
- Execution preview steps.

Use clear names:

Good:

```text
Customer Inbox Triage Skill
Weekly Report Export Skill
CRM Lead Status Update Skill
```

Weak:

```text
Repeated workflow
Automation 1
Click task
```

The better the name and trigger, the easier it will be for agents and teammates to understand it later.

## 7. Dry-Run Best Practice

Do not treat approval as immediate full automation.

Recommended path:

1. Approve the Skill.
2. Run dry-run once.
3. Confirm the planned steps are correct.
4. Repeat the trigger pattern again.
5. Run another dry-run.
6. Only after repeated successful dry-runs should you allow auto-run behavior in a production version.

The current prototype keeps execution simulated and supervised.

## 8. Built-In Test Scenarios

The backend includes three scenarios.

### Inbox Triage

```text
inbox-triage
```

Use this to test a safe customer operations workflow.

Expected result:

- Suggestion appears.
- Skill draft is created.
- Approval succeeds.
- Dry-run becomes ready.
- Skill can activate when the trigger repeats.

### Report Export

```text
report-export
```

Use this to test report/export style workflows.

Expected result:

- Skill includes report/export permissions.
- ROI estimate appears.
- Dry-run preview shows report steps.

### Sensitive Blocked

```text
sensitive-blocked
```

Use this to test policy blocking.

Expected result:

- Skill draft is created.
- Approval is blocked.
- Status becomes `needs_admin_review`.
- Blocking policies include sensitive/destructive action checks.

## 9. API Testing

Health check:

```bash
curl -s http://127.0.0.1:4321/api/v1/health
```

List scenarios:

```bash
curl -s http://127.0.0.1:4321/api/v1/scenarios
```

Run a scenario:

```bash
curl -s http://127.0.0.1:4321/api/v1/scenarios/run \
  -H 'content-type: application/json' \
  -H 'x-api-key: local-pro-key' \
  -d '{"id":"inbox-triage"}'
```

Get suggestions:

```bash
curl -s http://127.0.0.1:4321/api/v1/suggestions \
  -H 'x-api-key: local-pro-key'
```

Reset local backend state:

```bash
curl -s http://127.0.0.1:4321/api/v1/state/reset \
  -H 'content-type: application/json' \
  -H 'x-api-key: local-pro-key' \
  -d '{}'
```

## 10. MCP Usage

MCP endpoint:

```text
POST /mcp
```

List available tools:

```bash
curl -s http://127.0.0.1:4321/mcp \
  -H 'content-type: application/json' \
  -H 'x-api-key: local-pro-key' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Important MCP tools:

- `brain.analyze`
- `suggestions.detect`
- `skills.templates`
- `skills.draft`
- `skills.review`
- `skills.approve`
- `skills.run_dry`
- `skills.evaluate`

Use MCP when an AI agent should interact with the system without scraping the UI.

## 11. How To Get The Best Results

Use clear, repeated workflows.

Repeat the same task at least twice before expecting a suggestion.

Keep tasks scoped.

Better:

```text
When I filter high-priority support cases and assign a teammate, prepare a triage checklist.
```

Worse:

```text
Automate all customer support.
```

Prefer draft actions over direct actions.

Better:

```text
Draft Slack message
Prepare CRM update
Create report export checklist
```

Riskier:

```text
Send Slack message automatically
Update CRM automatically
Delete old records automatically
```

Review policies carefully.

If a Skill is blocked, do not try to bypass it. Split the workflow into a safer assistive step first.

## 12. Suggested Product Workflow For Companies

For a company pilot, use this process:

1. Pick one department, such as support, sales ops, finance ops, or recruiting.
2. Choose 3 repetitive workflows.
3. Ask users to run each workflow 3-5 times.
4. Generate Workflow Skill drafts.
5. Review ROI and policy risk.
6. Approve only low-risk skills.
7. Run supervised dry-runs for one week.
8. Share accepted Skills with the team.
9. Add admin approval for any Skill that sends data or modifies systems.
10. Track time saved and false positives.

## 13. What To Build Next

Highest-value next improvements:

- Real browser extension capture.
- Desktop wrapper with explicit OS permissions.
- Connector scopes for Gmail, Slack, Notion, Linear, CRM, and internal APIs.
- Team Skill library.
- Admin approval queue.
- Skill version history.
- Real model API provider for the AI brain.
- Visual workflow replay timeline.
- Auto-run only after multiple successful dry-runs.

## 14. Mental Model

Do not think of this as a simple macro recorder.

Think of it as:

```text
Task mining + AI reasoning + human review + Skill creation + MCP/API execution
```

The product should feel like an AI teammate that says:

```text
I noticed this repeated workflow. I can turn it into a Skill. Here is exactly what I will do. Please correct me before I start.
```

