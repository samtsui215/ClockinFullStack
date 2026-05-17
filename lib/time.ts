// lib/time.ts — company-timezone date helpers and session-duration limits.

/** Business timezone — overridable via env without code changes. */
export const COMPANY_TIMEZONE = process.env.COMPANY_TIMEZONE ?? 'America/New_York';

/** A session running longer than this is treated as a forgotten clock-out. */
export const MAX_SESSION_HOURS = 12;
export const MAX_SESSION_MS = MAX_SESSION_HOURS * 60 * 60 * 1000;

/** Business calendar date (YYYY-MM-DD) for an instant, in the company timezone. */
export function businessDate(d: Date | string = new Date()): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  // 'en-CA' formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COMPANY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Day-of-week (0 = Sun … 6 = Sat) for an instant, in the company timezone. */
function businessWeekday(d: Date): number {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: COMPANY_TIMEZONE,
    weekday: 'short',
  }).format(d);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

/** Add `n` days to a YYYY-MM-DD string, returning a YYYY-MM-DD string. */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/**
 * Business date (YYYY-MM-DD) of the Monday that starts the week containing `d`.
 * `weekOffset` shifts whole weeks (-1 = last week).
 */
export function businessWeekStartDate(d: Date = new Date(), weekOffset = 0): string {
  const today = businessDate(d);
  const weekday = businessWeekday(d);
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  return addDays(today, -daysFromMonday + weekOffset * 7);
}
