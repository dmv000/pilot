import http from 'node:http';
import { Store } from './store.ts';
import { parseISODate } from './dates.ts';
import { filterDueBefore } from './filter.ts';

const json = (res: http.ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};
const fail = (res: http.ServerResponse, status: number, code: string, message: string) => json(res, status, { error: { code, message } });

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
      return json(res, 200, tasks);
    }

    fail(res, 405, 'method_not_allowed', 'Use GET or POST');
  });
}
