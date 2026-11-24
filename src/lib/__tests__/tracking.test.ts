import { describe, expect, it } from '@jest/globals';

import { actions } from '@/data/fixtures';
import { ActionSchema } from '@/data/schema';
import { DEMO_TRACKING } from '@/state/seed';

import { deriveTracking, windowRemaining } from '../tracking';

const all = actions.map((a) => ActionSchema.parse(a));

describe('deriveTracking', () => {
  const view = deriveTracking(DEMO_TRACKING.tracked, all, DEMO_TRACKING.archive, '2026-11-24', DEMO_TRACKING.people);

  it('orders to-do by nearest deadline and moves past-due open items to missed', () => {
    expect(view.todo.map((r) => r.action.id)).toEqual(['banknotes', 'vat', 'digital-id']);
    expect(view.missed.map((r) => r.action.id)).toEqual(['hec-scholarship']);
  });

  it('counts open copies per person and lists done copies newest first', () => {
    expect(view.people).toEqual([
      { label: 'Me', open: 2 },
      { label: 'Shop cash box', open: 0 },
      { label: 'Child 1', open: 1 },
      { label: 'Mum', open: 1 },
    ]);
    expect(view.done[0]?.title).toBe('VAT return · October');
  });

  it('computes the remaining share of an action window', () => {
    const banknotes = all.find((a) => a.id === 'banknotes');
    expect(banknotes && Math.round(windowRemaining(banknotes, '2026-11-24') * 100)).toBe(21);
  });
});
