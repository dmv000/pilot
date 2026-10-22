---
paths:
  - "tests/**"
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/test_*.py"
---

# Tests

- Tag each test that verifies a requirement with its ID: `// @req FR-012` (or `# @req FR-012`), or put the ID in the test name.
- Never weaken an assertion, widen a tolerance, or delete a test to make it pass. If the test is wrong, say so and stop.
- A skip needs `pilot-allow-skip: #<issue>` beside it; the hook blocks other skips.
- Tests in `tests/acceptance/` come from the spec. Only the test-writer agent changes them.
