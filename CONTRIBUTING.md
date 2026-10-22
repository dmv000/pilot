# Contributing

Every component of pilot must earn its place:

1. **Name the failure it prevents.** Use an existing F-ID from docs/design/P1-evidence.md, or add one with evidence.
2. **Add the check that proves it works.** A unit test in tests/, an eval in plugin/evals/ (edit scripts/dev/gen-evals.mjs), or a CI check. The check should fail when the component is removed.
3. **Add its row to REGISTRY.md.** `npm run check:registry` enforces this.
4. **Prefer enforcement over advice.** If a rule can be a hook, permission, test or CI check, it must be.
5. **Keep the always-on context budget.** `npm run check:budget` must stay at or under 1,500 tokens.

Before a pull request, run `npm test` and `npm run check:registry`. Only runtime files go in plugin/ (the folder Claude Code installs); `npm run check:registry` enforces it. Hook scripts must stay dependency-free and must work on Windows, macOS and Linux.
