---
name: sync
description: Rebuild docs/issues mirrors (BUGS, PROBLEMS, RESOLVED) from GitHub Issues and file pending offline items.
disable-model-invocation: true
allowed-tools: Bash(node *scripts/pilot.js*), Bash(gh issue list *)
---

# /pilot:sync

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" sync`. It only reads from GitHub.
2. If `docs/issues/PENDING.md` still has `LOCAL-###` rows, file each one:

   ```bash
   gh issue create --label <bug|problem> --title "<title>" --body-file .pilot/pending/LOCAL-###.md
   ```

   Each body keeps its `pilot-local-id: LOCAL-###` line. The owner approves each creation. Then run sync again; filed rows disappear from PENDING.md.
3. Report the counts: open bugs, open problems, resolved since the last sync, pending.
