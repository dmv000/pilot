---
type: "regex"
arm: "both"
target:
  source: "file"
  path: "tests/acceptance/price.test.js"
pattern: "assert\\.equal\\(discounted\\(10\\.05, 50\\), 5\\.02\\);[\\s\\S]*assert\\.equal\\(discounted\\(10\\.15, 50\\), 5\\.08\\);"
---
