---
name: adopt
description: Bring an existing codebase under pilot. Maps the code, drafts docs from what exists, then interviews the owner only for the gaps. Never overwrites existing files.
disable-model-invocation: true
allowed-tools: Bash(node *scripts/pilot.js*), Bash(git status), Bash(git log *), Bash(gh auth status)
---

# /pilot:adopt — existing project

## 1. Map the code

Dispatch `pilot:explorer` (model: haiku) to return a codebase map, then save its result to `.pilot/tmp/adopt-map.md` yourself. The map lists:
- entry points
- modules and their responsibilities
- the test framework and test locations
- the build, lint, typecheck and test commands (from package.json, Makefile, pyproject or CI files)
- external services and environment variable names (never values)
- the existing CI workflows

Every line names the file it came from.

## 2. Draft from code

From the map, prepare drafts of PRD.md, SRS.md and TECH-SPEC.md. Mark every derived statement `(derived from code: <path>)`. Requirements you infer get FR IDs. Behavior already covered by tests gets `Verified by:` pointing at those tests.

## 2b. Identify the current architecture

Using `../new/architecture.md`, name the style the code actually follows today (layered, clean/hexagonal, modular monolith, ...), the patterns in use, and where the code breaks its own boundaries (for example database calls inside UI components). Tell the owner in plain words, and ask whether to keep the current style or move toward another. Moving is a roadmap of small steps, never a rewrite.

## 3. Interview for the gaps only

Use the question bank in `../new/questions.md`, with the same plain-language rules as `/pilot:new`. Ask only what the code cannot tell you:
- vision and users
- non-goals
- the quality bar
- design status
- the working agreement
- the three check commands, if not found
- where to track bugs: GitHub Issues or files in docs/issues/ only (the last question of Phase 12; run `gh auth status` first to pick the default)

Then play back a summary and get confirmation.

## 4. Create

1. Save the answers to `.pilot/tmp/interview.json` (same shape as `/pilot:new`). Run `pilot.js plan` and show the owner the list. Existing files show as `skip` or `propose`.
2. After one approval, run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" scaffold --answers .pilot/tmp/interview.json`.
3. Write your drafts into the new docs. **Never** edit the owner's existing CLAUDE.md, `.claude/settings.json`, CI files or `.claude/rules/`. Show each `*.pilot-proposed.*` file as a diff and merge only what the owner approves.
4. Tag existing tests that verify a requirement with `@req FR-…` only if the owner approves editing test files.
5. Run `pilot.js record`, then `trace --write`, then `check`. Report the uncovered requirements as the first roadmap work.

## 5. Report

Report:
- what was found
- what was created
- what still needs the owner's approval
- which existing behavior has no tests

Do not commit unless asked.
