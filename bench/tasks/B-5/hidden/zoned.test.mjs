// Hidden acceptance tests for B-5.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDate, formatLocal, startOfDay, addDays, offsetAt } from '../src/zoned.ts';

const NY = 'America/New_York';
const LON = 'Europe/London';
const SYD = 'Australia/Sydney';
const KOL = 'Asia/Kolkata';
const at = s => new Date(s);
const fl = (d, tz) => formatLocal(d, tz);

test('FR-001 spring forward keeps 09:00 (New York, London, Sydney)', () => {
  assert.equal(fl(addDays(at('2026-03-07T14:00:00Z'), 1, NY), NY), '2026-03-08 09:00');
  assert.equal(fl(addDays(at('2026-03-28T09:00:00Z'), 1, LON), LON), '2026-03-29 09:00');
  assert.equal(fl(addDays(at('2026-10-02T23:00:00Z'), 2, SYD), SYD), '2026-10-05 09:00');
});

test('FR-001 fall back keeps 08:00 (London, New York, Sydney)', () => {
  assert.equal(fl(addDays(at('2026-10-24T07:00:00Z'), 1, LON), LON), '2026-10-25 08:00');
  assert.equal(fl(addDays(at('2026-10-31T12:00:00Z'), 1, NY), NY), '2026-11-01 08:00');
  assert.equal(fl(addDays(at('2026-04-03T21:00:00Z'), 1, SYD), SYD), '2026-04-05 08:00');
});

test('FR-001 a missing local time moves forward by the gap', () => {
  // 2026-03-07 02:30 EST; 2026-03-08 02:30 does not exist in New York.
  const r = addDays(at('2026-03-07T07:30:00Z'), 1, NY);
  assert.equal(fl(r, NY), '2026-03-08 03:30');
  assert.equal(r.toISOString(), '2026-03-08T07:30:00.000Z');
});

test('FR-001 a repeated local time picks the earlier instant', () => {
  // 2026-10-31 01:30 EDT; 2026-11-01 01:30 happens twice in New York.
  const r = addDays(at('2026-10-31T05:30:00Z'), 1, NY);
  assert.equal(r.toISOString(), '2026-11-01T05:30:00.000Z');
});

test('FR-001 negative and long ranges', () => {
  assert.equal(fl(addDays(at('2026-03-09T13:00:00Z'), -2, NY), NY), '2026-03-07 09:00');
  assert.equal(fl(addDays(at('2026-01-15T14:00:00Z'), 180, NY), NY), '2026-07-14 09:00');
  assert.equal(fl(addDays(at('2026-03-01T03:30:00Z'), 30, KOL), KOL), '2026-03-31 09:00');
});

test('FR-002 startOfDay on and around change days', () => {
  assert.equal(startOfDay(at('2026-03-08T19:00:00Z'), NY).toISOString(), '2026-03-08T05:00:00.000Z');
  assert.equal(startOfDay(at('2026-11-01T18:00:00Z'), NY).toISOString(), '2026-11-01T04:00:00.000Z');
  assert.equal(startOfDay(at('2026-10-25T20:00:00Z'), LON).toISOString(), '2026-10-24T23:00:00.000Z');
  assert.equal(startOfDay(at('2026-07-01T12:00:00Z'), KOL).toISOString(), '2026-06-30T18:30:00.000Z');
});

test('FR-003 existing helpers still correct', () => {
  assert.equal(offsetAt(at('2026-07-01T12:00:00Z'), NY), -4 * 3600_000);
  assert.equal(offsetAt(at('2026-07-01T12:00:00Z'), KOL), 5.5 * 3600_000);
  assert.equal(localDate(at('2026-07-02T02:00:00Z'), NY), '2026-07-01');
  assert.equal(fl(at('2026-01-15T09:05:00Z'), LON), '2026-01-15 09:05');
});
