import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { WIDGET_TIMELINE_DAYS } from '@/config/constants';
import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { addDays, daysBetween, formatDate, zonedIso } from '@/lib/dates';
import { reportError, toAppError } from '@/lib/errors';
import { toPath } from '@/lib/links';
import { setBadge } from '@/lib/notifications';
import { deriveTracking, windowRemaining } from '@/lib/tracking';
import { usePrefs } from '@/state/prefs';

import { useInboxUnread, useInstitutionLookup, usePlaceTimeZone, useToday } from './data';
import { syncWidgets } from './widget-sync';

/** Side effects that mirror app state onto the OS: badge count and Lock Screen / Home Screen widgets. */
export function useAppEffects(enabled: boolean) {
  const api = useApi();
  const actions = useQuery({ ...q.actions(api), enabled });
  const calendar = useQuery({ ...q.calendar(api), enabled });
  const rates = useQuery({ ...q.rates(api), enabled });
  const tracked = usePrefs((s) => s.tracked);
  const archive = usePrefs((s) => s.archive);
  const unread = useInboxUnread();
  const today = useToday();
  const tz = usePlaceTimeZone();
  const institution = useInstitutionLookup();

  useEffect(() => {
    if (enabled) setBadge(unread);
  }, [enabled, unread]);

  useEffect(() => {
    if (!enabled || !actions.data) return;
    try {
      const next = deriveTracking(tracked, actions.data, archive, today).todo[0];
      const deadline = next
        ? Array.from({ length: Math.min(WIDGET_TIMELINE_DAYS, Math.max(1, daysBetween(today, next.action.deadline) + 1)) }, (_, i) => {
            const day = addDays(today, i);
            return {
              date: new Date(zonedIso(day, '00:00', tz)),
              props: {
                title: next.action.title,
                mono: institution(next.action.institutionId).mono,
                daysLeft: daysBetween(day, next.action.deadline),
                remaining: windowRemaining(next.action, day),
                dueLabel: formatDate.weekdayShort(next.action.deadline),
                url: `imboni://${toPath({ kind: 'action', id: next.action.id })}`,
              },
            };
          })
        : [];
      const upcoming = (calendar.data ?? []).filter((e) => e.date >= today && e.state !== 'cancelled' && e.from).sort((a, b) => a.date.localeCompare(b.date))[0];
      const usd = rates.data?.fx[0];
      syncWidgets({
        deadline,
        nextEvent: upcoming
          ? { day: formatDate.weekday(upcoming.date), title: upcoming.title, time: `${upcoming.from} – ${upcoming.to ?? ''}`.trim(), url: 'imboni:///calendar' }
          : { day: '', title: 'Nothing scheduled', time: '', url: 'imboni:///calendar' },
        rate: usd ? { code: usd.code, value: Math.round(usd.value).toLocaleString('en-GB'), up: usd.changePct >= 0 } : null,
      });
    } catch (e) {
      reportError(toAppError(e), 'widgets');
    }
  }, [enabled, actions.data, calendar.data, rates.data, tracked, archive, today, tz, institution]);
}
