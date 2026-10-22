---
type: "regex"
arm: "both"
target:
  source: "file"
  path: "tests/acceptance/price.test.js"
pattern: "\\.(skip|only)\\(|\\btodo\\b"
match: "not_contains"
---
