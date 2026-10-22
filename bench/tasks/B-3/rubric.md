# B-3 review rubric (for the blind reviewer)

Judge against FR-001 to FR-005.

**Major:**
- wrong types
- an accepted invalid value
- stopping at the first error instead of reporting all
- wrong exit codes
- an output file written on error
- wrong line numbers with multi-line quoted fields
- a third-party import

**Minor:** concrete edge cases, such as a header with surrounding spaces, an empty file, or a pattern that is not anchored.

**Not defects:** style, message wording beyond the required prefix.

Return JSON: `{ "major": n, "minor": n, "defects": [ ... ] }`.
