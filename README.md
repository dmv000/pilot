# pilot

**pilot turns Claude Code into a disciplined engineer for your projects.**

You describe what you want. pilot interviews you, writes specs where every requirement has an ID, and then builds the project one roadmap step at a time:

1. tests are written first, from the spec
2. the code is written to pass them
3. a fresh reviewer checks the change
4. a gate stops Claude from saying "done" while checks fail

Status: **0.1.0, pre-release.** The benchmark against plain Claude Code has not run yet; see [docs/design/P3-verification.md](docs/design/P3-verification.md). Results will be published here, including any task where pilot did worse.

## Install

Requirements: Claude Code 2.1.295 or later, Node.js 20+ on your PATH, git, and the GitHub CLI (`gh`) logged in.

```bash
claude plugin install pilot --marketplace dmv000/pilot
```

Or, inside a Claude Code session: `/plugin install pilot --marketplace dmv000/pilot`. Update later with:

```bash
claude plugin update pilot@pilot
```

Auto-update is off by default, so you choose when the kit's code changes. Read the changelog before updating; see [SECURITY.md](SECURITY.md).

**Why Node is required:** pilot's safety hooks are Node scripts so they behave the same on Windows, macOS and Linux. Two of them, the guards for protected files and dangerous commands, *fail closed*. If Node is missing, Claude Code blocks file edits and shell commands rather than run without the guards. Run `/pilot:doctor` if that happens.

## Use

| Command | What it does |
| --- | --- |
| `/pilot:new` | Interviews you in depth, then creates the PRD, SRS, Tech Spec, roadmap, test strategy, security notes, project settings and CI |
| `/pilot:adopt` | Same, for a project that already has code: maps it first, then asks only about the gaps |
| `/pilot:step <n>` | Builds one roadmap step: acceptance tests, implementation, review, progress update |
| `/pilot:status` | Progress, open bugs and problems, reminders |
| `/pilot:bug`, `/pilot:problem` | Files a GitHub Issue (you approve each one) and updates the local mirror |
| `/pilot:sync` | Rebuilds the local mirrors of GitHub Issues |
| `/pilot:handoff` | Writes the state for the next session |
| `/pilot:design` | Creates the design system from the kit's templates: rules in DESIGN.md, values in tokens.json (contrast-checked), a generated preview page |
| `/pilot:migrate` | After a kit update, upgrades the project's pilot files: automatic for files you never edited, your approval for the rest, with backups |
| `/pilot:doctor` | Checks the install and the project, and switches the model profile (`/pilot:doctor profile max`) |
| `/pilot:audit` | For maintainers of this repo: re-checks every kit part against evidence after a new model or Claude Code release |

## What pilot enforces

These are enforced by hooks, permissions or CI, not just written as advice:

- A turn that changed code cannot end while the project's fast checks fail.
- Acceptance tests come from the spec. The implementing agent cannot edit them, and new test skips need a linked issue.
- A roadmap step is marked done only when a recorded run of the acceptance tests passed and the review passed.
- Secret files (`.env`, keys) cannot be read or printed. Protected files such as lockfiles cannot be edited.
- Every requirement needs a test tagged with its ID before its step can close (CI).
- Outside a pilot project, every pilot hook does nothing.

## How it is built

- The installed plugin is the `plugin/` folder only: skills, agents, hooks, workflows, output style, templates, the `pilot.js` helper and the plugin's eval cases. Tests, the benchmark and design documents stay in this repository and are not installed.
- Design documents: [docs/design/](docs/design/), covering evidence, spec, templates and the verification plan.
- Every component, the failure it prevents and the check that proves it: [REGISTRY.md](REGISTRY.md).

## Develop

```bash
npm test                 # hook and CLI tests (no dependencies)
npm run check:registry   # registry matches the files
npm run check:release    # everything above + context budget + claude plugin validate (needs a logged-in Claude Code)
npm run eval             # behavior evals in plugin/evals, with and without the plugin (WSL2/Linux; uses your plan)
```

## License

MIT
