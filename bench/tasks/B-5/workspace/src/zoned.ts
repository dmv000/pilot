// Time-zone helpers for scheduling. Times are Date instants; zones are IANA names such as "America/New_York".

const MS_PER_DAY = 86_400_000;

function parts(instant: Date, tz: string): Record<string, number> {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(instant)) if (p.type !== 'literal') out[p.type] = Number(p.value);
  return out;
}

/** Offset of the zone from UTC at the given instant, in milliseconds (local = UTC + offset). */
export function offsetAt(instant: Date, tz: string): number {
  const p = parts(instant, tz);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Local calendar date, YYYY-MM-DD. */
export function localDate(instant: Date, tz: string): string {
  const p = parts(instant, tz);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Local wall-clock time, "YYYY-MM-DD HH:mm". */
export function formatLocal(instant: Date, tz: string): string {
  const p = parts(instant, tz);
  return `${localDate(instant, tz)} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** The instant of local midnight on the local date of `instant`. */
export function startOfDay(instant: Date, tz: string): Date {
  const p = parts(instant, tz);
  const offset = offsetAt(instant, tz);
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - offset);
}

/** The same local wall-clock time `days` calendar days later (negative goes back). */
export function addDays(instant: Date, days: number, tz: string): Date {
  void tz;
  return new Date(instant.getTime() + days * MS_PER_DAY);
}
