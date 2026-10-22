---
name: status
description: Show pilot project progress, open bugs and problems, and open reminders. Use when the user asks where the project stands.
allowed-tools: Bash(node *scripts/pilot.js*), Bash(git status)
---

# /pilot:status

1. If `docs/issues/BUGS.md` is older than 24 hours, run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" sync` first. If gh is unavailable, say so and continue with the existing mirrors.
2. Read `docs/planning/PROGRESS.md`, `docs/planning/HANDOFF.md`, `docs/issues/BUGS.md`, `docs/issues/PROBLEMS.md`, `docs/issues/PENDING.md` and `.pilot/manifest.json`.
3. Report in this order, short and plain:
   - **Steps:** done / in progress / to do, with the next step.
   - **Open bugs and problems:** count and titles.
   - **Reminders:**
     - design pending (when `design` is `pending` and `docs/design/DESIGN.md` is missing)
     - docs still Draft
     - pending issues not yet filed
     - code changed but not yet verified (`.pilot/state.json` dirty)
     - open assumptions in ASSUMPTIONS.md
   - **Next action:** one sentence.
