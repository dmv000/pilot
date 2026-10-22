# pilot component registry

Purpose: one row for every component of the pilot kit, so a future model can decide what to keep, change, merge or delete.
Read this when: you add, change or remove a component, or run `/pilot:audit`.
Related files: `docs/design/P2-spec.md` (design), `docs/design/P1-evidence.md` (failure modes F01–F20), `docs/design/P3-verification.md` (checks, once written).

This file is not loaded into Claude's context. Paths are relative to the repository root; `plugin/` is the folder Claude Code installs. CI (`scripts/check-registry.js`) fails when a component file has no row here, or a row points to a file that doesn't exist.

**Measured 2026-10-22:** always-on context **~688 tokens** (`claude plugin details pilot`); budget 1,500. Note: user-only skills still count about 30-50 tokens each in that figure.

**Status values:** `planned` (designed, not built), `built`, `verified` (its check passes and fails without it), `retired`.

All rows: added 2026-10-22, designed by Claude Opus 5.5, tuned for the `pro` profile (Opus 5.5 for planning and review, Sonnet 5.5 for building, Haiku 5.5 for search and bookkeeping).

## Skills

| ID | Path | Purpose | Prevents | Check | Status | Retire when |
| --- | --- | --- | --- | --- | --- | --- |
| SKL-01 | `plugin/skills/new/` | Interview (including architecture and scale, guided by architecture.md), then project docs and config | F13, F17 | E-08, golden project install test | built | Claude Code ships an equivalent project-setup interview and E-08 passes without this skill |
| SKL-02 | `plugin/skills/adopt/` | Map an existing codebase, draft docs, interview for gaps | F09, F17 | golden "existing project" test: no existing file overwritten | built | Never by platform; merge into `new` if the two flows converge |
| SKL-03 | `plugin/skills/step/` | Run one roadmap step: tests first, implement, review, update docs | F01, F02, F12, F17, F20 | E-01, E-02, E-07, E-10 | built | A native spec-driven build loop passes the same evals |
| SKL-04 | `plugin/skills/status/` | Progress, open issues and reminders | F05 | E-05 | built | Merged into H01 output if no one invokes it (check `/skill-doctor`) |
| SKL-05 | `plugin/skills/bug/` | Draft and file a bug as a GitHub Issue | F01 (no silent TODOs) | T-sync, E-11 | built | — |
| SKL-06 | `plugin/skills/problem/` | Draft and file a blocker as a GitHub Issue | F13 | T-sync | built | Merge into `bug` with a type flag if usage is low |
| SKL-07 | `plugin/skills/sync/` | Regenerate issue mirrors from GitHub | R8 | T-sync (fixture `gh` output → expected mirrors) | built | — |
| SKL-08 | `plugin/skills/handoff/` | Rewrite HANDOFF.md at the end of a session | F05 | E-05 | built | Native session handoff covers it and E-05 passes without it |
| SKL-09 | `plugin/skills/design/` | Create design tokens, rules and preview | R9 | T-preview (render is deterministic) | built | — |
| SKL-10 | `plugin/skills/doctor/` | Check the install, offer fixes, switch profile | F07, F08, F10 | golden doctor test on 3 OSes | built | `claude plugin` gains equivalent health checks |

## Agents

