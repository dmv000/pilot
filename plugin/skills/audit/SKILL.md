---
name: audit
description: Maintainer tool. Review every pilot component against current evidence (evals with and without the plugin, the Claude Code changelog, context cost) and propose keep, fix, merge or retire. Run in the pilot repository after a new model or Claude Code release.
disable-model-invocation: true
allowed-tools: Bash(node scripts/audit.js*), Bash(node scripts/record-evals.js*), Bash(npm run check:budget), Bash(claude --version), Bash(git log *)
---

# /pilot:audit — is each part of pilot still needed?

This runs in the **pilot repository**, not in a project built with pilot. If `REGISTRY.md` and `scripts/audit.js` are not in the current folder, say so and stop.

## 1. Gather evidence

1. Check the eval history in `docs/audits/eval-history.jsonl`. If the latest record is older than the installed Claude Code version (`claude --version`), say that the evals must be re-run first. They need WSL2 or Linux: `npm run eval`, then `node scripts/record-evals.js`. Ask the owner whether to continue with the old evidence; if they say no, stop here.
2. Run `node scripts/audit.js`. It applies the pre-registered rules to every REGISTRY row and writes `docs/audits/<date>-evidence.md`:
   - **keep:** the component measurably helps.
   - **retire-candidate:** the model now passes without it.
   - **fix:** the component does not do its job.
   - **enforcement:** a deterministic guard, proven by unit tests.
   - **no-evidence:** nothing measured it yet.
3. Read `bench/results/probes.jsonl` for the probe results that plugin eval cannot measure: the output style (E-04a–c), rules after compaction (E-03), assumptions (E-08). Apply the same rule: a probe where vanilla does as well as pilot makes its component a retire candidate.
4. Run `npm run check:budget` for the current always-on context cost.
5. Read the Claude Code changelog since the version recorded in the last audit (https://code.claude.com/docs/en/changelog). List every new feature that overlaps a pilot component, for example a native handoff, a native stop gate or a new hook field.

## 2. Decide, one component at a time

For each component, propose one action with the evidence in one sentence:
- **keep**
- **fix:** what is wrong, and which eval shows it
- **merge into <ID>:** two components doing one job
- **retire:** its "Retire when" condition is met, shown by a retire-candidate verdict and/or a native feature named in the changelog

Never retire on opinion alone. A retirement needs either the eval evidence (passes without it) or a named native feature, plus a check that the native feature covers the same failure mode.

Present the proposals to the owner as one table. Ask with AskUserQuestion which to accept (multi-select).

## 3. Record and ship

1. Write `docs/audits/<date>.md`, containing the three-line header, the evidence summary, the decisions, and the owner's choices.
2. Save the decisions as JSON and run `node scripts/audit.js record <file>`. It appends a line to `docs/audits/audit-history.jsonl`.
3. Accepted changes ship as a new kit version:
   - Edit or remove the components and update `REGISTRY.md`.
   - If project templates change, add a migration in `plugin/migrations/` with its golden test, so existing projects upgrade safely through `/pilot:migrate`.
   - Run `npm run check:release`.

   Do not commit or release without the owner's go-ahead.
