import { describe, expect, it } from '@jest/globals';

import { searchIndex, synonyms } from '@/data/fixtures';
import { SearchDocSchema } from '@/data/schema';

import { search } from '../search';

const index = searchIndex.map((d) => SearchDocSchema.parse(d));

describe('search', () => {
  it('expands cross-language synonyms and reports them', () => {
    const r = search('banknote', index, synonyms);
    expect(r.alsoMatched).toEqual(['amafaranga', 'billets']);
    expect(r.counts.action).toBe(1);
    expect(r.counts.notice).toBe(2);
    expect(r.docs.some((d) => d.ocr)).toBe(true);
  });

  it('matches across accents and case', () => {
    expect(search('IMPÔTS', index, synonyms).counts.law).toBeGreaterThan(0);
  });

  it('returns nothing for an empty query', () => {
    expect(search('   ', index, synonyms).docs).toEqual([]);
  });
});
