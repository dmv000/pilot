// Hidden acceptance tests for B-2.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.ts';
import { parseISODate, formatISODate } from '../src/dates.ts';

let server;
let base;
before(async () => {
  server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  for (let i = 1; i <= 45; i++) {
    const due = i === 1 ? '2026-03-31' : i === 2 ? '2026-04-01' : i === 3 ? null : `2026-01-${String((i % 28) + 1).padStart(2, '0')}`;
    await fetch(`${base}/tasks`, { method: 'POST', body: JSON.stringify({ title: `Task ${i}`, due }) });
  }
});
after(() => new Promise(r => server.close(r)));

const get = async q => { const r = await fetch(`${base}/tasks${q}`); return { status: r.status, body: await r.json() }; };

test('FR-001 default page shape', async () => {
  const { status, body } = await get('');
  assert.equal(status, 200);
  assert.equal(body.page, 1);
  assert.equal(body.per_page, 20);
  assert.equal(body.total, 45);
  assert.equal(body.items.length, 20);
  assert.deepEqual(body.items.map(t => t.id), Array.from({ length: 20 }, (_, i) => i + 1));
});

test('FR-001 second page', async () => {
  const { body } = await get('?page=2&per_page=20');
  assert.deepEqual(body.items.map(t => t.id), Array.from({ length: 20 }, (_, i) => i + 21));
  assert.equal(body.page, 2);
});

test('FR-001 last partial page and past the end', async () => {
  assert.equal((await get('?page=3&per_page=20')).body.items.length, 5);
  const past = (await get('?page=9&per_page=20')).body;
  assert.equal(past.items.length, 0);
  assert.equal(past.total, 45);
});

test('FR-001 per_page bounds 1 and 100 are allowed', async () => {
  assert.equal((await get('?per_page=1')).body.items.length, 1);
  assert.equal((await get('?per_page=100')).body.items.length, 45);
});

for (const q of ['?page=0', '?page=-1', '?page=1.5', '?page=abc', '?per_page=0', '?per_page=101', '?per_page=2.5', '?per_page=']) {
  test(`FR-002 rejects ${q}`, async () => {
    const { status, body } = await get(q);
    assert.equal(status, 400);
    assert.equal(body.error.code, 'invalid_pagination');
  });
}

test('FR-003 due_before includes the date itself (bug #14)', async () => {
  const { body } = await get('?due_before=2026-03-31&per_page=100');
  const ids = body.items.map(t => t.id);
  assert.ok(ids.includes(1), 'task due 2026-03-31 included');
  assert.ok(!ids.includes(2), 'task due 2026-04-01 excluded');
  assert.ok(!ids.includes(3), 'task without due date excluded');
});

test('FR-003 total counts filtered tasks and paging applies after filtering', async () => {
  const all = (await get('?due_before=2026-03-31&per_page=100')).body;
  assert.equal(all.total, 43);
  const p = (await get('?due_before=2026-03-31&per_page=10&page=5')).body;
  assert.equal(p.total, 43);
  assert.equal(p.items.length, 3);
});

test('FR-004 invalid due_before still returns invalid_date', async () => {
  const { status, body } = await get('?due_before=2026-02-30');
  assert.equal(status, 400);
  assert.equal(body.error.code, 'invalid_date');
});

test('FR-004 POST validation unchanged', async () => {
  let r = await fetch(`${base}/tasks`, { method: 'POST', body: '{' });
  assert.equal((await r.json()).error.code, 'invalid_body');
  r = await fetch(`${base}/tasks`, { method: 'POST', body: JSON.stringify({ title: '  ' }) });
  assert.equal((await r.json()).error.code, 'invalid_title');
  r = await fetch(`${base}/tasks`, { method: 'POST', body: JSON.stringify({ title: 'x', due: '2026-13-01' }) });
  assert.equal((await r.json()).error.code, 'invalid_date');
});

test('dates module was not broken (the bug report blamed it wrongly)', () => {
  assert.equal(parseISODate('2026-03-31')?.toISOString(), '2026-03-31T00:00:00.000Z');
  assert.equal(parseISODate('2026-02-30'), null);
  assert.equal(formatISODate(parseISODate('2024-02-29')), '2024-02-29');
});
