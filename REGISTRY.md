# pilot component registry

Purpose: one row for every component of the pilot kit, so a future model can decide what to keep, change, merge or delete.
Read this when: you add, change or remove a component, or run `/pilot:audit`.
Related files: `docs/design/P2-spec.md` (design), `docs/design/P1-evidence.md` (failure modes F01–F20), `docs/design/P3-verification.md` (checks, once written).

This file is not loaded into Claude's context. CI (`scripts/check-registry.js`) fails when a component file has no row here, or a row points to a file that doesn't exist.

**Status values:** `planned` (designed, not built), `built`, `verified` (its check passes and fails without it), `retired`.

All rows: added 2026-10-22, designed by Claude Opus 5.5, tuned for the `pro` profile (Opus 5.5 for planning and review, Sonnet 5.5 for building, Haiku 5.5 for search and bookkeeping).

## Skills

| ID | Path | Purpose | Prevents | Check | Status | Retire when |
| --- | --- | --- | --- | --- | --- | --- |
| SKL-01 | `skills/new/` | Interview, then project docs and config | F13, F17 | E-08, golden project install test | planned | Claude Code ships an equivalent project-setup interview and E-08 passes without this skill |
| SKL-02 | `skills/adopt/` | Map an existing codebase, draft docs, interview for gaps | F09, F17 | golden "existing project" test: no existing file overwritten | planned | Never by platform; merge into `new` if the two flows converge |
| SKL-03 | `skills/step/` | Run one roadmap step: tests first, implement, review, update docs | F01, F02, F12, F17, F20 | E-01, E-02, E-07, E-10 | planned | A native spec-driven build loop passes the same evals |
| SKL-04 | `skills/status/` | Progress, open issues and reminders | F05 | E-05 | planned | Merged into H01 output if no one invokes it (check `/skill-doctor`) |
| SKL-05 | `skills/bug/` | Draft and file a bug as a GitHub Issue | F01 (no silent TODOs) | T-sync, E-11 | planned | — |
| SKL-06 | `skills/problem/` | Draft and file a blocker as a GitHub Issue | F13 | T-sync | planned | Merge into `bug` with a type flag if usage is low |
| SKL-07 | `skills/sync/` | Regenerate issue mirrors from GitHub | R8 | T-sync (fixture `gh` output → expected mirrors) | planned | — |
| SKL-08 | `skills/handoff/` | Rewrite HANDOFF.md at the end of a session | F05 | E-05 | planned | Native session handoff covers it and E-05 passes without it |
| SKL-09 | `skills/design/` | Create design tokens, rules and preview | R9 | T-preview (render is deterministic) | planned | — |
| SKL-10 | `skills/doctor/` | Check the install, offer fixes, switch profile | F07, F08, F10 | golden doctor test on 3 OSes | planned | `claude plugin` gains equivalent health checks |

## Agents

| ID | Path | Purpose | Prevents | Check | Status | Retire when |
| --- | --- | --- | --- | --- | --- | --- |
| AGT-01 | `agents/architect.md` | Draft TECH-SPEC and ADRs in a fresh context | F17 | E-10 | planned | Main session does as well in E-10 (ablation) |
| AGT-02 | `agents/researcher.md` | Source-backed answer to one stack question | F13 | E-08, research-stack trial | planned | Built-in `/deep-research` covers it at lower cost |
| AGT-03 | `agents/explorer.md` | Cheap read-only code search on Haiku | F11, F12 | benchmark cost metric | planned | Built-in Explore runs on Haiku by default |
| AGT-04 | `agents/test-writer.md` | Failing acceptance tests from Gherkin, before code | F02 | E-02 | planned | — |
| AGT-05 | `agents/implementer.md` | Make acceptance tests pass, tests first | F12, F17 | E-07 | planned | — |
| AGT-06 | `agents/code-reviewer.md` | Fresh-context review against FR IDs | F20, F01 | E-12, E-01 | planned | Bundled `/code-review` passes E-12 with FR checking |
| AGT-07 | `agents/security-reviewer.md` | OWASP review of risky diffs | F06, F14 | E-06 | planned | — |
| AGT-08 | `agents/doc-keeper.md` | Update PROGRESS, HANDOFF, traceability on Haiku | F05 | E-05, C-trace | planned | Main session does it within the same cost |

## Hooks

