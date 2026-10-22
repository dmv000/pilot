# zoned

Small time-zone helpers for a scheduling app: `localDate`, `formatLocal`, `offsetAt`, `startOfDay`, `addDays`. Zones are IANA names. Node.js 24, TypeScript by type stripping (erasable syntax only), no runtime dependencies. The built-in `Intl` API is available.

CI is red: 3 tests in `tests/zoned.test.ts` fail around daylight-saving changes.

```bash
npm install
npm run check:fast
```
