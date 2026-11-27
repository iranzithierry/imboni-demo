import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language, Situation } from '@/data/schema';
import type { ReminderPlan } from '@/lib/reminders';
import type { Place } from '@/lib/places';

import { PrefsSchema, type Copy, type FollowLevel, type Prefs, type Tracked } from './schema';
import { DEMO_TRACKING } from './seed';

export const DEFAULT_PREFS: Prefs = {
  onboarded: false,
  theme: 'system',
  situations: [],
  studentLevel: null,
  businessSector: null,
  place: { mode: 'rw', district: 'Kicukiro' },
  follows: {},
  storylines: { banknotes: 'important', 'digital-id': 'important', fuel: 'digest' },
  contentLanguage: 'EN',
  alerts: { quietStart: '21:00', quietEnd: '07:00', criticalInQuiet: true, dailyLimit: 5, digest: 'daily' },
  rateAlerts: {},
  advisoryAlerts: { kn3: true },
  offlineCopies: true,
  lowData: false,
  dismissedAlerts: [],
  read: {},
  saved: [],
  muted: [],
  revisionAnswers: {},
  steps: { banknotes: [0] },
  ...DEMO_TRACKING,
};

type Actions = {
  set: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  toggleSituation: (s: Situation) => void;
  setPlace: (place: Place) => void;
  setFollow: (institutionId: string, level: FollowLevel | null) => void;
  setStorylineLevel: (storylineId: string, level: FollowLevel) => void;
  setLanguage: (lang: Language) => void;
  track: (t: Tracked) => void;
  untrack: (actionId: string) => Tracked | null;
  setCopyDone: (actionId: string, copyId: string, doneAt: string | null) => void;
  setNotificationIds: (actionId: string, ids: string[], snoozedUntil?: string | null) => void;
  addPerson: (label: string) => void;
  markRead: (ids: readonly string[]) => void;
  toggleSaved: (feedId: string) => void;
  toggleStep: (actionId: string, index: number) => void;
  toggleMuted: (institutionId: string) => void;
  answerRevision: (key: string, answer: 'kept' | 'reopened') => void;
  addReport: (r: Prefs['reports'][number]) => void;
  completeOnboarding: () => void;
  reset: () => void;
};

export type PrefsStore = Prefs & Actions & { hydrated: boolean };

const updateTracked = (tracked: Prefs['tracked'], actionId: string, fn: (t: Tracked) => Tracked) => {
  const t = tracked[actionId];
  return t ? { ...tracked, [actionId]: fn(t) } : tracked;
};

export const usePrefs = create<PrefsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PREFS,
      hydrated: false,
      set: (key, value) => set({ [key]: value }),
      toggleSituation: (s) => set(({ situations }) => ({ situations: situations.includes(s) ? situations.filter((x) => x !== s) : [...situations, s] })),
      setPlace: (place) => set({ place }),
      setFollow: (id, level) =>
        set(({ follows }) => {
          const next = { ...follows };
          if (level) next[id] = level;
          else delete next[id];
          return { follows: next };
        }),
      setStorylineLevel: (id, level) => set(({ storylines }) => ({ storylines: { ...storylines, [id]: level } })),
      setLanguage: (contentLanguage) => set({ contentLanguage }),
      track: (t) => set(({ tracked }) => ({ tracked: { ...tracked, [t.actionId]: t } })),
      untrack: (actionId) => {
        const existing = get().tracked[actionId] ?? null;
        set(({ tracked }) => {
          const next = { ...tracked };
          delete next[actionId];
          return { tracked: next };
        });
        return existing;
      },
      setCopyDone: (actionId, copyId, doneAt) =>
        set(({ tracked }) => ({
          tracked: updateTracked(tracked, actionId, (t) => ({ ...t, copies: t.copies.map((c: Copy) => (c.id === copyId ? { ...c, doneAt } : c)) })),
        })),
      setNotificationIds: (actionId, ids, snoozedUntil) =>
        set(({ tracked }) => ({ tracked: updateTracked(tracked, actionId, (t) => ({ ...t, notificationIds: ids, snoozedUntil: snoozedUntil === undefined ? t.snoozedUntil : snoozedUntil })) })),
      addPerson: (label) => set(({ people }) => ({ people: people.includes(label) ? people : [...people, label] })),
      markRead: (ids) => set(({ read }) => ({ read: { ...read, ...Object.fromEntries(ids.map((id) => [id, true as const])) } })),
      toggleStep: (actionId, index) =>
        set(({ steps }) => {
          const cur = steps[actionId] ?? [];
          return { steps: { ...steps, [actionId]: cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index] } };
        }),
      toggleSaved: (id) => set(({ saved }) => ({ saved: saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id] })),
      toggleMuted: (id) => set(({ muted }) => ({ muted: muted.includes(id) ? muted.filter((x) => x !== id) : [...muted, id] })),
      answerRevision: (key, answer) => set(({ revisionAnswers }) => ({ revisionAnswers: { ...revisionAnswers, [key]: answer } })),
      addReport: (r) => set(({ reports }) => ({ reports: [r, ...reports] })),
      completeOnboarding: () => set({ onboarded: true }),
      reset: () => set({ ...DEFAULT_PREFS }),
    }),
    {
      name: 'imboni.prefs',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): Prefs => PrefsSchema.parse(s),
      // Persisted data is a boundary: anything that fails the schema falls back to defaults.
      merge: (persisted, current) => {
        const parsed = PrefsSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
      onRehydrateStorage: () => () => usePrefs.setState({ hydrated: true }),
    },
  ),
);

export type { Place, ReminderPlan };
