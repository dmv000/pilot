---
name: bug
description: Record a defect as a GitHub Issue (label bug), or in docs/issues/ when the project keeps issues locally, and refresh the local mirror. Use when a bug is found or reported, or instead of leaving a TODO.
argument-hint: "<short description>"
allowed-tools: Bash(node *scripts/pilot.js*), Bash(gh issue list *), Bash(gh issue view *)
---

# /pilot:bug

Description: $ARGUMENTS

Read `issues` in `.pilot/manifest.json`. `local` means the project does not use GitHub Issues: skip every `gh` command below and use the local record in step 4.

1. Gather the facts: steps to reproduce, expected vs actual, linked requirement IDs (grep SRS.md), environment, and evidence (command and output). Do not invent missing facts. Ask the owner, or write "unknown".
2. Check for duplicates: `gh issue list --label bug --state open --search "<keywords>"`, or, for local issues, the rows of `docs/issues/PENDING.md`. If one matches, add the new evidence to it instead (ask first).
3. Write the issue body to `.pilot/tmp/bug.md` using the sections of `.github/ISSUE_TEMPLATE/bug.yml`: Summary, Steps to reproduce, Expected, Actual, Linked requirement IDs.
4. Create it:

   ```bash
   gh issue create --label bug --title "<title>" --body-file .pilot/tmp/bug.md
   ```

   The owner sees an approval prompt for this command. That is intended; do not try to avoid it.
   - **Local record** (issues are `local`, or gh fails: offline, no remote, not logged in): add a row to `docs/issues/PENDING.md` as `| LOCAL-### | bug | <title> | <IDs> | .pilot/pending/LOCAL-###.md |`, and save the body to that file with the line `pilot-local-id: LOCAL-###`.
5. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" sync`.
6. Report the issue number (or LOCAL id) and link.

When a bug is fixed, the closing comment or edited body must fill "Root cause" and "Regression test". `/pilot:sync` copies them into RESOLVED.md. For a local issue, do it yourself: add "Root cause" and "Regression test" to its body file, remove its row from PENDING.md, and add a row `| LOCAL-### | <title> | <root cause> | <regression test> | <date> |` to the table under `## Resolved without GitHub` at the end of `docs/issues/RESOLVED.md` (create the heading and the table header `| ID | Title | Root cause | Regression test | Closed |` if missing).