| ID | Path | Purpose | Prevents | Check | Status | Retire when |
| --- | --- | --- | --- | --- | --- | --- |
| AGT-01 | `plugin/agents/architect.md` | Draft TECH-SPEC and ADRs in a fresh context | F17 | E-10 | built | Main session does as well in E-10 (ablation) |
| AGT-02 | `plugin/agents/researcher.md` | Source-backed answer to one stack question | F13 | E-08, research-stack trial | built | Built-in `/deep-research` covers it at lower cost |
| AGT-03 | `plugin/agents/explorer.md` | Cheap read-only code search on Haiku | F11, F12 | benchmark cost metric | built | Built-in Explore runs on Haiku by default |
| AGT-04 | `plugin/agents/test-writer.md` | Failing acceptance tests from Gherkin, before code | F02 | E-02 | built | — |
| AGT-05 | `plugin/agents/implementer.md` | Make acceptance tests pass, tests first | F12, F17 | E-07 | built | — |
| AGT-06 | `plugin/agents/code-reviewer.md` | Fresh-context review against FR IDs | F20, F01 | E-12, E-01 | built | Bundled `/code-review` passes E-12 with FR checking |
| AGT-07 | `plugin/agents/security-reviewer.md` | OWASP review of risky diffs | F06, F14 | E-06 | built | — |
| AGT-08 | `plugin/agents/doc-keeper.md` | Update PROGRESS, HANDOFF, traceability on Haiku | F05 | E-05, C-trace | built | Main session does it within the same cost |
| AGT-09 | `plugin/agents/design-reviewer.md` | Fresh-context review of UI changes against DESIGN.md, tokens and WCAG 2.2 AA | R9, F20 | T-design (design-check it runs); E-12 pattern | built | Native review checks design systems with the same result |

## Hooks

| ID | Path | Purpose | Prevents | Check | Status | Retire when |
| --- | --- | --- | --- | --- | --- | --- |
| HK-01 | `plugin/hooks/scripts/session-start.js` | Inject HANDOFF and reminders at start, resume and compaction | F05 | T-H01, E-05 | built | Native handoff loading passes E-05 |
| HK-02 | `plugin/hooks/scripts/guard-files.js` | Block protected files, acceptance-test edits by implementer, new skips, unreviewed "done" | F02, F06, F16, F20 | T-H02, E-02 | built | — |
| HK-03 | `plugin/hooks/scripts/guard-bash.js` | Block secret reads, `--no-verify`, force-push, test exclusion | F02, F06 | T-H03, E-06 | built | Native permission rules can express these patterns |
| HK-04 | `plugin/hooks/scripts/track-edits.js` | Mark the session dirty after edits | F01 | T-H04 | built | Merged into HK-05 if Stop input gains an "edited files" field |
| HK-05 | `plugin/hooks/scripts/stop-gate.js` | Run fast checks before a turn may end with dirty code | F01, F02 | T-H05, E-01 | built | The model passes E-01 at the same rate without it (ablation) |
| HK-06 | `plugin/hooks/scripts/ask-guard.js` | Catch unanswered questions, log the assumption, force a re-ask | F13 | T-H06 | built | AskUserQuestion no longer auto-continues |
| HK-07 | `plugin/hooks/scripts/injection-scan.js` | Flag instruction-like text in fetched or untrusted content | F14 | T-H07, E-09 | built | Native classifier passes E-09 without it |
| HK-LIB | `plugin/hooks/lib/` | Shared guard (inert without manifest), manifest, state, patterns | F08 | T-guard | built | — |
| HK-CFG | `plugin/hooks/hooks.json` | Registers HK-01..07 in exec form with `node` | F07 | `validate`, `golden` CI on Windows | built | — |

## Workflows

| ID | Path | Purpose | Prevents | Check | Status | Retire when |
| --- | --- | --- | --- | --- | --- | --- |
| WF-01 | `plugin/workflows/research-stack.js` | 3 parallel stack researchers and 1 cross-checker | F13 | trial run on the benchmark's stack task; cost recorded | built | Bundled `/deep-research` gives the same quality cheaper |
| WF-02 | `plugin/workflows/verify-change.js` | Parallel correctness, security and test-adequacy review, then a filter | F01, F20 | E-12, E-01 | built | Single reviewer scores the same on E-01 and E-12 |

## Output style, templates and project CI

