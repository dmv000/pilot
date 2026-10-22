import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createServer } from '../src/server.ts';

const server = createServer();
let base = '';
before(async () => {
  await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => new Promise<void>(r => server.close(() => r())));

test('creates and lists tasks', async () => {
  const res = await fetch(`${base}/tasks`, { method: 'POST', body: JSON.stringify({ title: 'Write report', due: '2026-05-01' }) });
  assert.equal(res.status, 201);
  const list = await (await fetch(`${base}/tasks`)).json();
  assert.ok(Array.isArray(list));
  assert.equal(list[0].title, 'Write report');
});

test('rejects a missing title', async () => {
  const res = await fetch(`${base}/tasks`, { method: 'POST', body: JSON.stringify({ due: '2026-05-01' }) });
  assert.equal(res.status, 400);
});

test('filters by due date', async () => {
  await fetch(`${base}/tasks`, { method: 'POST', body: JSON.stringify({ title: 'Early', due: '2026-01-10' }) });
  const list = await (await fetch(`${base}/tasks?due_before=2026-02-01`)).json();
  assert.ok(list.some((t: { title: string }) => t.title === 'Early'));
});
