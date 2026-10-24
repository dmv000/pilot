---
name: doctor
description: Check the pilot install and this project's setup (Claude Code, Node, git, optional gh, manifest, hooks, size limits, CI), explain each failure, and offer fixes. Also switches the model profile.
disable-model-invocation: true
argument-hint: "[profile pro|max|saver] [--bench]"
allowed-tools: Bash(node *scripts/pilot.js*), Bash(claude --version), Bash(git --version), Bash(gh auth status)
---

# /pilot:doctor

Arguments: $ARGUMENTS

- If the arguments start with `profile`:
  1. Explain what changes. `pro` uses `opusplan` for the main session (Opus while planning, Sonnet while building). `max` uses Opus. `saver` uses Sonnet for the main session and the reviewers, and Haiku for searching, so usage limits last longer; it is on trial until the benchmark compares it with `pro`, and may catch fewer mistakes.
  2. Ask for approval.
  3. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" profile <pro|max|saver>`.
  4. Stop.
- Otherwise run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" doctor`, adding `--bench` when asked.

For each FAIL line, explain in one plain sentence what it means and what breaks because of it. Then offer the fix. A WARN line is optional: say what it would add, and do not push the fix. Apply a fix only after the owner approves it. Never install software or change system settings yourself; give the owner the command to run. Then run doctor again and show the result.
