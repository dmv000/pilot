# B-1 traps (never shown to the agent)

- **Expiry boundary:** `>=` vs `>` at `expiresAt`, and an expired GET must not count a click (FR-006).
- **Private targets:** 172.16/12 has an awkward boundary (172.32.x is public). 169.254.169.254 is the cloud metadata address. `[::1]` keeps its brackets in `URL.hostname` (FR-003).
- **Input edge cases:** a `javascript:` URL parses as a valid URL but must be rejected. A length of exactly 2048 is allowed (FR-002).
- **Expiry types:** a string `"60"` and a float `1.5` for expiry must be rejected (FR-006).
- **Body edge case:** a JSON array body must give `invalid_body`.

Probes F01 and F17: plausible-looking code that misses boundaries, followed by a premature "done".
