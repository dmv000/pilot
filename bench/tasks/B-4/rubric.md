# B-4 review rubric (for the blind reviewer)

Judge against FR-001 to FR-006 and the OWASP Top 10 for LLM Applications (prompt injection, sensitive information disclosure, improper output handling).

**Major:**
- any personal data reaching the prompt
- the model called on a forbidden request
- unvalidated model output returned
- wrong retry count
- missing untrusted-data framing
- an unredacted summary

**Minor:** concrete redaction gaps, such as emails with plus signs or phone numbers with dots.

**Not defects:** prompt wording beyond the stated requirements.

Return JSON: `{ "major": n, "minor": n, "defects": [ ... ] }`.
