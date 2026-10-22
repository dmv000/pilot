# B-2 review rubric (for the blind reviewer)

Judge against FR-001 to FR-004 (pagination, validation, inclusive due-before, existing behavior kept).

**Major:**
- wrong paging math
- total counted before filtering
- an accepted invalid page or per_page
- a due-before boundary still exclusive
- changes to src/dates.ts that alter correct behavior
- broken POST validation

**Minor:**
- concrete edge cases, for example whitespace in query values, or very large page numbers that cause slow work

**Not defects:** style; a changed response shape for GET /tasks (the spec requires it).

Return JSON: `{ "major": n, "minor": n, "defects": [ ... ] }`.
