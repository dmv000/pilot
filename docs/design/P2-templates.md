# P2 Templates: outlines of every project document

Purpose: the section outline of each document `/pilot:new` creates, the standard it follows, and which facts it owns. P4 turns these outlines into the files under `templates/docs/v1/`.
Read this when: you write or change a document template, or you need to know which doc owns a fact.
Related files: `docs/design/P2-spec.md` (sections 2.2 and 9.2), `docs/design/P1-evidence.md`.

Status: **Draft, part of the P2 gate.**

## Rules that apply to every template

1. **Same three-line header** on every doc, checked by `pilot-check`:
   ```markdown
   Purpose: <one sentence>
   Read this when: <one sentence>
   Related files: <paths>
   ```
2. **Status line** under the header: `Status: Draft | Approved (YYYY-MM-DD)`. A doc becomes Approved only after the owner says so in chat.
3. **One owner per fact.** Each ID is defined, as a heading, in exactly one doc. Other docs refer to it by ID and never restate it.

   | ID | Owner doc | Defined as |
   | --- | --- | --- |
   | `US-###` | PRD.md | `### US-001 <title>` |
   | `FR-###`, `NFR-###` | SRS.md | `### FR-001 <title>` |
   | `ADR-####` | `docs/decisions/####-<slug>.md` | the file itself |
   | `A-###` | ASSUMPTIONS.md | `### A-001 <title>` |
   | `STEP-##` | ROADMAP.md | `## Step 1 <title>` |
   | `T-###` (threat) | quality/SECURITY.md | `### T-001 <title>` |
4. **Stable headings** so agents can grep an ID and read about 20 lines instead of the whole file.
5. **Placeholders** in templates are `{{like_this}}`. `pilot-check` fails if any are left in an Approved doc.

---

## Requirements

### PRD.md — product requirements (owns: why, who, what)

Standards: jobs-to-be-done, INVEST stories, Gherkin acceptance criteria, MoSCoW.

1. Vision: one paragraph
2. Problem and why now
3. Users and personas: one short block each
4. Jobs to be done: "When…, I want to…, so I can…"
5. Top 3 user journeys
6. Scope: MVP / Later / **Non-goals** (explicit list)
7. User stories: `### US-001 <title>` with:
   - "As a… I want… so that…"
   - MoSCoW priority
   - Acceptance criteria in Gherkin (`Given / When / Then`); these become the acceptance tests
8. Success metrics: measurable, with target and how measured
9. Open questions

Project-type branch: for a script, CLI or OS project, sections 3–5 shrink to "Who runs this and how", and stories may be written as capabilities.

### SRS.md — software requirements (owns: numbered requirements)

Standards: ISO/IEC/IEEE 29148 structure, EARS syntax, ISO/IEC 25010 categories for NFRs.

1. Purpose and scope: links to PRD, does not restate it
2. Definitions: link to GLOSSARY.md
3. Functional requirements: `### FR-001 <title>` with:
   - EARS statement, e.g. "When `<trigger>`, the system shall `<response>`."
   - Traces to: `US-…`
   - Verified by: acceptance criterion reference
4. Non-functional requirements, grouped by ISO 25010: performance efficiency, reliability, security, usability and accessibility (WCAG 2.2 AA default), compatibility, maintainability, portability. Each `### NFR-001` has a measurable threshold and how it is checked.
5. Languages and RTL: from the interview; default "translation-ready text"
6. Architecture: **one paragraph and a link** to TECH-SPEC.md
7. Chosen stack: **one paragraph and a link** to TECH-SPEC.md and the stack ADR

### TECH-SPEC.md — technical specification (owns: how)

Standards: arc42 sections (trimmed), C4 diagrams as Mermaid.

1. Context and scope: C4 level 1 diagram
2. Constraints: budget, hosting, deadline, team; from the interview
3. Solution strategy: key decisions, each linking to an ADR
4. Building blocks: C4 level 2 (containers) and level 3 (components) where useful. One `### Module: <name>` section per module, with responsibility, public interface and the `FR-` IDs it serves
5. Data model: entities, fields, relations, invariants
6. APIs: endpoints or commands, inputs, outputs, errors. Link to an OpenAPI file when there is one
7. How each NFR is met: a table of `NFR-…` → mechanism → how it is tested
8. Cross-cutting concerns: auth, error handling, logging, i18n, accessibility
9. Fitness functions: automated checks that keep module boundaries (e.g. dependency rules in lint)
10. Risks and technical debt

### traceability.json — generated, never hand-edited

```json
{ "generated": "by pilot-check; do not edit",
  "stories": { "US-001": { "requirements": ["FR-001", "FR-002"] } },
  "requirements": { "FR-001": { "tests": ["tests/acceptance/login.test.ts:12"], "status": "covered" } } }
```

---

## Decisions

### decisions/0001-<slug>.md — ADR

Standard: MADR (short form).

1. Title, status (proposed, accepted, superseded by ADR-…), date
2. Context and problem
3. Options considered: each with pros and cons
4. Decision and reason
5. Consequences: positive, negative, follow-ups
6. Links: `FR-`, `NFR-` IDs and sources

---

## Planning

### ROADMAP.md

1. One `## Step N <title>` per step, each with:
   - Stories: `US-…`
   - Exit criteria: acceptance tests named, review passed
   - Depends on: other steps
2. Steps are small enough for one `/pilot:step` session.

### PROGRESS.md

1. Table: step, status (todo, in progress, done), review verdict file, date
2. Open reminders, derived by `/pilot:status`: design pending, docs still Draft
3. Lessons this step: links to LESSONS.md entries

