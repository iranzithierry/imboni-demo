import { DUE_DAY_REMINDER_HOUR, REMINDER_HOUR } from '@/config/constants';

import { addDays, daysBetween, formatDate, zonedIso } from './dates';

export type ReminderPlan = 'standard' | 'light' | 'daily';

export const PLAN_COPY: Record<ReminderPlan, { label: string; note: string }> = {
  standard: { label: 'Standard', note: '3 days before, the day before, and 08:00 on the day.' },
  light: { label: 'Light', note: 'One reminder the day before.' },
  daily: { label: 'Daily', note: 'Every morning until done.' },
};

export type Reminder = { ymd: string; at: string };

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

/**
 * Reminder instants for a deadline, tightening near the date. Only future instants are returned,
 * evaluated in the person's time zone so "09:00" means their morning.
 */
export function reminderSchedule(plan: ReminderPlan, deadline: string, today: string, now: Date, timeZone: string): Reminder[] {
  const left = daysBetween(today, deadline);
  if (left < 0) return [];
  const at = (ymd: string, hour: number): Reminder => ({ ymd, at: zonedIso(ymd, hh(hour), timeZone) });
  let out: Reminder[];
  switch (plan) {
    case 'standard':
      out = [at(addDays(deadline, -3), REMINDER_HOUR), at(addDays(deadline, -1), REMINDER_HOUR), at(deadline, DUE_DAY_REMINDER_HOUR)];
      break;
    case 'light':
      out = [at(addDays(deadline, -1), REMINDER_HOUR)];
      break;
    case 'daily':
      out = Array.from({ length: left + 1 }, (_, i) => at(addDays(today, i), i === left ? DUE_DAY_REMINDER_HOUR : REMINDER_HOUR));
      break;
    default: {
      const exhaustive: never = plan;
      return exhaustive;
    }
  }
  return out.filter((r) => new Date(r.at).getTime() > now.getTime());
}

/** Position of each reminder on a today→deadline track (0..1) plus a short label for the timeline. */
export function reminderTicks(reminders: readonly Reminder[], today: string, deadline: string, plan: ReminderPlan) {
  const span = Math.max(1, daysBetween(today, deadline));
  return reminders.map((r) => ({
    key: r.at,
    x: Math.min(1, Math.max(0, daysBetween(today, r.ymd) / span)),
    label: plan === 'daily' ? formatDate.day(r.ymd) : formatDate.weekdayShort(r.ymd).replace(/ \w+$/, ''),
  }));
}
