# P1 Evidence: sources, failure modes, hypothesis verdicts

Purpose: the evidence base for the `pilot` kit. It lists what was read, which failures the kit must prevent, and which section 6 hypotheses survived contact with the sources.
Read this when: you are writing or reviewing the P2 spec, or you want the reason behind a design choice.
Related files: `docs/design/P0-kickoff.md` (decisions), `Claude Code Project Kit — Master Prompt.md` (sections 4–6), `docs/design/P2-spec.md` (next, not written yet).

Status: **Draft, waiting for owner review at the P1 gate.** Research date: 2026-10-22. Claude Code on this machine: 2.1.300. The docs changelog shows 2.1.308 as the latest release.

Marking convention: **[V:Sn]** means verified against source Sn in the source list. **[A]** means assumption, not yet checked. Every [A] has a check named for P2 or P4.

---

## Answers recorded 2026-10-22

| Question | Decision |
| --- | --- |
| 1. Install path | **Drop the `npx` wrapper.** Install is `claude plugin install pilot --marketplace <owner>/pilot`. `/pilot:doctor` does the preflight checks |
| 2. Benchmark arms | **Two arms:** plain Claude Code vs pilot. Superpowers is not measured |
| 3. Benchmark host | **WSL2 on the owner's PC,** billed to the Pro plan. P4 includes the WSL2 setup steps (bubblewrap, socat) |
| 4. Dynamic workflows | **Owner will enable them.** `/pilot:research-stack` runs as a workflow under 5 agents; the subagent fallback stays for users who leave them off |
| 5. GitHub owner | Still open. Needed before publishing in P4 |

## Questions for the owner (answer before P2)

1. **Install path.** Claude Code now installs a marketplace plugin in one shell command: `claude plugin install pilot --marketplace <owner>/pilot` [V:S6]. That already meets requirement 1. Should v1 **drop the `npx` wrapper**, with `/pilot:doctor` doing the checks the wrapper would have done? My recommendation is to drop it, because a file that prevents no failure is deleted (section 3). The npm name `pilot` is also taken. `pilot-kit` was free on 2026-10-22.
2. **Superpowers.** The evidence says borrow, don't depend, for v1 (see 6.9 below). Should the benchmark include Superpowers as a third arm? That would compare vanilla, Superpowers and pilot. A third arm costs about 50% more plan usage.
3. **Where the benchmark runs.** `claude plugin eval` runs shell commands only inside its OS sandbox. Native Windows has no sandbox backend, so suites that grant Bash must run under WSL2 or Linux [V:S9]. There are two options. **WSL2 on this machine** bills to your Pro plan. **GitHub Actions on Linux** needs an `ANTHROPIC_API_KEY` and bills to the API. Which one?
4. **Dynamic workflows on Pro** are off until you turn them on in `/config` [V:S10]. Will you turn them on? If not, `/pilot:research-stack` and `/pilot:verify-change` fall back to plain subagents.
5. **GitHub owner** for the repo and marketplace. This is still open from P0. It is needed before anything is published.

---

## 1. What changed from the master prompt

The evidence reverses one hypothesis and changes several others. The full list with sources is in section 4.

| Hypothesis | Verdict | One-line reason |
| --- | --- | --- |
| 6.9 "Plugins have no dependency mechanism" | **Rejected** | `plugin.json` has a `dependencies` array with semver ranges [V:S5] |
| 6.1 `npx` wrapper as the install path | **Changed** | A native one-command install exists [V:S6] |
| 6.5 Default to Sonnet on Pro | **Changed** | Pro's default model is Opus 5.5, so the kit must set the model explicitly [V:S12] |
| 6.5 Reviewer agents with `memory: project` | **Changed** | The `memory` field turns on Read, Write and Edit, which breaks "reviewers are read-only" [V:S4] |
| 6.6 Workflows as the fan-out tool | **Changed** | Off by default on Pro, with a size guideline of under 5 agents [V:S10] |
| 6.7 Run lint, types and tests on every Stop | **Changed** | Run them only when files changed since the last green check. Otherwise every chat turn pays for the full suite |
| 6.8 Signed release tags | **Changed** | Claude Code verifies no signatures. It can pin to an exact commit `sha` [V:S13] |
| 6.11 Eval cases as JSONL | **Changed** | `claude plugin eval` has its own case layout: `prompt.md` and `graders/*.md` [V:S9] |
| 6.12 Output style as the contract | **Supported, with a gap** | Output styles do not reach subagents, so the contract must also be in each agent body [V:S11] |
| 6.10 Plugin-vs-project file split | **Supported** | All five conformance notes in the prompt re-checked true |

