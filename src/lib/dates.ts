/** UI copy is English for now; en-GB gives the design's "Tuesday 24 November" ordering. */
export const LOCALE = 'en-GB';
const DAY_MS = 86_400_000;

const parts = (date: Date, timeZone: string) => {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out;
};

/** Calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function ymdIn(date: Date, timeZone: string): string {
  const p = parts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Offset of `timeZone` from UTC at `date`, in minutes (DST-aware, no `shortOffset` dependency). */
export function offsetMinutes(date: Date, timeZone: string): number {
  const p = parts(date, timeZone);
  const wall = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  return Math.round((wall - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000);
}

export function offsetLabel(timeZone: string, at = new Date()): string {
  const m = offsetMinutes(at, timeZone);
  const sign = m < 0 ? '−' : '+';
  const h = Math.floor(Math.abs(m) / 60);
  const min = Math.abs(m) % 60;
  return `UTC${m === 0 ? '+0' : `${sign}${h}${min ? `:${String(min).padStart(2, '0')}` : ''}`}`;
}

/** ISO instant for a wall-clock time on a calendar date in a time zone. */
export function zonedIso(ymd: string, hhmm: string, timeZone: string): string {
  const [y, mo, d] = ymd.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const guess = new Date(Date.UTC(y ?? 0, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0));
  return new Date(guess.getTime() - offsetMinutes(guess, timeZone) * 60_000).toISOString();
}

const utcDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1);
};

export function addDays(ymd: string, days: number): string {
  return new Date(utcDay(ymd) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole calendar days from `fromYmd` to `toYmd` (negative when past). */
export function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((utcDay(toYmd) - utcDay(fromYmd)) / DAY_MS);
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function todayYmd(now = new Date(), timeZone = deviceTimeZone()): string {
  return ymdIn(now, timeZone);
}

/** ISO weekday 1 (Mon) .. 7 (Sun) for a calendar date. */
export function isoWeekday(ymd: string): number {
  const d = new Date(utcDay(ymd)).getUTCDay();
  return d === 0 ? 7 : d;
}

const fmt = (ymd: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', ...options }).format(new Date(utcDay(ymd)));

export const formatDate = {
  /** 30 Nov 2026 */
  long: (ymd: string) => fmt(ymd, { day: 'numeric', month: 'short', year: 'numeric' }),
  /** 30 Nov */
  short: (ymd: string) => fmt(ymd, { day: 'numeric', month: 'short' }),
  /** Mon 30 Nov */
  weekdayShort: (ymd: string) => fmt(ymd, { weekday: 'short', day: 'numeric', month: 'short' }),
  /** Tuesday 24 November */
  weekdayLong: (ymd: string) => fmt(ymd, { weekday: 'long', day: 'numeric', month: 'long' }),
  /** Saturday */
  weekday: (ymd: string) => fmt(ymd, { weekday: 'long' }),
  /** DEC */
  monthTag: (ymd: string) => fmt(ymd, { month: 'short' }).toUpperCase(),
  /** November */
  month: (ymd: string) => fmt(ymd, { month: 'long' }),
  day: (ymd: string) => fmt(ymd, { day: 'numeric' }),
  year: (ymd: string) => fmt(ymd, { year: 'numeric' }),
};

export function formatTime(iso: string, timeZone = deviceTimeZone()): string {
  const p = parts(new Date(iso), timeZone);
  return `${p.hour}:${p.minute}`;
}

/** Compact age for feeds: 2h, 1d, 16d. */
export function ageShort(iso: string, now = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** Inbox timestamps: today → 09:02, this week → Mon, older → 8 Nov. */
export function inboxStamp(iso: string, now = new Date(), timeZone = deviceTimeZone()): string {
  const day = ymdIn(new Date(iso), timeZone);
  const today = ymdIn(now, timeZone);
  const diff = daysBetween(day, today);
  if (diff === 0) return formatTime(iso, timeZone);
  if (diff < 7) return fmt(day, { weekday: 'short' });
  return formatDate.short(day);
}

export function countdownLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

export type OpenState = { open: true; closesAt: string } | { open: false; opensAt: string | null };

/** Whether an office is open now, evaluated in the office's own time zone. */
export function openState(hours: readonly { days: readonly number[]; open: string; close: string }[], timeZone: string, now = new Date()): OpenState {
  const today = ymdIn(now, timeZone);
  const p = parts(now, timeZone);
  const hhmm = `${p.hour}:${p.minute}`;
  const todays = hours.find((h) => h.days.includes(isoWeekday(today)));
  if (todays && hhmm >= todays.open && hhmm < todays.close) return { open: true, closesAt: todays.close };
  for (let i = 0; i < 7; i++) {
    const day = addDays(today, i);
    const h = hours.find((x) => x.days.includes(isoWeekday(day)));
    if (h && (i > 0 || hhmm < h.open)) return { open: false, opensAt: i === 0 ? h.open : `${fmt(day, { weekday: 'short' })} ${h.open}` };
  }
  return { open: false, opensAt: null };
}
