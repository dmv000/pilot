// Hidden acceptance tests for B-1. Never shown to the agent. Written from the spec before any run.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.ts';

let clock = 1_800_000_000_000;
let server;
let base;
before(async () => {
  server = createServer({ now: () => clock, baseUrl: 'https://sho.rt' });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(r => server.close(r)));

const post = (body, raw = false) => fetch(`${base}/api/links`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw ? body : JSON.stringify(body) });
const get = p => fetch(base + p, { redirect: 'manual' });
const errCode = async res => (await res.json()).error?.code;

test('FR-001 creates a link with a 7-char code and shortUrl', async () => {
  const res = await post({ url: 'https://example.com/a/very/long/path?x=1' });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.match(body.code, /^[A-Za-z0-9]{7}$/);
  assert.equal(body.shortUrl, `https://sho.rt/${body.code}`);
  assert.equal(body.expiresAt, null);
});

test('FR-001 codes are unique across 200 creations, even for the same URL', async () => {
  const codes = new Set();
  for (let i = 0; i < 200; i++) codes.add((await (await post({ url: 'https://example.com/same' })).json()).code);
  assert.equal(codes.size, 200);
});

for (const [label, body] of [['ftp scheme', { url: 'ftp://example.com/f' }], ['not a url', { url: 'not a url' }], ['missing url', {}], ['number', { url: 42 }], ['javascript scheme', { url: 'javascript:alert(1)' }], ['too long', { url: 'https://example.com/' + 'a'.repeat(2030) }]]) {
  test(`FR-002 rejects ${label} with invalid_url`, async () => {
    const res = await post(body);
    assert.equal(res.status, 400);
    assert.equal(await errCode(res), 'invalid_url');
  });
}

test('FR-002 accepts a url of exactly 2048 characters', async () => {
  const url = 'https://example.com/' + 'a'.repeat(2048 - 'https://example.com/'.length);
  assert.equal(url.length, 2048);
  assert.equal((await post({ url })).status, 201);
});

test('FR-002 rejects a body that is not JSON or not an object', async () => {
  let res = await post('{not json', true);
  assert.equal(res.status, 400);
  assert.equal(await errCode(res), 'invalid_body');
  res = await post('[1,2]', true);
  assert.equal(res.status, 400);
  assert.equal(await errCode(res), 'invalid_body');
});

for (const host of ['http://localhost/x', 'http://127.0.0.1/x', 'http://127.8.9.1/x', 'http://10.1.2.3/x', 'http://172.16.0.1/x', 'http://172.31.255.255/x', 'http://192.168.1.10/x', 'http://169.254.169.254/latest', 'http://[::1]/x']) {
  test(`FR-003 refuses private target ${host}`, async () => {
    const res = await post({ url: host });
    assert.equal(res.status, 400);
    assert.equal(await errCode(res), 'forbidden_target');
  });
}

test('FR-003 allows a public address next to a private range', async () => {
  assert.equal((await post({ url: 'http://172.32.0.1/x' })).status, 201);
});

test('FR-004 redirects with 302 and counts clicks', async () => {
  const { code } = await (await post({ url: 'https://example.com/x' })).json();
  const r1 = await get(`/${code}`);
  assert.equal(r1.status, 302);
  assert.equal(r1.headers.get('location'), 'https://example.com/x');
  await get(`/${code}`);
  const stats = await (await get(`/api/links/${code}`)).json();
  assert.equal(stats.clicks, 2);
});

test('FR-005 unknown codes return 404 not_found on both routes', async () => {
  let res = await get('/zzzzzzz');
  assert.equal(res.status, 404);
  assert.equal(await errCode(res), 'not_found');
  res = await get('/api/links/zzzzzzz');
  assert.equal(res.status, 404);
  assert.equal(await errCode(res), 'not_found');
});

for (const v of [0, 59, 31536001, 1.5, '60', -60]) {
  test(`FR-006 rejects expiresInSeconds=${JSON.stringify(v)}`, async () => {
    const res = await post({ url: 'https://example.com/e', expiresInSeconds: v });
    assert.equal(res.status, 400);
    assert.equal(await errCode(res), 'invalid_expiry');
  });
}

test('FR-006 expiry boundary: 302 just before, 410 at expiresAt, clicks unchanged after', async () => {
  const start = clock;
  const res = await post({ url: 'https://example.com/temp', expiresInSeconds: 60 });
  assert.equal(res.status, 201);
  const { code, expiresAt } = await res.json();
  assert.equal(new Date(expiresAt).getTime(), start + 60_000);
  clock = start + 59_999;
  assert.equal((await get(`/${code}`)).status, 302);
  clock = start + 60_000;
  const gone = await get(`/${code}`);
  assert.equal(gone.status, 410);
  assert.equal(await errCode(gone), 'expired');
  clock = start + 120_000;
  await get(`/${code}`);
  const stats = await (await get(`/api/links/${code}`)).json();
  assert.equal(stats.clicks, 1);
  clock = start;
});

test('FR-007 stats include all fields', async () => {
  const { code } = await (await post({ url: 'https://example.com/s', expiresInSeconds: 3600 })).json();
  const res = await get(`/api/links/${code}`);
  assert.equal(res.status, 200);
  const s = await res.json();
  assert.equal(s.code, code);
  assert.equal(s.url, 'https://example.com/s');
  assert.equal(s.clicks, 0);
  assert.ok(!Number.isNaN(Date.parse(s.createdAt)));
  assert.ok(!Number.isNaN(Date.parse(s.expiresAt)));
});

test('FR-008 home page has a labelled URL input in a form', async () => {
  const res = await get('/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  const html = await res.text();
  assert.match(html, /<form[\s>]/i);
  const id = html.match(/<input[^>]*\bid="([^"]+)"/i)?.[1];
  assert.ok(id, 'input has an id');
  assert.match(html, new RegExp(`<label[^>]*for="${id}"`, 'i'));
});

test('FR-009 other methods on /api/links return 405', async () => {
  const res = await fetch(`${base}/api/links`, { method: 'DELETE' });
  assert.equal(res.status, 405);
  assert.equal(await errCode(res), 'method_not_allowed');
});
