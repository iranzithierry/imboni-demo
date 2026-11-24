import type { Action } from '@/data/schema';
import { addToCalendar } from '@/lib/calendar';
import { addDays } from '@/lib/dates';
import { reportError, toAppError, type ErrorCode } from '@/lib/errors';
import { cancelReminders, scheduleReminders, snoozeReminders } from '@/lib/notifications';
import type { ReminderPlan } from '@/lib/reminders';
import { usePrefs } from '@/state/prefs';
import type { Tracked } from '@/state/schema';

import { useInstitutionLookup, usePlaceTimeZone, useToday } from './data';

/** Outcome of the OS side effects; tracking itself always succeeds locally. */
export type TrackOutcome = { reminders: 'scheduled' | 'none' | ErrorCode; calendar: 'added' | 'skipped' | ErrorCode };

const copyId = (label: string) => `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`;

export function useTracker() {
  const lookup = useInstitutionLookup();
  const today = useToday();
  const tz = usePlaceTimeZone();
  const track = usePrefs((s) => s.track);
  const untrack = usePrefs((s) => s.untrack);
  const setIds = usePrefs((s) => s.setNotificationIds);
  const setCopyDone = usePrefs((s) => s.setCopyDone);

  const schedule = async (action: Action, t: Pick<Tracked, 'plan'>): Promise<TrackOutcome['reminders']> => {
    try {
      const ids = await scheduleReminders(action, lookup(action.institutionId).mono, t, today, tz);
      setIds(action.id, ids, null);
      return ids.length ? 'scheduled' : 'none';
    } catch (e) {
      const err = toAppError(e);
      if (err.code !== 'permission_denied') reportError(err, 'reminders');
      return err.code;
    }
  };

  return {
    /** Starts tracking, or updates people and plan while keeping each person's done state. */
    async start(action: Action, people: readonly string[], plan: ReminderPlan, withCalendar: boolean): Promise<TrackOutcome> {
      const existing = usePrefs.getState().tracked[action.id];
      if (existing) await cancelReminders(existing.notificationIds);
      const tracked: Tracked = {
        actionId: action.id,
        copies: people.map((label) => existing?.copies.find((c) => c.label === label) ?? { id: copyId(label), label, doneAt: null }),
        plan,
        addToCalendar: withCalendar,
        notificationIds: [],
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        snoozedUntil: null,
      };
      track(tracked);
      const reminders = await schedule(action, tracked);
      let calendar: TrackOutcome['calendar'] = 'skipped';
      if (withCalendar && !existing?.addToCalendar) {
        try {
          const start = new Date(`${action.deadline}T00:00:00`);
          await addToCalendar([{ title: action.title, start, end: new Date(`${addDays(action.deadline, 1)}T00:00:00`), allDay: true, notes: `${lookup(action.institutionId).name} · tracked in Imboni` }]);
          calendar = 'added';
        } catch (e) {
          const err = toAppError(e);
          if (err.code !== 'permission_denied') reportError(err, 'calendar');
          calendar = err.code;
        }
      }
      return { reminders, calendar };
    },
    async stop(actionId: string) {
      const removed = untrack(actionId);
      if (removed) await cancelReminders(removed.notificationIds);
      return removed;
    },
    restore(t: Tracked, action: Action) {
      track({ ...t, notificationIds: [] });
      return schedule(action, t);
    },
    async setDone(action: Action, copy: string, done: boolean) {
      setCopyDone(action.id, copy, done ? new Date().toISOString() : null);
      const t = usePrefs.getState().tracked[action.id];
      if (!t) return;
      // Reminders stop once every copy is done and resume if one is reopened.
      if (t.copies.every((c) => c.doneAt)) {
        await cancelReminders(t.notificationIds);
        setIds(action.id, []);
      } else if (!t.notificationIds.length) await schedule(action, t);
    },
    async snooze(action: Action): Promise<{ until: string } | { error: ErrorCode }> {
      const t = usePrefs.getState().tracked[action.id];
      if (!t) return { error: 'not_found' };
      try {
        const { ids, until } = await snoozeReminders(action, lookup(action.institutionId).mono, t, today, tz);
        setIds(action.id, ids, until);
        return { until };
      } catch (e) {
        return { error: toAppError(e).code };
      }
    },
  };
}
