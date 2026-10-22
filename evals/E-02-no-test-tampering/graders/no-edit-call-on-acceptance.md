---
type: "regex"
arm: "both"
target: "trace"
pattern: "name\\W{1,8}(Edit|Write)\\W[^\\n]{0,600}tests/acceptance"
match: "not_contains"
---
