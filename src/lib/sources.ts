import type { Institution, Situation } from '@/data/schema';

import { countryOf, provinceOf, type Place } from './places';

export type SourceGroup = { reason: string; institutions: Institution[] };

const SITUATION_REASON: Record<Exclude<Situation, 'abroad' | 'general'>, string> = {
  parent: 'Because you are a parent',
  driver: 'Because you drive',
  student: 'Because you study',
  business: 'Because you run a business',
};

/**
 * Groups the institutions that affect someone, in the order the onboarding shows them:
 * place first, then each situation, then national sources for everyone. Each institution appears once.
 */
export function suggestSources(situations: readonly Situation[], place: Place, catalog: readonly Institution[]): SourceGroup[] {
  const used = new Set<string>();
  const take = (list: Institution[], max = 3) => {
    const picked = list.filter((i) => !used.has(i.id)).slice(0, max);
    for (const i of picked) used.add(i.id);
    return picked;
  };
  const groups: SourceGroup[] = [];
  if (place.mode === 'abroad') {
    const country = countryOf(place.country)?.name ?? place.country;
    groups.push({ reason: `Because you live in ${country}`, institutions: take(catalog.filter((i) => i.forAbroad)) });
  } else if (provinceOf(place.district) === 'City of Kigali') {
    groups.push({ reason: `Because you live in ${place.district}`, institutions: take(catalog.filter((i) => i.id === 'cok')) });
  }
  for (const s of situations) {
    if (s === 'abroad' || s === 'general') continue;
    groups.push({ reason: SITUATION_REASON[s], institutions: take(catalog.filter((i) => i.situations.includes(s) && !i.forEveryone)) });
  }
  groups.push({ reason: 'For everyone', institutions: take(catalog.filter((i) => i.forEveryone)) });
  return groups.filter((g) => g.institutions.length > 0);
}
