// Calendar dates are plain YYYY-MM-DD strings, compared as UTC midnight.

/** Parses YYYY-MM-DD into a Date at UTC midnight. Returns null for anything invalid (including 2026-02-30). */
export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

export function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
