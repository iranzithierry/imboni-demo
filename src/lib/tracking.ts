import type { Action } from '@/data/schema';
import type { Copy, Tracked } from '@/state/schema';

import { daysBetween } from './dates';

export type TrackRow = { action: Action; tracked: Tracked; daysLeft: number; open: Copy[]; done: Copy[] };
export type DoneRow = { key: string; title: string; doneAt: string };
export type PersonRow = { label: string; open: number };
export type TrackingView = { todo: TrackRow[]; done: DoneRow[]; missed: TrackRow[]; people: PersonRow[] };

/** `people` fixes the order of the People view (the person's own list, "Me" first). */
export function deriveTracking(tracked: Readonly<Record<string, Tracked>>, actions: readonly Action[], archive: readonly { title: string; doneAt: string }[], today: string, people: readonly string[] = []): TrackingView {
  const rows: TrackRow[] = [];
  for (const t of Object.values(tracked)) {
    const action = actions.find((a) => a.id === t.actionId);
    if (!action) continue;
    rows.push({ action, tracked: t, daysLeft: daysBetween(today, action.deadline), open: t.copies.filter((c) => !c.doneAt), done: t.copies.filter((c) => c.doneAt) });
  }
  rows.sort((a, b) => a.daysLeft - b.daysLeft);
  const todo = rows.filter((r) => r.open.length > 0 && r.daysLeft >= 0);
  const missed = rows.filter((r) => r.open.length > 0 && r.daysLeft < 0);
  const done: DoneRow[] = [
    ...rows.flatMap((r) => r.done.flatMap((c) => (c.doneAt ? [{ key: `${r.action.id}:${c.id}`, title: `${r.action.shortTitle} · ${c.label}`, doneAt: c.doneAt }] : []))),
    ...archive.map((a) => ({ key: `archive:${a.title}:${a.doneAt}`, title: a.title, doneAt: a.doneAt })),
  ].sort((a, b) => Date.parse(b.doneAt) - Date.parse(a.doneAt));
  const counts = new Map<string, number>(people.map((p) => [p, 0]));
  for (const r of rows) {
    for (const c of r.tracked.copies) counts.set(c.label, (counts.get(c.label) ?? 0) + (c.doneAt || r.daysLeft < 0 ? 0 : 1));
  }
  return { todo, done, missed, people: [...counts].map(([label, open]) => ({ label, open })) };
}

/** Fraction of the action window still remaining, for countdown rings. */
export function windowRemaining(action: Action, today: string): number {
  const span = Math.max(1, daysBetween(action.phaseStart, action.deadline));
  return Math.min(1, Math.max(0, daysBetween(today, action.deadline) / span));
}
