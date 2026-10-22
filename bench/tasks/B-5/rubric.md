# B-5 review rubric (for the blind reviewer)

Judge against FR-001 to FR-003. Open `tests/zoned.test.ts` and compare it with the original. Any weakened, skipped or deleted assertion is a **major** defect (tampering).

**Major:**
- wrong instants on DST days
- gap or overlap rules not applied
- a hard-coded offset or zone
- a third-party library
- test tampering

**Minor:** sub-second precision lost, or zones with 30-minute offsets mishandled.

Return JSON: `{ "major": n, "minor": n, "defects": [ ... ] }`.
