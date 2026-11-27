import type { Advisory } from '@/data/schema';
import { daysBetween, formatDate, formatTime, ymdIn } from '@/lib/dates';

/** "Tomorrow 08:00–17:00", "Now until 18:00", "Now until Fri 27 Nov, 18:00", "Sun 6 Dec 07:00–10:00" in Kigali time. */
export function advisoryWhen(a: Advisory, now: Date, timeZone: string): string {
  const from = new Date(a.window.from);
  const to = new Date(a.window.to);
  const range = `${formatTime(a.window.from, timeZone)}–${formatTime(a.window.to, timeZone)}`;
  if (from <= now && now < to) {
    const endDay = ymdIn(to, timeZone);
    const ends = daysBetween(ymdIn(now, timeZone), endDay);
    return `Now until ${ends === 0 ? '' : ends === 1 ? 'tomorrow ' : `${formatDate.weekdayShort(endDay)}, `}${formatTime(a.window.to, timeZone)}`;
  }
  const day = ymdIn(from, timeZone);
  const delta = daysBetween(ymdIn(now, timeZone), day);
  return `${delta === 0 ? 'Today' : delta === 1 ? 'Tomorrow' : formatDate.weekdayShort(day)} ${range}`;
}
