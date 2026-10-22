// Reference solution for B-1. Never shown to the agent; used only to prove the hidden tests are correct.
import http from 'node:http';
import crypto from 'node:crypto';

type Link = { code: string; url: string; clicks: number; createdAt: number; expiresAt: number | null };
type Options = { now?: () => number; baseUrl?: string };

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h === '::1') return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

export function createServer(options: Options = {}): http.Server {
  const now = options.now ?? Date.now;
  const baseUrl = options.baseUrl ?? 'http://localhost';
  const links = new Map<string, Link>();

  const newCode = (): string => {
    for (;;) {
      const bytes = crypto.randomBytes(7);
      let code = '';
      for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
      if (!links.has(code)) return code;
    }
  };
  const send = (res: http.ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
    res.end(JSON.stringify(body));
  };
  const fail = (res: http.ServerResponse, status: number, code: string, message: string) => send(res, status, { error: { code, message } });
  const iso = (t: number | null) => (t === null ? null : new Date(t).toISOString());

  return http.createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    if (path === '/api/links') {
      if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed', 'Use POST');
      let raw = '';
      req.setEncoding('utf8');
      req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
      req.on('end', () => {
        let body: unknown;
        try { body = JSON.parse(raw); } catch { return fail(res, 400, 'invalid_body', 'Body must be JSON'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(res, 400, 'invalid_body', 'Body must be an object');
        const { url, expiresInSeconds } = body as { url?: unknown; expiresInSeconds?: unknown };
        if (typeof url !== 'string' || url.length > 2048) return fail(res, 400, 'invalid_url', 'Invalid url');
        let parsed: URL;
        try { parsed = new URL(url); } catch { return fail(res, 400, 'invalid_url', 'Invalid url'); }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fail(res, 400, 'invalid_url', 'Only http and https');
        if (isPrivateHost(parsed.hostname)) return fail(res, 400, 'forbidden_target', 'Private address');
        let expiresAt: number | null = null;
        if (expiresInSeconds !== undefined) {
          if (typeof expiresInSeconds !== 'number' || !Number.isInteger(expiresInSeconds) || expiresInSeconds < 60 || expiresInSeconds > 31536000) {
            return fail(res, 400, 'invalid_expiry', 'expiresInSeconds must be an integer from 60 to 31536000');
          }
          expiresAt = now() + expiresInSeconds * 1000;
        }
        const code = newCode();
        links.set(code, { code, url, clicks: 0, createdAt: now(), expiresAt });
        send(res, 201, { code, shortUrl: `${baseUrl}/${code}`, expiresAt: iso(expiresAt) });
      });
      return;
    }
    const stats = path.match(/^\/api\/links\/([A-Za-z0-9]+)$/);
    if (stats && req.method === 'GET') {
      const link = links.get(stats[1]);
      if (!link) return fail(res, 404, 'not_found', 'No such link');
      return send(res, 200, { code: link.code, url: link.url, clicks: link.clicks, createdAt: iso(link.createdAt), expiresAt: iso(link.expiresAt) });
    }
    if (path === '/' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Shorten</title></head><body><main><h1>Shorten a link</h1><form method="post" action="/api/links"><label for="url">Long link</label><input id="url" name="url" type="url" required><button type="submit">Shorten</button></form></main></body></html>');
    }
    const redirect = path.match(/^\/([A-Za-z0-9]+)$/);
    if (redirect && req.method === 'GET') {
      const link = links.get(redirect[1]);
      if (!link) return fail(res, 404, 'not_found', 'No such link');
      if (link.expiresAt !== null && now() >= link.expiresAt) return fail(res, 410, 'expired', 'Link expired');
      link.clicks += 1;
      res.writeHead(302, { location: link.url });
      return res.end();
    }
    fail(res, 404, 'not_found', 'Not found');
  });
}
