---
name: migrate
description: Upgrade this project's pilot-generated files (docs, settings, rules, CI) to the newest template version after a kit update, without losing the owner's edits.
disable-model-invocation: true
allowed-tools: Bash(node *scripts/pilot.js*), Bash(git status), Bash(git diff *)
---

# /pilot:migrate — safe upgrade after a kit update

Updating the kit (`claude plugin update pilot@pilot`) changes pilot's commands, agents and hooks right away. It never touches this project's files. This command brings the project's own files up to the newest templates.

## 1. Plan (writes nothing)

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" migrate --plan`.

If it says the templates are up to date, tell the owner and stop.

## 2. Explain the plan in plain language

- **Updated automatically:** files pilot wrote that the owner never edited. These change without asking.
- **New files:** added by the newer template.
- **Need your approval:** files the owner edited, or files pilot did not write. Show each diff, explain in one sentence what changes and why, then ask with AskUserQuestion which to approve (multi-select, one option per file). Recommend approving only changes that do not undo the owner's own edits.

## 3. Check for uncommitted work

Run `git status`. If there are uncommitted changes, suggest committing them first, so the migration is easy to review and undo. Continue only if the owner agrees.

## 4. Apply

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" migrate --apply --approve <comma-separated approved paths>
```

Leave out `--approve` when nothing was approved. The runner:
- backs up every file it changes to `.pilot/backups/<time>/`
- never deletes a file
- records declined changes in the manifest, so they are not asked about again

## 5. Verify and report

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" check`, then the project's `checks.fast`.
2. Report:
   - which files changed
   - which were declined
   - where the backups are
   - the check results

   To undo one file, copy it back from the backup folder.
3. Do not commit unless the owner asks.
