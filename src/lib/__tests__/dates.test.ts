import { describe, expect, it } from '@jest/globals';

import { addDays, daysBetween, inboxStamp, offsetLabel, offsetMinutes, openState, zonedIso } from '../dates';

describe('dates', () => {
  it('computes zone offsets with DST', () => {
    expect(offsetMinutes(new Date('2026-01-15T12:00:00Z'), 'Europe/Brussels')).toBe(60);
    expect(offsetMinutes(new Date('2026-07-15T12:00:00Z'), 'Europe/Brussels')).toBe(120);
    expect(offsetMinutes(new Date('2026-07-15T12:00:00Z'), 'Africa/Kigali')).toBe(120);
    expect(offsetLabel('America/Toronto', new Date('2026-01-15T12:00:00Z'))).toBe('UTC−5');
    expect(offsetLabel('Europe/London', new Date('2026-01-15T12:00:00Z'))).toBe('UTC+0');
  });

  it('builds instants from wall-clock times in a zone', () => {
    expect(zonedIso('2026-11-25', '08:00', 'Africa/Kigali')).toBe('2026-11-25T06:00:00.000Z');
    expect(zonedIso('2026-07-01', '09:00', 'Europe/Brussels')).toBe('2026-07-01T07:00:00.000Z');
  });

  it('counts calendar days across month and year ends', () => {
    expect(daysBetween('2026-11-24', '2026-11-30')).toBe(6);
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('2026-11-30', '2026-11-24')).toBe(-6);
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });

  it('formats inbox stamps relative to today', () => {
    const now = new Date('2026-11-24T10:00:00Z');
    expect(inboxStamp('2026-11-24T07:02:00Z', now, 'Africa/Kigali')).toBe('09:02');
    expect(inboxStamp('2026-11-08T08:05:00Z', now, 'Africa/Kigali')).toBe('8 Nov');
  });

  it('evaluates office hours in the office zone', () => {
    const hours = [{ days: [1, 2, 3, 4], open: '09:00', close: '16:30' }, { days: [5], open: '09:00', close: '13:00' }];
    // Tue 24 Nov 2026, 10:00 in Brussels.
    expect(openState(hours, 'Europe/Brussels', new Date('2026-11-24T09:00:00Z'))).toEqual({ open: true, closesAt: '16:30' });
    // Sat 28 Nov: closed until Monday.
    expect(openState(hours, 'Europe/Brussels', new Date('2026-11-28T09:00:00Z'))).toEqual({ open: false, opensAt: 'Mon 09:00' });
  });
});
