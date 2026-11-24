import * as Calendar from 'expo-calendar';

import { AppError } from './errors';

export type CalendarItem = { title: string; start: Date; end: Date; allDay: boolean; notes?: string; timeZone?: string };

/** Adds events to the default calendar with write-only access (iOS 17+ never grants read). */
export async function addToCalendar(items: readonly CalendarItem[]): Promise<string[]> {
  const permission = await Calendar.requestCalendarPermissions(true);
  if (!permission.granted) throw new AppError('permission_denied');
  const calendar = Calendar.getDefaultCalendarSync();
  const created = await Promise.all(
    items.map((i) => calendar.createEvent({ title: i.title, startDate: i.start, endDate: i.end, allDay: i.allDay, notes: i.notes, timeZone: i.timeZone })),
  );
  return created.map((e) => e.id);
}
