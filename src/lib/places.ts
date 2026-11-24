export type Country = { code: string; name: string; timeZone: string };

/** Countries offered at onboarding. Canada spans zones; Toronto is the default the user can change later. */
export const COUNTRIES: readonly Country[] = [
  { code: 'BE', name: 'Belgium', timeZone: 'Europe/Brussels' },
  { code: 'FR', name: 'France', timeZone: 'Europe/Paris' },
  { code: 'NL', name: 'Netherlands', timeZone: 'Europe/Amsterdam' },
  { code: 'GB', name: 'United Kingdom', timeZone: 'Europe/London' },
  { code: 'CA', name: 'Canada', timeZone: 'America/Toronto' },
  { code: 'KE', name: 'Kenya', timeZone: 'Africa/Nairobi' },
  { code: 'UG', name: 'Uganda', timeZone: 'Africa/Kampala' },
  { code: 'US', name: 'United States', timeZone: 'America/New_York' },
];

export const PROVINCES = [
  { name: 'City of Kigali', districts: ['Gasabo', 'Kicukiro', 'Nyarugenge'] },
  { name: 'Northern', districts: ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'] },
  { name: 'Southern', districts: ['Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango'] },
  { name: 'Eastern', districts: ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana'] },
  { name: 'Western', districts: ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'] },
] as const;

export type Place = { mode: 'abroad'; country: string } | { mode: 'rw'; district: string };

export function countryOf(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function provinceOf(district: string): string | undefined {
  return PROVINCES.find((p) => (p.districts as readonly string[]).includes(district))?.name;
}

export function placeTimeZone(place: Place): string {
  return place.mode === 'abroad' ? (countryOf(place.country)?.timeZone ?? 'Africa/Kigali') : 'Africa/Kigali';
}

export function placeLabel(place: Place): string {
  return place.mode === 'abroad' ? (countryOf(place.country)?.name ?? place.country) : place.district;
}

/** City label for time zones, e.g. "Brussels" from Europe/Brussels. */
export function zoneCity(timeZone: string): string {
  return (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');
}
