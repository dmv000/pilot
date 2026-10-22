# Test strategy

Purpose: how this project tests: levels, coverage rule, ID tagging, mutation testing.
Read this when: you write or review tests.
Related files: docs/requirements/SRS.md, tests/

Status: Draft

## Levels

| Level | Covers | Location | Command |
| --- | --- | --- | --- |
| Unit | functions and modules | tests/unit/ | {{checks.fast}} |
| Acceptance | each Gherkin criterion in PRD.md | tests/acceptance/ | {{checks.acceptance}} |
| End-to-end | top user journeys | tests/e2e/ | {{e2e_command}} |

## Rules

- Tests are written before the code for logic (not for pure layout).
- Acceptance tests are written by the test-writer agent from the spec and are not edited by the implementer.
- Every test that verifies a requirement carries its ID: a comment `@req FR-012` or the ID in the test name.
- Coverage on changed lines must be at least 80%. CI runs the project's `coverage` script, which must write Cobertura XML to `coverage/cobertura-coverage.xml`, then diff-cover.
- Mutation testing runs weekly and on demand through the project's `mutation` script; baseline score: {{baseline}}.
- A skipped test needs `pilot-allow-skip: #<issue>` next to it.

## Property-based tests

{{where they apply}}
