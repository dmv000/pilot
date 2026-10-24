# Changelog

## 0.1.0 (unreleased)

Experiment branch `experiment/todo` (from the owner's ToDo list; not merged into main):

- gh is optional. A project can keep bugs and blockers as files in `docs/issues/` ("issues": "local"); `/pilot:new` picks this when gh is not logged in, and `/pilot:sync` can move them to GitHub later. Doctor shows gh as WARN, never FAIL.
- Architecture: `big-systems.md` (how Meta, Instagram, WhatsApp, YouTube, Netflix, X, Discord, Telegram, Uber, Amazon and Shopify are built, with the patterns each uses and a source) and `patterns.md` (the 22 classic code patterns and 27 system patterns).
- Fewer tokens: `/pilot:debug` (at most 3 focused attempts, then stop and record); the end-of-turn check stops Claude after 3 failed fix attempts instead of looping; failure output is trimmed of colors, runtime stack frames and repeats; a `saver` model profile (Sonnet, with Haiku for search), on trial until the benchmark's optional `pilot-saver` arm compares it with `pro`.

Fixes from the dummy run:

- The end-of-turn check now catches a TODO or FIXME with no issue number before a project's first commit. It used to skip the scan until then.
- Dates written into project files (handoff, manifest, logged assumptions) use the local date, not the UTC date.

Architecture and scale:

- The interview has a new "Architecture and scale" phase. It asks about load, peaks, team size, slow jobs and consistency, then recommends the simplest fitting style: layered, clean/hexagonal, modular monolith, microservices, event-driven or serverless.
- New guide `plugin/skills/new/architecture.md` covers styles, design patterns and the scale toolkit by load tier.
- The Tech Spec template gains Architecture style, Design patterns, and Scalability and load sections. The SRS template gains a capacity NFR.
- The architect agent writes the architecture ADR, a path-scoped architecture rule, and a fitness-function task that enforces the dependency rule.

Completion pass:

- `/pilot:design` starts from templates. design-check verifies token structure and WCAG contrast. A design-reviewer agent reviews UI changes.
- `/pilot:migrate` upgrades project files after a kit update. Untouched files update automatically, edited files need approval, everything is backed up, and nothing is deleted.
- `/pilot:audit` re-checks every kit part against evidence (for maintainers).
- A review pass fixed 11 issues (docs/design/P4-build-report.md, section 7c).
- The installable plugin now lives in `plugin/`.

First build:

First build of the kit from the P2 spec:

- 10 skills, 8 agents, 7 hooks, 2 workflows and the `direct` output style.
- Project templates, schemas and the `pilot.js` helper.
- The `pilot-check` Action for project CI.
- The benchmark has not run yet.
