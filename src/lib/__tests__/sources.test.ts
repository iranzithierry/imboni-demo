import { describe, expect, it } from '@jest/globals';

import { institutions } from '@/data/fixtures';
import { InstitutionSchema } from '@/data/schema';

import { suggestSources } from '../sources';

const catalog = institutions.map((i) => InstitutionSchema.parse(i));

describe('suggestSources', () => {
  it('groups a parent living in Belgium the way onboarding shows it', () => {
    const groups = suggestSources(['parent', 'abroad'], { mode: 'abroad', country: 'BE' }, catalog);
    expect(groups.map((g) => g.reason)).toEqual(['Because you live in Belgium', 'Because you are a parent', 'For everyone']);
    expect(groups.map((g) => g.institutions.map((i) => i.mono))).toEqual([
      ['EMB', 'NIDA', 'MFA'],
      ['NESA', 'MIN', 'RBC'],
      ['BNR', 'MET', 'RNP'],
    ]);
  });

  it('never lists an institution twice', () => {
    const groups = suggestSources(['driver', 'business', 'student'], { mode: 'rw', district: 'Kicukiro' }, catalog);
    const ids = groups.flatMap((g) => g.institutions.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(groups[0]?.reason).toBe('Because you live in Kicukiro');
  });
});