---

## 2. Source notes

All sources were retrieved on 2026-10-22. They are primary sources: platform docs, engineering posts from Anthropic, the actual repos of prior art, and their issue trackers.

### Platform ground truth (code.claude.com)

| ID | Source | What it established |
| --- | --- | --- |
| S1 | [.claude directory](https://code.claude.com/docs/en/claude-directory) | Project file set, including `.worktreeinclude`, `CLAUDE.local.md` and `agent-memory/`. Transcripts are plaintext, and deny rules on credential files are the recommended mitigation |
| S2 | [Plugin components](https://code.claude.com/docs/en/plugins/components) | Plugin layout. `bin/` goes on PATH and blocks claude.ai and Cowork installs. A plugin `CLAUDE.md` is not loaded. Plugin `settings.json` honors only `agent` and `subagentStatusLine`. Plugin agents ignore `permissionMode`, `hooks`, `mcpServers` and `initialPrompt`. Plugin hooks fire in every session where the plugin is enabled |
| S3 | [Hooks reference](https://code.claude.com/docs/en/hooks) and [hooks guide](https://code.claude.com/docs/en/hooks-guide) | Event list, exit-code semantics, JSON output. Stop has `stop_hook_active`, `last_assistant_message` and an 8-continuation cap. SessionStart `additionalContext` is capped at 10,000 characters. Windows: exec form needs a real `.exe`, so use `node` plus `args`. Shell-form hooks fall back to PowerShell without Git Bash |
| S4 | [Subagents](https://code.claude.com/docs/en/sub-agents) | Frontmatter fields and model precedence. A per-invocation `model` beats frontmatter. `memory` auto-enables Read, Write and Edit. Subagents cannot use AskUserQuestion. Default nesting depth is 3 |
| S5 | [Plugin dependencies](https://code.claude.com/docs/en/plugins/dependencies) and [manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference) | `dependencies` with semver ranges that resolve against `{name}--v{version}` git tags. Cross-marketplace dependencies need `allowCrossMarketplaceDependenciesOn`. Names starting with `claude-` are reserved |
| S6 | [Publish a plugin](https://code.claude.com/docs/en/plugins/publish) | Auto-update is off by default for your own marketplace. A pinned `version` must be bumped or users stay on the old copy. `claude plugin validate --strict` and `claude plugin tag`. One-command install with `--marketplace` (v2.1.292+) |
| S7 | [Plugin loading](https://code.claude.com/docs/en/plugins/loading) | How a version is computed, cache paths, auto-update timing. npm dependencies install automatically only with a lockfile and never run lifecycle scripts |
| S8 | [Measure plugin cost](https://code.claude.com/docs/en/plugins/measure) | `claude plugin details <name>` reports always-on and per-component token cost |
| S9 | [Plugin evals](https://code.claude.com/docs/en/plugin-evals) | `claude plugin eval` with a built-in no-plugin baseline arm (Δ). Graders: regex, tool_used, tool_order, file_exists, llm, baseline. No custom-code graders. Bash needs the OS sandbox, and native Windows has none |
| S10 | [Dynamic workflows](https://code.claude.com/docs/en/workflows) and [Run agents in parallel](https://code.claude.com/docs/en/agents) | Workflows need opting in on Pro. The size guideline defaults to `small` (under 5 agents) on Pro. No mid-run user input. Plugin workflows are namespaced. Agent teams are experimental and off by default |
| S11 | [Output styles](https://code.claude.com/docs/en/output-styles) | Fields include `keep-coding-instructions` and `force-for-plugin`. Styles are advisory. They do not apply to non-fork subagents. `outputStyle` values are case-sensitive |
| S12 | [Model configuration](https://code.claude.com/docs/en/model-config) | Aliases resolve to Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.1 on the Anthropic API. Fable bills usage credits. Pro's default model is Opus 5.5. `opusplan` exists |
| S13 | [Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference) | `github` and `url` sources accept `ref` plus a 40-character `sha`. No signature verification is described |
| S14 | [Memory](https://code.claude.com/docs/en/memory) | Keep CLAUDE.md under 200 lines. Rules take only `paths:` frontmatter. Only the root CLAUDE.md survives compaction. `/doctor prompt-audit` exists |
| S15 | [Settings](https://code.claude.com/docs/en/settings) and [Permissions](https://code.claude.com/docs/en/permissions) | Precedence order. Project `allow` rules wait for workspace trust, while `deny` applies immediately. `defaultMode: auto` cannot be set from project settings |
| S16 | [Costs](https://code.claude.com/docs/en/costs) and [Agent teams](https://code.claude.com/docs/en/agent-teams) | Agent teams use about 7× tokens in plan mode. Subagents count toward plan limits. `/usage` shows attribution |
| S17 | [Best practices](https://code.claude.com/docs/en/best-practices) and [Extend Claude Code](https://code.claude.com/docs/en/features-overview) | Give Claude a check it can run. Explore, then plan, then code. Interview first, then write a spec. A writer/reviewer split. "Put guardrails in hooks." Adversarial review tends to cause over-engineering |
| S19 | [Skills](https://code.claude.com/docs/en/skills) | Frontmatter fields, `disable-model-invocation`, `context: fork` (no conversation history), keep SKILL.md under 500 lines, `${CLAUDE_PLUGIN_ROOT}` substitution |
| S18 | [Worktrees](https://code.claude.com/docs/en/worktrees) | `.worktreeinclude` semantics. `isolation: worktree` branches from the default branch unless `worktree.baseRef` is `head` |

### Engineering posts (anthropic.com)

| ID | Source | What it established |
| --- | --- | --- |
| S20 | [Multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system) | Multi-agent runs use about 15× the tokens of chat. Coding is a poorer fit. Delegations need an objective, an output format, tool guidance and boundaries. Start evals with about 20 cases. Judge the end state |
| S21 | [Effective context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) | Context is finite. Just-in-time retrieval, structured note-taking, and subagents that return 1–2k-token summaries |
| S22 | [Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | Evaluate with realistic tasks. Keep tool descriptions unambiguous. Return high-signal, token-efficient output |

### Prior art, read at the source (shallow clones, 2026-10-22)

| ID | Repo | What to take | What to avoid |
| --- | --- | --- | --- |
| S30 | [obra/superpowers](https://github.com/obra/superpowers) v7.0.1 | `verification-before-completion` (evidence before claims), subagent-driven development, red/green TDD. Evals in a separate harness with real sessions | An always-on SessionStart injection marked `EXTREMELY_IMPORTANT`. Bash hooks that need a `run-hook.cmd` polyglot to find Git Bash on Windows. The `superpowers-evals` repo was not found at that path |
| S31 | [get-shit-done](https://github.com/glittercowboy/get-shit-done) | State files (`state.md`, `continue-here.md`), fresh context per task. Hooks written in **JS**: `read-injection-scanner`, `prompt-guard`, `context-monitor` | The repo is archived and moved to `open-gsd/gsd-core`. It has 33 agents and over 50 commands, far past a minimal kit |
| S32 | [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | Role agents (analyst, PM, architect, PO) and doc sharding | Persona-heavy, with many skills |
| S33 | [github/spec-kit](https://github.com/github/spec-kit) | spec → plan → tasks templates, `analyze` and `converge` commands for cross-doc consistency, a documented `upgrade` path | Python and `uv` toolchain. Multi-agent integration layer |
| S34 | [anthropics/skills](https://github.com/anthropics/skills) | The SKILL.md template and the Agent Skills spec | — |
| S35 | [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | Both `install.ps1` and `install.sh`, which shows the cross-platform installer problem is real | Breadth over evidence |
| S36 | [morluto/rea](https://github.com/morluto/rea) | `install.sh` truncation guard. "Setup must show planned changes and require approval." Quality gates: oxlint, knip, jscpd (threshold 3.5%), `scan:todos`, husky pre-commit and pre-push, release-please | Its installer is bash only, macOS and Linux |

### Issue trackers (external failure data)

| ID | Issue | Signal |
| --- | --- | --- |
| S40 | [anthropics/claude-code#3382](https://github.com/anthropics/claude-code/issues/3382) "You're absolutely right!" about everything | 872 👍. Sycophancy |
| S41 | [#46940](https://github.com/anthropics/claude-code/issues/46940) "Claude fabricates test results" | Reported 4966/4966 passing when 7 golden tests failed, then committed |
| S42 | [#319](https://github.com/anthropics/claude-code/issues/319), [#7074](https://github.com/anthropics/claude-code/issues/7074), [#45550](https://github.com/anthropics/claude-code/issues/45550) | Rewrites tests to pass, uses `@skip`, narrows the test target to "safe tests" |
| S43 | [#2544](https://github.com/anthropics/claude-code/issues/2544), [#33603](https://github.com/anthropics/claude-code/issues/33603), [#19471](https://github.com/anthropics/claude-code/issues/19471) | CLAUDE.md rules ignored, worse after compaction |
| S44 | [#73125](https://github.com/anthropics/claude-code/issues/73125) | 388 👍. AskUserQuestion "continued without an answer" after 60 seconds |
| S45 | [#27242](https://github.com/anthropics/claude-code/issues/27242), [#98747](https://github.com/anthropics/claude-code/issues/98747) | Context lost after compaction |
| S46 | [#401](https://github.com/anthropics/claude-code/issues/401) | `.env` loaded into the bash environment |
| S47 | [#10450](https://github.com/anthropics/claude-code/issues/10450), [#21878](https://github.com/anthropics/claude-code/issues/21878), [#22934](https://github.com/anthropics/claude-code/issues/22934), [#27115](https://github.com/anthropics/claude-code/issues/27115) | Hooks broken on Windows: backslash paths, freezes, console windows |
| S48 | [#43869](https://github.com/anthropics/claude-code/issues/43869), [#16157](https://github.com/anthropics/claude-code/issues/16157), [#38335](https://github.com/anthropics/claude-code/issues/38335); superpowers issue on implementers growing to 300k+ context | Subagent model routing surprises and usage limits drained fast |
| S49 | [#29423](https://github.com/anthropics/claude-code/issues/29423) | Subagents reportedly not loading `.claude/rules/`. Current docs say CLAUDE.md loads; rules are not stated |

### Local failure data

**Not read.** P0 decided external sources come first and local data is a fallback. External sources produced 20 distinct failure modes with evidence, so the fallback was not triggered. Your transcripts remain available if P4 shows the catalog missed something.

---

## 3. Failure-mode catalog (FMEA)

Severity runs from 1 (annoying) to 5 (ships a defect or leaks a secret). "Enforced by" names the strongest mechanism that applies, in the order of section 3 of the prompt: hook, permission, CI, then prose. Prose is used only when nothing stronger fits.

| ID | Failure mode | Cause | Detection | Enforced by | Sev | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F01 | Claims "done" or "tests pass" when they fail | No check run, or output misread | Stop hook: files edited since the last green test run | Stop hook blocks; CI is the final gate | 5 | S41, S17, S30 |
| F02 | Edits or skips tests to make them pass | Optimizes for green, not correctness | PreToolUse on test files flags added `skip`, `only` or `xit`, or deleted assertions; hidden acceptance tests | PreToolUse hook plus hidden tests in the benchmark; mutation score in CI | 5 | S42 |
| F03 | Ignores CLAUDE.md rules | Long or bloated instruction files; compaction | Eval probes; `/doctor prompt-audit` | Hard rules become hooks; CLAUDE.md under 200 lines (CI line count) | 4 | S43, S14 |
| F04 | Sycophancy and reflexive agreement | Model tendency | Eval probes where the user is wrong | Output style plus agent bodies, **measured** by evals (advisory, so it must be measured) | 3 | S40, S11 |
| F05 | Loses state across sessions or after compaction | Context window limits | SessionStart `source` is `compact` or `resume` | SessionStart hook injects HANDOFF.md on `startup`, `resume` and `compact` | 4 | S45, S3, S21 |
| F06 | Reads or leaks secrets | `.env` read, then written to plaintext transcripts | Deny-rule hits; secret scan | `permissions.deny` on `Read(./.env*)` and similar; PreToolUse on Bash `cat .env`; secret scan in pre-commit and CI | 5 | S46, S1 |
| F07 | Hooks fail on Windows | Bash scripts, backslash paths, `.cmd` shims | Windows CI job; `/pilot:doctor` | All hooks in Node, exec form `node` plus `args`, zero dependencies | 4 | S47, S3, S30 |
| F08 | Kit hooks fire in non-kit projects | Plugin hooks are global while enabled | Test: run hooks in a folder without a manifest | Every hook exits 0 silently unless `.pilot/manifest.json` exists | 3 | S2 |
| F09 | An update breaks a project in progress | Overwrites edited files; schema drift | Golden-project upgrade tests | Ownership split plus manifest hashes plus `/pilot:migrate` diffs for approval | 5 | Prompt 6.1; S33 has a dedicated upgrade guide |
| F10 | Users stuck on an old version | `version` pinned and not bumped | CI: version changed when plugin files changed | release-please bumps the version and `claude plugin tag` | 3 | S6 |
| F11 | Token or usage blow-up | Multi-agent fan-out, resumed subagents growing large | `claude plugin details` budget; `/usage` attribution | Small workflows; a fresh subagent per task; always-on budget gate in CI | 4 | S20, S16, S48, S8 |
| F12 | Subagent works blind | Fresh context does not see the conversation | Reviewer finds the wrong files touched | Delegation template that names paths, IDs and Definition of Done (6.14) | 4 | S4, S20 |
| F13 | Silent assumptions | Missing answer; AskUserQuestion auto-continues | Tool result text "continued without an answer" | PostToolUse hook on AskUserQuestion logs an ASSUMPTIONS.md entry and tells Claude to ask again | 4 | S44 |
| F14 | Prompt injection from docs, issues or web | Content treated as instructions | Scanner hits | PostToolUse scan on WebFetch and Read of untrusted paths (GSD prior art); "data, not instructions" in agent bodies | 4 | S31, S15 |
| F15 | Supply-chain attack through the kit | Hooks run as the user; auto-update | — | Auto-update off by default; marketplace pins `sha`; SECURITY.md; no npm deps in hooks | 5 | S6, S9, S13 |
| F16 | Edits protected files | Lockfiles, migrations, `.git/` | PreToolUse path match | PreToolUse hook exits 2 | 4 | S3 |
| F17 | Solves the wrong problem | Skips explore and plan | Reviewer checks against FR IDs | `/pilot:step` order: read the spec, then plan, then implement | 4 | S17 |
| F18 | The kit bloats context | Many skill and agent descriptions | `claude plugin details` always-on figure | CI fails above a token budget; `disable-model-invocation: true` on side-effect skills | 3 | S8, S4 (15k warning) |
| F19 | A skill never triggers | Vague description | `tool_used: Skill` grader | Plugin evals in CI | 3 | S9, S30 issues |
| F20 | Author reviews their own work, or the reviewer over-engineers | Same context; prompted to find gaps | Reviewer findings outside FR scope | Fresh-context reviewer; findings limited to correctness and stated requirements | 3 | S17 |

Unverified causes to probe in P4: F03 after compaction on the current version, and S49 (whether subagents load `.claude/rules/`).

---

## 4. Verdicts on the section 6 hypotheses

### 6.1 Distribution and safe updates — **Changed**

- Plugin in its own GitHub marketplace: **supported** [V:S6]. One repo can hold both the plugin and the marketplace, with `"source": "./"`.
- `npx` wrapper as the main install: **changed.** `claude plugin install pilot --marketplace <owner>/pilot` is one command (v2.1.292+) [V:S6]. The wrapper's other jobs, preflight checks and backups, can live in `/pilot:doctor`, and `/pilot:new` already asks for approval before writing. See question 1.
- Auto-update off by default for third-party marketplaces: **verified** [V:S6, S7].
- Versioning: a pinned `version` keeps users on the old copy until it changes [V:S6]. Use release-please to bump it, and `claude plugin tag` for `pilot--v1.2.0` tags.
- Strict file ownership: **supported.** Nothing in the platform contradicts it. Plugin components cannot land in the project anyway [V:S2].
- Manifest plus 3-way migrate: **supported as design**, with no platform support. Rename `.kit/` to `.pilot/`.

### 6.2 Commands — **Supported, trimmed**

- Skills are the current format and commands are legacy [V:S2]. All commands are `skills/<name>/SKILL.md`, invoked as `/pilot:<name>`.
- Side-effect skills (bug, problem, sync, migrate, handoff) get `disable-model-invocation: true`. That keeps them out of always-on context and stops Claude from firing them on its own [V:S17, S19].
- Workflows are `.js` files run as `/pilot:<name>` [V:S10]. On Pro they need opting in, so each has a subagent fallback.
- Proposed v1 scope, to ship minimal: `new`, `adopt`, `step`, `status`, `bug`, `problem`, `handoff`, `doctor`. Deferred until a failure demands them: `sync` (CI job first), `design`, `migrate` (needed only once v2 templates exist), `audit`.

### 6.3 Project documents — **Supported**

- No platform evidence for or against. Spec Kit's `analyze` and `converge` commands exist to fight cross-doc drift, which supports the one-owner-per-fact rule [V:S33].
- Row 10 is binding: keep PRD, SRS and Tech Spec.

### 6.4 Interview — **Supported, with one added guard**

- AskUserQuestion works only in the main session. Subagents cannot ask [V:S4]. The interview must run in the main thread, not in a forked skill.
- Best practices recommend the same flow: interview, write a spec, then a fresh session to implement [V:S17].
- **Added:** AskUserQuestion can return "continued without an answer" [V:S44]. A PostToolUse hook catches that and forces a re-ask (F13).

### 6.5 Agents and models — **Changed**

- Current aliases: `opus` is Opus 5.5, `sonnet` is Sonnet 5.5, `haiku` is Haiku 5.5, `fable` is Fable 5.1 [V:S12].
- **Pro's default model is Opus 5.5** [V:S12]. "Default to Sonnet" therefore needs an explicit `model` in the project's settings. Proposed Pro profile: `"model": "opusplan"`, which uses Opus in plan mode and Sonnet for execution [V:S12]. **[A]** that this beats plain `sonnet` on cost per passing task. P4 measures it.
- One switch for upgrading: a per-invocation `model` beats agent frontmatter [V:S4]. `/pilot:step` reads `profile: pro|max` from `.pilot/manifest.json` and passes the model on each dispatch. That gives one setting without forking agent files.
- Fable bills usage credits [V:S12], so escalation always asks first.
- **Reviewers and `memory`:** the field turns on Read, Write and Edit [V:S4]. Reviewers ship without `memory` in v1. **[A]** whether `disallowedTools: Edit, Write` would override it. Probe in P4.
- The built-in Explore agent runs on the main model, which is Opus on a subscription [V:S4]. A kit `explorer` on Haiku is a real saving on Pro.

### 6.6 Multi-agent rules — **Supported, with Pro limits**

- About 15× tokens, and coding is a poorer fit [V:S20]. Agent teams use about 7× [V:S16].
- Workflows: off on Pro until enabled, with a guideline of under 5 agents. Results stay in script variables, and there is no mid-run user input [V:S10].
- One example of each, inside the kit:
  - **Subagent:** `/pilot:step` dispatches `implementer`, then a fresh `code-reviewer`.
  - **Dynamic workflow:** `/pilot:research-stack` fans out 3 researchers and 1 cross-checker, staying under 5 for Pro.
  - **Agent view:** you hand two independent roadmap steps to background sessions with `claude agents`, each in its own worktree.
  - **Agent teams:** not used in v1. They are experimental and off by default [V:S16].

### 6.7 Quality gates — **Changed**

- Mechanisms verified: Stop `decision: "block"` with `stop_hook_active` and an 8-continuation cap; PreToolUse exit 2; the `if` field for narrow matching [V:S3].
- **Change:** a full lint, typecheck and test run on every Stop makes every chat turn expensive. Instead, a PostToolUse hook records "dirty since last green" in `.pilot/state.json`. The Stop hook blocks only when the session is dirty and no green check ran after the last edit. **[A]** that this catches F01 as well as a full run would. The P4 eval removes the hook and compares.
- Permission profile per stack goes in project `.claude/settings.json`. `deny` applies immediately, while `allow` waits for workspace trust [V:S15].

### 6.8 Guardrails for the kit — **Changed**

- Hooks run as the user [V:S9]. Transcripts are plaintext [V:S1]. Both verified.
- **Signed tags: no platform support found.** Claude Code checks out an exact `sha` when the marketplace entry gives one [V:S13]. The v1 control is: the marketplace pins `ref` plus `sha`, auto-update stays off, and SECURITY.md documents how to diff a release before updating.
- Hook scripts have zero npm dependencies, so no install step runs third-party code [V:S7].

### 6.9 Relationship to existing setups — **Hypothesis rejected; decision: borrow, don't depend**

- "Plugins have no dependency mechanism" is **false.** `plugin.json` accepts `dependencies` with semver ranges [V:S5]. Superpowers lives in `claude-plugins-official`, so a dependency would need `allowCrossMarketplaceDependenciesOn: ["claude-plugins-official"]` in pilot's marketplace [V:S5, S13].
- Evidence against depending on Superpowers in v1:
  - Overlap is high. Its brainstorming duplicates the interview, and its TDD and review skills duplicate `/pilot:step`.
  - Its SessionStart hook adds always-on context to every session [V:S30], on top of pilot's own.
  - Its hooks are bash and need Git Bash on Windows [V:S30]. Row 3 requires Node.
  - It changes often (v7, many open behavior issues), and a range dependency would follow those changes.
- What pilot borrows instead, with credit: verification-before-completion as a Stop hook (enforced, not advised), red/green TDD in the implementer body, and fresh subagent per task. From GSD: JS hooks and the injection scanner. From rea: the quality toolchain and "show plan, then approve."
- This stays reversible. If the benchmark shows Superpowers adds value on top of pilot, adding a `dependencies` entry is a one-line change. See question 2.

### 6.10 File system — **Supported, with renames**

All five conformance notes in the prompt re-checked true [V:S2]. Changes:

- `.kit/` becomes `.pilot/`. `KIT.md` becomes `REGISTRY.md`.
- Hook commands use exec form: `"command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/scripts/<name>.js"]`. No shell, no quoting, works on Windows [V:S3].
- `evals/` is the default eval directory, and it writes `evals/results/`, which must be gitignored [V:S9].
- `.claude/agent-memory/` is created only if an agent uses `memory`. That is none in v1 (see 6.5).

### 6.11 File formats — **Changed for evals only**

- Plugin eval cases use `claude plugin eval`'s own layout: a case directory with `prompt.md`, `graders/*.md` and an optional `case.yaml` [V:S9]. They are not JSONL.
- JSONL stays for benchmark run history, `/pilot:audit` history and product AI eval cases.

### 6.12 Communication contract — **Supported, with a gap**

- Plugin output style `pilot:direct` with `keep-coding-instructions: true`, switched on through `"outputStyle": "pilot:direct"` in project settings [V:S11, S2].
- **Gap:** output styles don't reach non-fork subagents [V:S11]. A five-line contract block goes into every agent body too.
- Don't use `force-for-plugin`. It would override the style in every project, not just pilot projects [V:S11].
- It is advisory, so it is measured: eval probes where the user states something false [V:S40 shows the base rate is a real problem].

### 6.13 Registry and self-audit — **Supported, with platform tools**

- `/pilot:audit` should call `claude plugin details pilot` for token cost [V:S8] and `claude plugin eval --ablation with-without` for value [V:S9]. `/doctor prompt-audit` covers stale instructions [V:S14].

### 6.14 Routing — **Supported**

- CLAUDE.md under 200 lines [V:S14]. Skills under 500 lines [V:S19]. Rules take only `paths:` [V:S14].
- **New constraint:** SessionStart `additionalContext` is capped at 10,000 characters [V:S3]. HANDOFF.md must stay under that, and CI checks its size.

### Section 7 proof — **Mechanism exists**

- `claude plugin eval` already runs every case with and without the plugin and reports Δ [V:S9]. That is the vanilla-vs-kit comparison the prompt asked for.
- Its limits: no custom-code graders, so hidden acceptance tests run as a file the case writes and a `regex` grader reads. Shell needs a sandbox, which means WSL2 or Linux. Every run counts against the plan or API bill.

---

## 5. What is still unverified

| Item | Check | Phase |
| --- | --- | --- |
| `opusplan` beats `sonnet` on cost per passing task on Pro | Benchmark both profiles | P4 |
| `disallowedTools` can strip Write and Edit from an agent that uses `memory` | Probe agent | P4 |
| Subagents load `.claude/rules/` (S49) | Probe a path-scoped rule from a subagent | P4 |
| The dirty-state Stop hook catches F01 as well as a full run | Eval with and without the hook | P4 |
| CLAUDE.md adherence after compaction on 2.1.300+ | Eval with forced `/compact` | P4 |
| The GitHub repo name `pilot` is free under your owner | Check once the owner is known | P2 |
