import http from 'node:http';
import { Store } from './store.ts';
import { parseISODate } from './dates.ts';
import { filterDueBefore } from './filter.ts';

const json = (res: http.ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};
const fail = (res: http.ServerResponse, status: number, code: string, message: string) => json(res, status, { error: { code, message } });

function intParam(value: string | null, fallback: number, min: number, max: number): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
}

export function createServer(): http.Server {
  const store = new Store();
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (url.pathname !== '/tasks') return fail(res, 404, 'not_found', 'Not found');

    if (req.method === 'POST') {
      let raw = '';
      req.on('data', c => { raw += c; });
      req.on('end', () => {
        let body: { title?: unknown; due?: unknown };
        try { body = JSON.parse(raw); } catch { return fail(res, 400, 'invalid_body', 'Body must be JSON'); }
        if (typeof body.title !== 'string' || body.title.trim() === '') return fail(res, 400, 'invalid_title', 'title is required');
        if (body.due !== undefined && body.due !== null && (typeof body.due !== 'string' || !parseISODate(body.due))) {
          return fail(res, 400, 'invalid_date', 'due must be YYYY-MM-DD');
        }
        json(res, 201, store.add(body.title.trim(), (body.due as string | undefined) ?? null));
      });
      return;
    }

    if (req.method === 'GET') {
      let tasks = store.all();
      const dueBefore = url.searchParams.get('due_before');
      if (dueBefore !== null) {
        const date = parseISODate(dueBefore);
        if (!date) return fail(res, 400, 'invalid_date', 'due_before must be YYYY-MM-DD');
        tasks = filterDueBefore(tasks, date);
      }
      const page = intParam(url.searchParams.get('page'), 1, 1, Number.MAX_SAFE_INTEGER);
      const perPage = intParam(url.searchParams.get('per_page'), 20, 1, 100);
      if (page === null || perPage === null) return fail(res, 400, 'invalid_pagination', 'page >= 1, per_page 1..100');
      tasks.sort((a, b) => a.id - b.id);
      const items = tasks.slice((page - 1) * perPage, page * perPage);
      return json(res, 200, { items, page, per_page: perPage, total: tasks.length });
    }

    fail(res, 405, 'method_not_allowed', 'Use GET or POST');
  });
}
