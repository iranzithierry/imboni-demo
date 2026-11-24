import type { Prefs } from './schema';

/**
 * Demo starting state so the tracking, people and done views have content on first launch,
 * matching the design. A real install starts with `tracked: {}`.
 */
export const DEMO_TRACKING: Pick<Prefs, 'tracked' | 'archive' | 'people'> = {
  people: ['Me', 'Shop cash box', 'Child 1', 'Mum'],
  tracked: {
    banknotes: {
      actionId: 'banknotes',
      copies: [
        { id: 'me', label: 'Me', doneAt: null },
        { id: 'shop', label: 'Shop cash box', doneAt: '2026-10-30T10:12:00+02:00' },
      ],
      plan: 'standard',
      addToCalendar: false,
      notificationIds: [],
      createdAt: '2026-10-28T08:00:00+02:00',
      snoozedUntil: null,
    },
    vat: { actionId: 'vat', copies: [{ id: 'me', label: 'Me', doneAt: null }], plan: 'light', addToCalendar: false, notificationIds: [], createdAt: '2026-09-01T08:00:00+02:00', snoozedUntil: null },
    'digital-id': {
      actionId: 'digital-id',
      copies: [
        { id: 'me', label: 'Me', doneAt: '2026-11-12T11:00:00+02:00' },
        { id: 'child1', label: 'Child 1', doneAt: null },
        { id: 'mum', label: 'Mum', doneAt: null },
      ],
      plan: 'light',
      addToCalendar: false,
      notificationIds: [],
      createdAt: '2026-07-20T08:00:00+02:00',
      snoozedUntil: null,
    },
    'hec-scholarship': { actionId: 'hec-scholarship', copies: [{ id: 'child1', label: 'Child 1', doneAt: null }], plan: 'light', addToCalendar: false, notificationIds: [], createdAt: '2026-10-16T08:00:00+02:00', snoozedUntil: null },
  },
  archive: [
    { title: 'VAT return · October', doneAt: '2026-11-13T09:00:00+02:00' },
    { title: 'Renew driving licence', doneAt: '2026-10-02T09:00:00+02:00' },
  ],
};
