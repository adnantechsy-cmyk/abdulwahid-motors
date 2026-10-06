/** All booking times are Damascus time, whatever the visitor's own timezone is. */
const TZ = 'Asia/Damascus';
const loc = (locale: string) => (locale === 'ar' ? 'ar-SY' : 'en-GB');

/** Today's date in Damascus as YYYY-MM-DD. */
export function damascusToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Calendar arithmetic on a YYYY-MM-DD string (no timezone involved). */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Labels for the date strip. The date is formatted at noon UTC so no timezone can shift it a day. */
export function dayParts(ymd: string, locale: string): { weekday: string; day: string; month: string } {
  const at = new Date(`${ymd}T12:00:00Z`);
  const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc(locale), { timeZone: 'UTC', ...opts }).format(at);
  return { weekday: fmt({ weekday: 'short' }), day: fmt({ day: 'numeric' }), month: fmt({ month: 'short' }) };
}

export function formatLongDate(ymd: string, locale: string): string {
  return new Intl.DateTimeFormat(loc(locale), { timeZone: 'UTC', dateStyle: 'full' }).format(new Date(`${ymd}T12:00:00Z`));
}

export function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(loc(locale), { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
