---
name: status
description: Show pilot project progress, open bugs and problems, and open reminders. Use when the user asks where the project stands.
allowed-tools: Bash(node *scripts/pilot.js*), Bash(git status)
---

# /pilot:status

1. Find when the mirrors were last synced: `git log -1 --format=%cr -- docs/issues/BUGS.md`, or the file's modified time if it is not committed. If that is more than 24 hours ago, run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" sync` first. If gh is unavailable, say so and continue with the existing mirrors.
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
