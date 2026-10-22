// Reference solution for B-5. Never shown to the agent.
const MS_PER_DAY = 86_400_000;

function parts(instant: Date, tz: string): Record<string, number> {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(instant)) if (p.type !== 'literal') out[p.type] = Number(p.value);
  return out;
}

export function offsetAt(instant: Date, tz: string): number {
  const p = parts(instant, tz);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - Math.floor(instant.getTime() / 1000) * 1000;
}

export function localDate(instant: Date, tz: string): string {
  const p = parts(instant, tz);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function formatLocal(instant: Date, tz: string): string {
  const p = parts(instant, tz);
  return `${localDate(instant, tz)} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** Convert a local wall-clock time (as a UTC-based number) to an instant: gap -> offset before; overlap -> earlier. */
function fromLocal(localAsUTC: number, tz: string): Date {
  const before = offsetAt(new Date(localAsUTC - MS_PER_DAY), tz);
  const after = offsetAt(new Date(localAsUTC + MS_PER_DAY), tz);
  const candidates = [...new Set([localAsUTC - before, localAsUTC - after])].filter(t => {
    const p = parts(new Date(t), tz);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) === Math.floor(localAsUTC / 1000) * 1000;
  });
  if (candidates.length) return new Date(Math.min(...candidates) + (localAsUTC % 1000));
  return new Date(localAsUTC - before);
}

export function startOfDay(instant: Date, tz: string): Date {
  const p = parts(instant, tz);
  return fromLocal(Date.UTC(p.year, p.month - 1, p.day), tz);
}

export function addDays(instant: Date, days: number, tz: string): Date {
  const p = parts(instant, tz);
  const ms = instant.getTime() % 1000;
  return fromLocal(Date.UTC(p.year, p.month - 1, p.day + days, p.hour, p.minute, p.second) + (ms < 0 ? ms + 1000 : ms), tz);
}
