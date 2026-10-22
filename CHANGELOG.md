# Changelog

## 0.1.0 (unreleased)

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
