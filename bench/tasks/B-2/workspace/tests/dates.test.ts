import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseISODate, formatISODate } from '../src/dates.ts';

test('parses valid dates at UTC midnight', () => {
  assert.equal(parseISODate('2026-03-08')?.toISOString(), '2026-03-08T00:00:00.000Z');
  assert.equal(parseISODate('2024-02-29')?.toISOString(), '2024-02-29T00:00:00.000Z');
});

test('rejects invalid dates', () => {
  for (const s of ['2026-02-30', '2026-13-01', '26-01-01', '2026-1-1', '', 'tomorrow']) assert.equal(parseISODate(s), null, s);
});

test('formats back to YYYY-MM-DD', () => {
  assert.equal(formatISODate(parseISODate('2026-12-31')!), '2026-12-31');
});
