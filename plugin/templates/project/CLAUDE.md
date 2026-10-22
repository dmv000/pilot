# {{project_name}}

Purpose: instructions Claude reads every session in this project.
Read this when: every session (loaded automatically).
Related files: docs/planning/HANDOFF.md, .pilot/manifest.json

## Stack

{{stack_summary}}

## Commands

- Fast checks: `{{checks.fast}}`
- Full checks: `{{checks.full}}`
- Acceptance tests: `{{checks.acceptance}}`

## What to read for what

| Need | Read |
| --- | --- |
| Why we build this, for whom | docs/requirements/PRD.md |
| A requirement by ID | grep the ID in docs/requirements/SRS.md |
| How a module works | docs/requirements/TECH-SPEC.md, section "Module: <name>" |
| Why a decision was made | docs/decisions/ |
| What to do next | docs/planning/HANDOFF.md, then /pilot:step |
| Design rules | docs/design/ (pending until /pilot:design) |

## Working agreement

- Autonomy: {{autonomy}}
- Build loop: /pilot:step <n>. Bugs: /pilot:bug. Blockers: /pilot:problem.

## Rules not enforced elsewhere

- (Add a line only when a mistake repeats and no hook or check can catch it.)
