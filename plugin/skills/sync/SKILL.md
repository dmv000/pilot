---
name: sync
description: Rebuild docs/issues mirrors from GitHub Issues, file pending items, or move local issues to GitHub.
disable-model-invocation: true
allowed-tools: Bash(node *scripts/pilot.js*), Bash(gh issue list *), Bash(gh auth status)
---

# /pilot:sync

If `issues` in `.pilot/manifest.json` is `local`, the project keeps its issues in `docs/issues/` without GitHub and there is nothing to sync. Report the open local bugs and problems from PENDING.md. Then offer, in one plain sentence, to move them to GitHub Issues; this needs the GitHub CLI (`gh`) logged in. Only if the owner agrees and `gh auth status` succeeds, change `issues` to `github` in the manifest (the owner approves the edit) and continue below. Items under "Resolved without GitHub" in RESOLVED.md stay where they are.

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" sync`. It only reads from GitHub.
2. If `docs/issues/PENDING.md` still has `LOCAL-###` rows, file each one:

   ```bash
   gh issue create --label <bug|problem> --title "<title>" --body-file .pilot/pending/LOCAL-###.md
   ```

   Each body keeps its `pilot-local-id: LOCAL-###` line. The owner approves each creation. Then run sync again; filed rows disappear from PENDING.md.
3. Report the counts: open bugs, open problems, resolved since the last sync, pending.
