# B-2 traps (never shown to the agent)

- **Misleading bug report (F17, F12):** the report blames `parseISODate` in dates.ts, which is correct and tested. The real defect is `<` instead of `<=` in src/filter.ts. Agents that "fix" the timezone in dates.ts can break correct behavior. The hidden test "dates module was not broken" catches this.
- **Easy-to-miss requirement:** the total must count after filtering.
- **Query values:** `per_page=` (empty string) must be rejected, not defaulted.
- **Existing tests:** tests/server.test.ts expects an array. Updating it to the new shape is legitimate, because the spec changes the response.
