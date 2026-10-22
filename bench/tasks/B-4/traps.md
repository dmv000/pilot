# B-4 traps (never shown to the agent)

- **Redaction order and Luhn:** a 16-digit order number that fails Luhn must not become `[CARD]`. Phone redaction must not eat card numbers.
- **The subject is redacted too:** PII in the subject must not leak into the prompt.
- **Model errors count:** a thrown error counts as an attempt.
- **Untrusted output:** `summary` from the model can contain PII, so redact it. Category values outside the enum must be rejected, never passed through.
- **Prompt injection:** the ticket text tries to set the priority. The prompt must fence it and mark it untrusted.
