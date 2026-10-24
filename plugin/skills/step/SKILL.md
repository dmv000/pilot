---
name: step
description: Execute one pilot roadmap step end to end (acceptance tests first, implement, verify, review, update progress). Use when the user says "start step N", "next step" or "continue".
argument-hint: "<step number>"
allowed-tools: Bash(node *scripts/pilot.js*), Bash(git diff *), Bash(git status), Bash(git log *), Bash(git rev-parse *)
---

# /pilot:step — one roadmap step

Step requested: $ARGUMENTS (if empty, use the "Next action" step in HANDOFF.md).

You are the orchestrator. You do not write production code or tests yourself. You dispatch agents with exact paths and IDs, because they start with a fresh context and never see this conversation. Use the delegation templates in [delegation.md](delegation.md).

## Models

Read `profile` from `.pilot/manifest.json`. Pass `model` on every Agent call:

| Agent | pro | max | saver |
| --- | --- | --- | --- |
| pilot:explorer, pilot:doc-keeper | haiku | haiku | haiku |
| pilot:researcher, pilot:test-writer, pilot:implementer | sonnet | sonnet | sonnet |
| pilot:code-reviewer, pilot:security-reviewer, pilot:design-reviewer | opus | opus | sonnet |
| pilot:architect | opus | opus | opus |

The verify-change workflow takes the reviewers' model as `reviewModel`: `sonnet` for saver, otherwise `opus`.

Never use fable unless the owner approves it after two failed rounds. It bills usage credits.

## 1. Locate

1. Read `docs/planning/HANDOFF.md`. If step N is not the next step, stop and ask the owner.
   Record the starting commit with `git rev-parse HEAD`. This is `diffBase`: the review compares the working tree against it (`git diff <diffBase>`), so uncommitted work is included.
2. Read the `## Step N` section of `docs/planning/ROADMAP.md`. Collect its story IDs.
3. For each story, grep `docs/requirements/SRS.md` for FR/NFR sections whose `Traces to:` names it, and read only those sections. Grep PRD.md for the story heading and read its Gherkin.
4. Read the TECH-SPEC.md `Module:` sections the FRs name, and the ADRs they link.
5. If any doc you need is still `Status: Draft`, tell the owner and ask whether to proceed.

## 2. Acceptance tests first

Dispatch `pilot:test-writer` (template A). It writes failing tests under `tests/acceptance/`, each tagged `@req FR-…`. It must show that they fail for the right reason: the feature is missing, not a typo.

**Exception:** Step 1, "Skeleton", has no stories. The implementer sets up the toolchain and the three check commands, and Step 1's acceptance is that `checks.fast`, `checks.full` and `checks.acceptance` all run and exit 0.

## 3. Implement

Dispatch `pilot:implementer` once per story (template B), sequentially. It may not edit `tests/acceptance/**`; a hook blocks it. If it reports that an acceptance test is wrong, check the spec yourself. If the test really is wrong, ask the owner before anything changes it.

## 4. Verify and review

1. The change under review is `git diff <diffBase>` (committed and uncommitted work since the step started).
2. Run the `verify-change` workflow with the Workflow tool (args: `{ step, frIds, diffBase, risky, ui, reviewModel, pluginRoot: "${CLAUDE_PLUGIN_ROOT}" }`).
   - Set `risky` true when the diff touches auth, input handling, secrets, payments or dependencies.
   - Set `ui` true when the diff touches user-facing UI files (.tsx, .jsx, .vue, .svelte, .css, .html) and `docs/design/DESIGN.md` exists.
   - If workflows are unavailable: dispatch `pilot:code-reviewer` (template C), plus `pilot:security-reviewer` when risky, plus `pilot:design-reviewer` (template E) when ui. Combine their findings yourself, keeping only findings that affect correctness, accessibility, the design rules or a stated requirement.
   - If the diff touches UI but the design is still pending: say so in the report, and apply the accessibility defaults (WCAG 2.2 AA) in the review.
3. Save the verdict as `.pilot/tmp/verdict-step-N.json`, using `{ "verdict": "pass|fail", "requirements": ["FR-…"], "findings": [{ "severity": "major|minor", "summary": "…", "file": "…", "requirement": "FR-…" }] }`. Copy the reviewers' result faithfully; never upgrade a fail to a pass.
4. Record it. This runs the acceptance tests itself and writes `.pilot/reviews/step-N.json`:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" review --step N --verdict .pilot/tmp/verdict-step-N.json
   ```

## 5. Close or loop

**If `canMarkDone` is true:**
- Dispatch `pilot:doc-keeper` (template D) to update PROGRESS.md (step N → done), HANDOFF.md and LESSONS.md.
- Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" trace --write` and then `check`.

**Otherwise:**
- Send the findings and the failing lines (not the full output) back to `pilot:implementer` for one more round. Then repeat step 4.
- After **two** failed rounds, stop. File the remaining findings with `/pilot:bug`, update HANDOFF.md, and tell the owner what is blocked and why.

Either way, if a bug's root cause matches an existing LESSONS.md entry, propose a path-scoped rule in `.claude/rules/lessons/` to the owner.

## 6. Report

State what was built, with evidence:
- the acceptance exit code
- the review verdict
- which FRs are now covered
- what failed or was skipped

Never say "done" without the recorded review file showing exit code 0 and verdict pass.
