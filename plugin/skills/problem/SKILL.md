---
name: problem
description: Record a blocker or open decision as a GitHub Issue (label problem), or in docs/issues/ when the project keeps issues locally. Use when work is blocked or needs the owner's decision.
argument-hint: "<what is blocked>"
allowed-tools: Bash(node *scripts/pilot.js*), Bash(gh issue list *)
---

# /pilot:problem

Blocker: $ARGUMENTS

1. Write `.pilot/tmp/problem.md` with these sections:
   - What is blocked
   - What was tried, with evidence
   - Options, each with a trade-off
   - Decision needed from

   State facts only; mark guesses as guesses.
2. Run `gh issue create --label problem --title "<title>" --body-file .pilot/tmp/problem.md`. The owner approves the prompt.
   - If `issues` in `.pilot/manifest.json` is `local`, or gh fails, record it in `docs/issues/PENDING.md` as `LOCAL-###` instead (same format as `/pilot:bug`).
3. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" sync`. Add the problem to the "Open questions" section of HANDOFF.md.
4. Tell the owner what decision is needed, in one or two plain sentences.