| ID | Path | Purpose | Prevents | Check | Status | Retire when |
| --- | --- | --- | --- | --- | --- | --- |
| OS-01 | `plugin/output-styles/direct.md` | Evidence-first, no flattery, disagree with reasons | F04 | E-04a–c | built | Default model behavior passes E-04 |
| TPL-DOCS | `plugin/templates/docs/v1/` | Project docs with one owner per fact | R10–R17 | C-trace, C-header, C-ids | built | — |
| TPL-RULES | `plugin/templates/rules/` | Path-scoped rules for common and web-ts | F03 | E-03 | built | — |
| TPL-SET | `plugin/templates/settings/` | Permission profile, model profile, output style | F06, F11 | T-settings (schema), E-06 | built | — |
| TPL-GH | `plugin/templates/github/` | Project CI workflow and issue templates | F01, R8 | golden CI run on a fixture project | built | — |
| TPL-SCHEMA | `plugin/templates/schemas/` | JSON Schemas for manifest, state, traceability, review verdicts | F09 | T-schema | built | — |
| TPL-DESIGN | `plugin/templates/design/` | Starter DESIGN.md (rule sections) and tokens.json (W3C tokens with WCAG-passing contrast pairs) | R9 | T-design | built | — |
| MNT-09 | `plugin/scripts/lib/design.js` | design-check: token structure, WCAG contrast of declared pairs, required sections, hard-coded colors; also part of pilot-check | R9 | T-design | built | — |
| ACT-01 | `.github/actions/pilot-check/` | Traceability, ID ownership, restatement, headers, size limits | F03, F05, F17 | fixture projects with planted violations | built | — |

## Kit maintenance

| ID | Path | Purpose | Prevents | Check | Status | Retire when |
| --- | --- | --- | --- | --- | --- | --- |
| MNT-01 | `scripts/check-registry.js` | Keep this file in sync with the tree | Registry drift | runs in kit CI | built | — |
| MNT-02 | `scripts/check-budget.js` | Fail CI when always-on context exceeds 1,500 tokens | F11, F18 | runs in kit CI | built | — |
| MNT-03 | `plugin/scripts/lib/preview.js` | Deterministic design preview from tokens (run through `pilot.js preview`) | R9 | T-preview | built | — |
| MNT-04 | `.github/workflows/` (kit) | unit (3 OSes), registry, no-deps, validate and install (3 OSes), release | F07, F10, F15 | itself | built | — |
| MNT-06 | `plugin/scripts/pilot.js` | Helper CLI for deterministic work: plan, scaffold, record, trace, check, sync, review, preview, profile, doctor | F01, F09, F20, R8 | `tests/scripts/pilot-cli.test.js` | built | — |
| MNT-07 | `plugin/scripts/lib/` | Shared code for the CLI and the pilot-check Action (trace, sync, scaffold, schema, preview) | F03, F09 | `tests/scripts/pilot-cli.test.js` | built | — |
| MNT-08 | `release-please-config.json` | Bumps plugin.json and package.json versions on release | F10 | C-release | built | — |
| MNT-05 | `plugin/migrations/` | Migration files, one per template version change (none yet: v1 is current) | F09 | C-migrate (`tests/scripts/migrate.test.js`) | built | — |
| SKL-11 | `plugin/skills/migrate/` | Upgrade project files after a kit update: automatic for untouched files, approval for edited ones, backups, no deletes | F09, R2 | C-migrate (`tests/scripts/migrate.test.js`) | built | Claude Code gains a native, tested plugin-template migration |
| SKL-12 | `plugin/skills/audit/` | Maintainer tool: re-check every component with the current model and Claude Code; propose keep, fix, merge or retire with evidence | R6 | T-audit (`tests/scripts/audit.test.js`) | built | — |
| MNT-10 | `plugin/scripts/lib/migrate.js` | Migration runner: plan, line diffs, apply, chain, idempotency | F09 | C-migrate | built | — |
| MNT-11 | `scripts/audit.js` | Audit evidence: applies the pre-registered rules to REGISTRY rows and eval history; writes the audit history | R6 | T-audit | built | — |
| MNT-12 | `scripts/record-evals.js` | Appends each eval run's summary to docs/audits/eval-history.jsonl (used by audit and the release rule) | R6, F10 | T-audit | built | — |