### HANDOFF.md (≤ 8,000 characters)

1. Current step
2. Last result, with evidence (command and result)
3. Next action: one concrete thing
4. Open questions for the user
5. Files touched last session

### ASSUMPTIONS.md

One `### A-001 <title>` per assumption, each with: what was assumed, why, source (user answer, research link, or "unanswered question"), status (open, confirmed, replaced), and date.

---

## Issues (generated mirrors of GitHub Issues)

### BUGS.md and PROBLEMS.md

First line: `Generated by /pilot:sync from GitHub Issues. Do not edit.` Then a table: issue number, title, linked FR IDs, opened, owner.

### RESOLVED.md

Same header. Table: issue number, title, root cause, regression test path, closed date.

### PENDING.md

Items created while offline (`LOCAL-###`), waiting for the next `/pilot:sync`.

### .github/ISSUE_TEMPLATE/bug.yml and problem.yml

- **Bug fields:** summary (written by a human), steps to reproduce, expected, actual, linked IDs, environment. When closed: root cause, regression test.
- **Problem fields:** what is blocked, what was tried, options, decision needed from.

---

## Design (created by `/pilot:design`)

- **README.md** (from `/pilot:new`): `Status: pending. Run /pilot:design when ready.`
- **DESIGN.md:** principles, layout grid, typography, color usage, components (each with states), accessibility rules (WCAG 2.2 AA, focus, contrast, motion), RTL rules, and UI verification steps (screenshot compare, axe check).
- **tokens.json:** the source of truth for values: color, type, spacing, radius, shadow, motion. W3C design-tokens format. **[A]** final format choice in P4.
- **preview.html:** generated by `scripts/render-preview.js`. Never edited.

---

## AI product docs (only when the product contains AI)

Standards: OWASP Top 10 for LLM Applications, NIST AI RMF (Govern, Map, Measure, Manage).

| Doc | Sections |
| --- | --- |
| PERSONA.md | Role, audience, tone, the system prompt text, what the agent must always and never do |
| TOOLS.md | One row per tool: name, what it does, when to use it, when not to, permissions, rate limits, data it can touch |
| COGNITIVE-ARCHITECTURE.md | Flow diagram; memory and RAG design; reasoning strategy; multi-agent roles if any; failure handling |
| GUARDRAILS.md | Forbidden topics and actions; mapping to OWASP LLM Top 10 risks; input and output filters; escalation to a human |
| evals/cases.jsonl | One case per line: `{ "id", "input", "expected", "rubric_ref", "risk_ref" }` |
| evals/RUBRIC.md | Criteria for accuracy and safety, pass thresholds, how judged |

---

## Quality and operations

### quality/TEST-STRATEGY.md

1. Test levels: unit, integration, acceptance, end-to-end; what each covers
2. Tests first for logic, not pure UI (row 14)
3. Coverage rule: 80% on changed lines
4. Property-based tests: where they apply
5. Mutation testing: tool, schedule, baseline score
6. How tests reference IDs (`@req FR-012`)
7. Test data and fixtures

### quality/SECURITY.md

1. Threat model: `### T-001` threats, STRIDE category, mitigation, test
2. Auth model
3. Secrets handling: where secrets live, how they are loaded, never committed
4. OWASP ASVS level chosen and the checklist link
5. Dependencies policy

### RUNBOOK.md

How to run locally, environment variables (names and purpose, never values), deploy, roll back, logs, common failures.

### GLOSSARY.md

Domain terms with definitions; entity names used in code.

### LESSONS.md

One entry per mistake: what happened, root cause, fix, date. When the same root cause appears twice, `/pilot:step` proposes promoting it to a path-scoped rule in `.claude/rules/lessons/`.

---

## Project CLAUDE.md (≤ 80 lines target, ≤ 200 hard limit)

```markdown
# {{project_name}}

Purpose: instructions Claude reads every session in this project.
Read this when: every session (loaded automatically).
Related files: docs/planning/HANDOFF.md, .pilot/manifest.json

## Stack
{{one line per layer}}

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
| Design rules | docs/design/DESIGN.md (pending until /pilot:design) |

## Rules that are not enforced elsewhere
{{only items no hook or check covers; each line must earn its place}}
```

## Common rules copied into `.claude/rules/common/`

| File | `paths:` | Content |
| --- | --- | --- |
| `tests.md` | `tests/**`, `**/*.test.*`, `**/*.spec.*` | Tag tests with `@req`; never weaken an assertion to pass; skip only with `pilot-allow-skip: #issue` |
| `docs.md` | `docs/**` | Three-line header; define IDs only in the owner doc; point, never copy |

## web-ts pack, copied into `.claude/rules/web-ts/`

| File | `paths:` | Content |
| --- | --- | --- |
| `typescript.md` | `src/**/*.{ts,tsx}` | strict mode, no `any` without a comment, error handling pattern |
| `ui.md` | `src/**/*.tsx` | follow DESIGN.md when it exists; accessibility basics; translation-ready strings |
| `api.md` | `src/**/api/**`, `src/**/server/**` | input validation at the boundary, error shape, no secrets in logs |

Default `checks` for web-ts: `check:fast` = typecheck plus lint plus unit tests on changed files; `check` = typecheck, lint, all tests, knip, jscpd; `test:acceptance` = the acceptance project. Tool choice (eslint or oxlint, vitest) is made by the stack research and recorded in an ADR, not fixed by the kit.
