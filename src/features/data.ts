import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Institution } from '@/data/schema';
import { deviceTimeZone, todayYmd } from '@/lib/dates';
import { placeTimeZone } from '@/lib/places';
import { usePrefs } from '@/state/prefs';

/** Today's calendar date in the device zone; refreshes when the app returns to foreground. */
export function useToday(): string {
  const [today, setToday] = useState(() => todayYmd());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setToday(todayYmd());
    });
    return () => sub.remove();
  }, []);
  return today;
}

/** Current instant for render paths; ticks every `intervalMs` and on foreground. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [intervalMs]);
  return now;
}

/** Alerts and reminders follow the person's place, not wherever the phone happens to be. */
export function usePlaceTimeZone(): string {
  const place = usePrefs((s) => s.place);
  return place ? placeTimeZone(place) : deviceTimeZone();
}

export function useActions() {
  return useQuery(q.actions(useApi()));
}

export function useInstitutions() {
  return useQuery(q.institutions(useApi()));
}

const UNKNOWN: Institution = { id: 'unknown', mono: '?', name: 'Unknown source', kind: '', sector: 'city', why: '', about: '', situations: [], forAbroad: false, forEveryone: false };

export function useInstitutionLookup() {
  const { data } = useInstitutions();
  return useCallback((id: string): Institution => data?.find((i) => i.id === id) ?? { ...UNKNOWN, id }, [data]);
}

export function useAction(id: string) {
  const { data, ...rest } = useActions();
  return { action: data?.find((a) => a.id === id), ...rest };
}

export function useNotice(id: string) {
  const { data, ...rest } = useQuery(q.notices(useApi()));
  return { notice: data?.find((n) => n.id === id), ...rest };
}

export function useStorylines() {
  return useQuery(q.storylines(useApi()));
}

export function useInboxUnread(): number {
  const { data } = useQuery(q.inbox(useApi()));
  const read = usePrefs((s) => s.read);
  return (data ?? []).filter((n) => !n.seen && !read[n.id]).length;
}
