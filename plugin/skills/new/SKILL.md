---
name: new
description: Start a new project with pilot. Interviews the owner in depth, then creates the requirements, planning and quality docs and the project config.
disable-model-invocation: true
argument-hint: "[one-line idea]"
allowed-tools: Bash(node *scripts/pilot.js*), Bash(git status), Bash(git log *)
---

# /pilot:new — interview, then project docs

Owner's idea (may be empty): $ARGUMENTS

You run this in the main session. Subagents cannot ask the owner questions, so never fork the interview.

## 0. Check where you are

1. If `.pilot/manifest.json` exists, stop: this is already a pilot project. Suggest `/pilot:status`.
2. If the folder has source files or `git log` shows commits, stop and suggest `/pilot:adopt` instead. Say why in one sentence.

## 1. Interview

Read [questions.md](questions.md) and [project-types.md](project-types.md) now. Read [architecture.md](architecture.md) when you reach Phase 7b (Architecture and scale).

Rules:
- Ask in rounds of 2–4 multiple-choice questions with AskUserQuestion. "Other" is always available automatically.
- Write every question in plain language. Explain any technical term inside the question. Say what each option means in practice: cost, effort, what happens next.
- Depth is always full. Skip a phase only when it does not apply to this project type, never to save time.
- Never assume an answer the owner did not give. If the owner says "I don't know" or "you decide":
  - For the stack, run the `research-stack` workflow (Workflow tool, args: project type, constraints, candidates). If workflows are unavailable, dispatch `pilot:researcher` once per candidate (model: sonnet), then compare.
  - For anything else, research briefly and recommend.
  - Record each such choice as an assumption: what, why, source. You will write them to ASSUMPTIONS.md in step 4.
- If an answer is unclear or contradicts an earlier one, ask again. Do not guess.

## 2. Play back

Write a one-page summary in chat: vision, users, MVP scope and non-goals, the stories you will write, non-functional targets, stack, data and integrations, design status, AI parts if any, constraints, working agreement, and every assumption. Ask the owner to confirm or correct it. Repeat until they confirm. Nothing is written before this.

## 3. Plan the files

Save the answers to `.pilot/tmp/interview.json`:

```json
{ "project_name": "", "projectType": "web-app|mobile-app|script|os|ai-system|other", "stack": "web-ts|generic",
  "stack_summary": "", "profile": "pro|max", "hasAI": false, "design": "pending|not-applicable",
  "checks": { "fast": "", "full": "", "acceptance": "" }, "autonomy": "", "assumptions": [] }
```

- `stack` is `web-ts` only for TypeScript/JavaScript web projects; everything else is `generic`, with `checks` filled from the owner's answers.
- `profile` is `pro` unless the owner said they are on Max.

Then show what will be created:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" plan --answers .pilot/tmp/interview.json
```

Show the list to the owner and get one approval for the whole batch.

## 4. Create and fill

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" scaffold --answers .pilot/tmp/interview.json`. It never overwrites a file. Existing `CLAUDE.md` or `.claude/settings.json` get a `*.pilot-proposed.*` file instead.
2. Fill the docs from the interview. Replace every `{{placeholder}}` you have an answer for:
   - **PRD.md:** vision, users, scope, non-goals, stories `### US-001 …` with Gherkin acceptance criteria.
   - **SRS.md:** `### FR-001 …` in EARS syntax, each with `Traces to: US-…`; `### NFR-…` with measurable thresholds.
   - **ROADMAP.md:** Step 1 is always "Skeleton: toolchain, the three check commands, CI green". For web-ts it also adds the `coverage` script (Cobertura XML at coverage/cobertura-coverage.xml) and the `mutation` script that the CI template calls. Later steps are small, each listing its stories.
   - **TEST-STRATEGY.md, SECURITY.md, GLOSSARY.md, RUNBOOK.md** from the answers.
   - **AI docs** when `hasAI` is true.
   - **ASSUMPTIONS.md:** one `### A-001 …` per recorded assumption.
3. Dispatch `pilot:architect` (model: opus) with the paths of PRD.md and SRS.md, plus the owner's architecture and scale answers from Phase 7b: load tier, chosen style, patterns and alternatives considered. It drafts:
   - TECH-SPEC.md, including the Architecture style, Design patterns and Scalability and load sections
   - the ADRs: stack, and architecture (0002)
   - `.claude/rules/architecture.md`
   - the fitness-function task for roadmap Step 1
4. Run, in order:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" record` to fingerprint the filled files
   - `… trace --write`
   - `… check`

   Only warnings are acceptable at this point. Fix any error.
5. For each `*.pilot-proposed.*` file, show the owner the difference from their existing file and ask how to merge.

## 5. Report

Tell the owner, plainly:
- Which files were created.
- That every doc is **Draft** and needs their approval. Approved means they say so; then you change `Status: Draft` to `Status: Approved (date)`.
- Any open assumptions.
- That a "design system not created yet" reminder will appear until `/pilot:design` runs, unless design is not applicable.
- That `/pilot:step 1` starts the build.

Do not commit unless the owner asks.
