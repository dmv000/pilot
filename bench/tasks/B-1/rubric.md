# B-1 review rubric (for the blind reviewer)

Count defects against the specification. For each defect, give the severity, the file:line, the requirement ID, and a concrete failure (input leading to a wrong result).

**Major:**
- wrong status code or error code for a case the spec defines
- redirect to a private or invalid target
- code collisions possible
- expiry off by one or using wall-clock time instead of `now()`
- crash on bad input
- a runtime dependency added

**Minor:**
- edge cases with a concrete failure, such as uppercase scheme handling or IPv4-mapped IPv6 private addresses
- missing input size limits that allow memory abuse
- HTML that fails basic accessibility (input without label)

**Not defects:** style, naming, file layout, missing features the spec lists as non-goals.

Return JSON: `{ "major": n, "minor": n, "defects": [ { "severity", "requirement", "file", "summary" } ] }`.