| ID | Path | Purpose | Prevents | Check | Status | Retire when |
| --- | --- | --- | --- | --- | --- | --- |
| HK-01 | `hooks/scripts/session-start.js` | Inject HANDOFF and reminders at start, resume and compaction | F05 | T-H01, E-05 | planned | Native handoff loading passes E-05 |
| HK-02 | `hooks/scripts/guard-files.js` | Block protected files, acceptance-test edits by implementer, new skips, unreviewed "done" | F02, F06, F16, F20 | T-H02, E-02 | planned | — |
| HK-03 | `hooks/scripts/guard-bash.js` | Block secret reads, `--no-verify`, force-push, test exclusion | F02, F06 | T-H03, E-06 | planned | Native permission rules can express these patterns |
| HK-04 | `hooks/scripts/track-edits.js` | Mark the session dirty after edits | F01 | T-H04 | planned | Merged into HK-05 if Stop input gains an "edited files" field |
| HK-05 | `hooks/scripts/stop-gate.js` | Run fast checks before a turn may end with dirty code | F01, F02 | T-H05, E-01 | planned | The model passes E-01 at the same rate without it (ablation) |
| HK-06 | `hooks/scripts/ask-guard.js` | Catch unanswered questions, log the assumption, force a re-ask | F13 | T-H06 | planned | AskUserQuestion no longer auto-continues |
| HK-07 | `hooks/scripts/injection-scan.js` | Flag instruction-like text in fetched or untrusted content | F14 | T-H07, E-09 | planned | Native classifier passes E-09 without it |
| HK-LIB | `hooks/lib/` | Shared guard (inert without manifest), manifest, state, patterns | F08 | T-guard | planned | — |
| HK-CFG | `hooks/hooks.json` | Registers HK-01..07 in exec form with `node` | F07 | `validate`, `golden` CI on Windows | planned | — |

## Workflows

| ID | Path | Purpose | Prevents | Check | Status | Retire when |
| --- | --- | --- | --- | --- | --- | --- |
| WF-01 | `workflows/research-stack.js` | 3 parallel stack researchers and 1 cross-checker | F13 | trial run on the benchmark's stack task; cost recorded | planned | Bundled `/deep-research` gives the same quality cheaper |
| WF-02 | `workflows/verify-change.js` | Parallel correctness, security and test-adequacy review, then a filter | F01, F20 | E-12, E-01 | planned | Single reviewer scores the same on E-01 and E-12 |

## Output style, templates and project CI

| ID | Path | Purpose | Prevents | Check | Status | Retire when |
| --- | --- | --- | --- | --- | --- | --- |
| OS-01 | `output-styles/direct.md` | Evidence-first, no flattery, disagree with reasons | F04 | E-04a–c | planned | Default model behavior passes E-04 |
| TPL-DOCS | `templates/docs/v1/` | Project docs with one owner per fact | R10–R17 | C-trace, C-header, C-ids | planned | — |
| TPL-RULES | `templates/rules/` | Path-scoped rules for common and web-ts | F03 | E-03 | planned | — |
| TPL-SET | `templates/settings/` | Permission profile, model profile, output style | F06, F11 | T-settings (schema), E-06 | planned | — |
| TPL-GH | `templates/github/` | Project CI workflow and issue templates | F01, R8 | golden CI run on a fixture project | planned | — |
| TPL-SCHEMA | `templates/schemas/` | JSON Schemas for manifest, state, traceability, review verdicts | F09 | T-schema | planned | — |
| ACT-01 | `.github/actions/pilot-check/` | Traceability, ID ownership, restatement, headers, size limits | F03, F05, F17 | fixture projects with planted violations | planned | — |

## Kit maintenance

| ID | Path | Purpose | Prevents | Check | Status | Retire when |
| --- | --- | --- | --- | --- | --- | --- |
| MNT-01 | `scripts/check-registry.js` | Keep this file in sync with the tree | Registry drift | runs in kit CI | planned | — |
| MNT-02 | `scripts/check-budget.js` | Fail CI when always-on context exceeds 1,500 tokens | F11, F18 | runs in kit CI | planned | — |
| MNT-03 | `scripts/render-preview.js` | Deterministic design preview from tokens | R9 | T-preview | planned | — |
| MNT-04 | `.github/workflows/` (kit) | unit, validate, budget, registry, golden, release | F07, F10, F15 | itself | planned | — |
| MNT-05 | `migrations/` | Upgrade project files between template versions | F09 | golden upgrade tests | planned (ships with template v2) | — |
