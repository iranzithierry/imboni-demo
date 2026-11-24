import type { SearchDoc, SearchKind } from '@/data/schema';

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const tokens = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

export type SearchResult = {
  docs: SearchDoc[];
  /** Synonyms in other languages that were also matched, e.g. "amafaranga" for "banknote". */
  alsoMatched: string[];
  counts: Record<SearchKind | 'all', number>;
};

const prefixHit = (haystack: string[], needle: string) => haystack.some((t) => t.startsWith(needle) || (needle.startsWith(t) && t.length >= 4));

export function search(query: string, index: readonly SearchDoc[], synonyms: readonly (readonly string[])[]): SearchResult {
  const q = tokens(query);
  const empty: SearchResult = { docs: [], alsoMatched: [], counts: { all: 0, action: 0, law: 0, notice: 0, story: 0, dir: 0 } };
  if (!q.length) return empty;
  const expanded = q.map((term) => {
    const group = synonyms.find((g) => g.some((w) => norm(w) === term || norm(w).startsWith(term)));
    return group ? [term, ...group.map(norm)] : [term];
  });
  const alsoMatched = new Set<string>();
  const docs = index.filter((doc) => {
    const hay = tokens(`${doc.title} ${doc.meta} ${doc.text} ${doc.ocr ?? ''}`);
    return expanded.every((alts) => alts.some((a) => prefixHit(hay, a)));
  });
  for (const alts of expanded) {
    for (const a of alts.slice(1)) {
      if (!alts[0] || a.startsWith(alts[0]) || alts[0].startsWith(a)) continue;
      alsoMatched.add(a);
    }
  }
  const counts = { ...empty.counts, all: docs.length };
  for (const d of docs) counts[d.kind] += 1;
  return { docs, alsoMatched: [...alsoMatched].slice(0, 2), counts };
}
