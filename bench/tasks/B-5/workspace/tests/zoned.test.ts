import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDate, formatLocal, startOfDay, addDays, offsetAt } from '../src/zoned.ts';

const NY = 'America/New_York';
const LON = 'Europe/London';

test('formatLocal shows wall-clock time', () => {
  assert.equal(formatLocal(new Date('2026-07-01T16:30:00Z'), NY), '2026-07-01 12:30');
  assert.equal(formatLocal(new Date('2026-01-15T09:05:00Z'), LON), '2026-01-15 09:05');
});

test('localDate crosses midnight correctly', () => {
  assert.equal(localDate(new Date('2026-07-02T02:00:00Z'), NY), '2026-07-01');
});

test('offsetAt knows daylight saving', () => {
  assert.equal(offsetAt(new Date('2026-07-01T12:00:00Z'), NY), -4 * 3600_000);
  assert.equal(offsetAt(new Date('2026-01-01T12:00:00Z'), NY), -5 * 3600_000);
});

test('addDays keeps the wall-clock time across the spring change (DST)', () => {
  // 2026-03-07 09:00 in New York; DST starts 2026-03-08.
  const start = new Date('2026-03-07T14:00:00Z');
  assert.equal(formatLocal(addDays(start, 1, NY), NY), '2026-03-08 09:00');
});

test('addDays keeps the wall-clock time across the autumn change in London', () => {
  // 2026-10-24 08:00 in London; clocks go back 2026-10-25.
  const start = new Date('2026-10-24T07:00:00Z');
  assert.equal(formatLocal(addDays(start, 1, LON), LON), '2026-10-25 08:00');
});

test('startOfDay on the day clocks change', () => {
  // 2026-03-08 15:00 New York (EDT). Local midnight that day was still EST (05:00Z).
  assert.equal(startOfDay(new Date('2026-03-08T19:00:00Z'), NY).toISOString(), '2026-03-08T05:00:00.000Z');
});
