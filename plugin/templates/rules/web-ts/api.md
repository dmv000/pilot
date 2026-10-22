---
paths:
  - "src/**/api/**"
  - "src/**/server/**"
  - "src/**/routes/**"
---

# API and server code

- Validate every request body, query and parameter with a schema; reject unknown fields.
- Use one error response shape everywhere, as defined in TECH-SPEC.md.
- Never log secrets, tokens or personal data.
- Check authorization on every handler that reads or changes user data.
