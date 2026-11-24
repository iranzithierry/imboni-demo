import { describe, expect, it } from '@jest/globals';

import { reminderSchedule, reminderTicks } from '../reminders';

const TZ = 'Africa/Kigali';
const now = new Date('2026-11-24T07:00:00Z');

describe('reminderSchedule', () => {
  it('standard: 3 days before, the day before at 09:00, and 08:00 on the day', () => {
    const r = reminderSchedule('standard', '2026-11-30', '2026-11-24', now, TZ);
    expect(r.map((x) => x.at)).toEqual(['2026-11-27T07:00:00.000Z', '2026-11-29T07:00:00.000Z', '2026-11-30T06:00:00.000Z']);
  });

  it('daily: every morning until the deadline, skipping instants already past', () => {
    const r = reminderSchedule('daily', '2026-11-26', '2026-11-24', now, TZ);
    // 09:00 Kigali today (07:00Z) equals `now`, so it is dropped.
    expect(r.map((x) => x.ymd)).toEqual(['2026-11-25', '2026-11-26']);
  });

  it('returns nothing once the deadline has passed', () => {
    expect(reminderSchedule('light', '2026-11-15', '2026-11-24', now, TZ)).toEqual([]);
  });

  it('places ticks on the today→deadline track', () => {
    const r = reminderSchedule('standard', '2026-11-30', '2026-11-24', now, TZ);
    const ticks = reminderTicks(r, '2026-11-24', '2026-11-30', 'standard');
    expect(ticks.map((t) => Math.round(t.x * 100))).toEqual([50, 83, 100]);
    expect(ticks[0]?.label).toBe('Fri 27');
  });
});
