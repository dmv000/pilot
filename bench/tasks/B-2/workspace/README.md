# Task list API

A small task-list HTTP API. Node.js 24, TypeScript run by type stripping (erasable syntax only), no runtime dependencies.

## API

- `POST /tasks` with `{ "title": string, "due"?: "YYYY-MM-DD" | null }` returns `201` and the task `{ id, title, due, done }`.
- `GET /tasks` lists tasks.
- `GET /tasks?due_before=YYYY-MM-DD` lists tasks due **on or before** that date. Tasks without a due date are excluded.
- Errors: `{ "error": { "code": string, "message": string } }`.

## Develop

```bash
npm install
npm run check:fast
```
