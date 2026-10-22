import type { Task } from './store.ts';
import { parseISODate } from './dates.ts';

/** Tasks due on or before the given date (see README). Tasks without a due date are excluded. */
export function filterDueBefore(tasks: Task[], date: Date): Task[] {
  return tasks.filter(t => {
    if (!t.due) return false;
    const due = parseISODate(t.due);
    return due !== null && due.getTime() < date.getTime();
  });
}
