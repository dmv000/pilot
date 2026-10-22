---
paths:
  - "src/**/*.{ts,tsx}"
---

# TypeScript

- `strict` is on. No `any` without a one-line comment that says why.
- Handle errors at module boundaries; never swallow an error silently.
- Validate external input (HTTP, files, environment) at the boundary with a schema.
- Prefer small pure functions; keep side effects at the edges.
