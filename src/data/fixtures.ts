/**
 * Demo content transcribed from the design. Square-bracket values are the design's own placeholders
 * for facts that must come from the real source. Map geometry is illustrative, not surveyed.
 * Relative times ("2h ago", "until 18:00") are generated from `now`; real-world dates are absolute.
 */
import type { z } from 'zod';

import { HOME_TIME_ZONE } from '@/config/constants';
import { addDays, formatDate, ymdIn, zonedIso } from '@/lib/dates';

import type {
  ActionSchema,
  CalendarEventSchema,
  ClaimCheckSchema,
  DirectoryEntrySchema,
  FeedItemSchema,
  InboxItemSchema,
  InstitutionDetailSchema,
  InstitutionSchema,
  OriginalSchema,
  RatesSchema,
  RegulationSchema,
  RoadsSchema,
  SafetyAlertSchema,
  SearchDocSchema,
  StorylineSchema,
} from './schema';

type In<T extends z.ZodType> = z.input<T>;

export const institutions: In<typeof InstitutionSchema>[] = [
  { id: 'emb-be', mono: 'EMB', name: 'Embassy of Rwanda', kind: 'Consular desk', color: 'indigo', why: 'Consular notices, enrolment dates', situations: ['abroad'], forAbroad: true, forEveryone: false, directoryId: 'emb-be' },
  { id: 'nida', mono: 'NIDA', name: 'National Identification Agency', kind: 'Civil identification', color: 'teal', why: 'Single Digital ID', situations: ['abroad'], forAbroad: true, forEveryone: false },
  { id: 'mfa', mono: 'MFA', name: 'Ministry of Foreign Affairs', kind: 'Ministry', color: 'purple', why: 'Diaspora programmes', situations: ['abroad'], forAbroad: true, forEveryone: false },
  { id: 'nesa', mono: 'NESA', name: 'National Examination Authority', kind: 'Examinations', color: 'orange', why: 'Exam timetables and results', situations: ['parent', 'student'], forAbroad: false, forEveryone: false },
  { id: 'hec', mono: 'HEC', name: 'Higher Education Council', kind: 'Higher education', color: 'purple', why: 'Scholarships', situations: ['student'], forAbroad: false, forEveryone: false },
  { id: 'reb', mono: 'REB', name: 'Basic Education Board', kind: 'Basic education', color: 'teal', why: 'Curriculum', situations: ['student'], forAbroad: false, forEveryone: false },
  { id: 'mineduc', mono: 'MIN', name: 'Ministry of Education', kind: 'Ministry', color: 'pink', why: 'School calendar and fees', situations: ['parent', 'student'], forAbroad: false, forEveryone: false },
  { id: 'rbc', mono: 'RBC', name: 'Rwanda Biomedical Centre', kind: 'Public health', color: 'red', why: 'Vaccination campaigns', situations: ['parent'], forAbroad: false, forEveryone: false },
  { id: 'bnr', mono: 'BNR', name: 'National Bank of Rwanda', kind: 'Central bank', color: 'brown', why: 'Banknotes and exchange rates', situations: ['business'], forAbroad: false, forEveryone: true, directoryId: 'bnr-currency', nameI18n: { FR: 'Banque nationale du Rwanda', RW: "Banki Nkuru y'u Rwanda" } },
  { id: 'meteo', mono: 'MET', name: 'Meteo Rwanda', kind: 'Weather service', color: 'tint', why: 'Weather warnings', situations: [], forAbroad: false, forEveryone: true },
  { id: 'rnp', mono: 'RNP', name: 'Rwanda National Police', kind: 'Police', color: 'black', why: 'Safety alerts, licences and fines', situations: ['driver'], forAbroad: false, forEveryone: true },
  { id: 'rra', mono: 'RRA', name: 'Rwanda Revenue Authority', kind: 'Tax administration', color: 'tint', why: 'Tax deadlines', situations: ['business'], forAbroad: false, forEveryone: false },
  { id: 'rtda', mono: 'RTDA', name: 'Transport Development Agency', kind: 'Roads', color: 'orange', why: 'Road works and closures', situations: ['driver'], forAbroad: false, forEveryone: false },
  { id: 'cok', mono: 'CoK', name: 'City of Kigali', kind: 'City council', color: 'indigo', why: 'Car Free Day, city roads', situations: ['driver'], forAbroad: false, forEveryone: false },
  { id: 'rura', mono: 'RURA', name: 'Utilities Regulatory Authority', kind: 'Regulator', color: 'teal', why: 'Pump price ceilings', situations: ['driver'], forAbroad: false, forEveryone: false },
  { id: 'rdb', mono: 'RDB', name: 'Rwanda Development Board', kind: 'Investment', color: 'green', why: 'Registration and permits', situations: ['business'], forAbroad: false, forEveryone: false },
  { id: 'rsb', mono: 'RSB', name: 'Rwanda Standards Board', kind: 'Standards', color: 'gray', why: 'Certification', situations: ['business'], forAbroad: false, forEveryone: false },
  { id: 'dgie', mono: 'DGIE', name: 'Immigration and Emigration', kind: 'Immigration', color: 'red', why: 'Passports', situations: ['abroad'], forAbroad: false, forEveryone: false },
];

const placeholderDetails = { who: '[Who it applies to]', where: '[Where to go]', bring: '[What to bring]', cost: '[Cost]' };

export const actions: In<typeof ActionSchema>[] = [
  {
    id: 'banknotes',
    institutionId: 'bnr',
    title: 'Exchange withdrawn banknotes',
    shortTitle: 'Banknotes',
    required: true,
    provenance: 'reviewed',
    icon: 'banknote',
    color: 'brown',
    phaseStart: '2026-11-02',
    deadline: '2026-11-30',
    phases: [
      { label: 'Banks & microfinance', from: '2026-03-02', to: '2026-11-30' },
      { label: 'BNR only', from: '2026-12-01', to: '2027-03-01' },
    ],
    details: { who: 'Anyone with old series', where: 'Any bank or MFI', bring: 'Notes and your ID', cost: 'Free' },
    steps: ['Check which notes are withdrawn', 'Take them to a bank or MFI branch', 'Keep the receipt until credited'],
    checker: {
      source: 'From the withdrawal order of 27 Feb 2026 · Reviewed',
      denominations: [
        { value: '500', gradient: 'note500', dates: [{ label: '[Issue date A]', withdrawn: true }, { label: '[Issue date B]', withdrawn: false }] },
        { value: '1,000', gradient: 'note1000', dates: [{ label: '[Issue date A]', withdrawn: true }, { label: '[Issue date B]', withdrawn: false }] },
        { value: '2,000', gradient: 'note2000', dates: [{ label: '[Issue date A]', withdrawn: true }, { label: '[Issue date B]', withdrawn: false }] },
        { value: '5,000', gradient: 'banknote', dates: [{ label: '1 Feb 2009', withdrawn: true }, { label: '28 Jun 2024', withdrawn: false }] },
      ],
    },
    storylineId: 'banknotes',
    source: { label: 'BNR on X and bnr.rw', publishedAt: '2026-11-02', url: 'https://www.bnr.rw' },
    originalId: 'bnr-2026-11-02',
    titleI18n: { FR: 'Échanger les billets retirés', RW: '[Headline in Kinyarwanda]' },
    revision: {
      rev: 2,
      at: '2026-11-02T16:40:00+02:00',
      changes: [
        { field: 'Bank deadline', before: '2026-11-01', after: '2026-11-30' },
        { field: 'BNR-only phase starts', before: '2026-11-02', after: '2026-12-01' },
      ],
      unchanged: [
        { label: 'Who', value: 'Anyone with old series' },
        { label: 'Where', value: 'Banks and MFIs' },
        { label: 'BNR-only ends', value: '1 Mar 2027' },
        { label: 'Cost', value: 'Free' },
      ],
      history: [
        { rev: 2, title: 'Deadline extended', meta: '2 Nov 2026 · BNR on X, bnr.rw' },
        { rev: 1, title: 'First published', meta: 'Mar 2026 · BNR on X' },
      ],
    },
    directoryId: 'bnr-currency',
    forSituations: ['driver', 'student', 'parent', 'business', 'abroad', 'general'],
    forAbroad: false,
  },
  {
    id: 'vat',
    institutionId: 'rra',
    title: 'File the monthly VAT return',
    shortTitle: 'VAT return',
    required: true,
    provenance: 'reviewed',
    icon: 'doc',
    color: 'tint',
    phaseStart: '2026-11-16',
    deadline: '2026-12-15',
    repeats: 'repeats monthly',
    phases: [],
    details: placeholderDetails,
    steps: ['[First step from RRA guidance]', '[Second step]'],
    checker: null,
    source: { label: 'RRA', publishedAt: '2026-01-05' },
    forSituations: ['business'],
    forAbroad: false,
  },
  {
    id: 'digital-id',
    institutionId: 'nida',
    title: 'Register for the Single Digital ID',
    shortTitle: 'Digital ID',
    required: true,
    provenance: 'reviewed',
    icon: 'idCard',
    color: 'teal',
    phaseStart: '2026-07-18',
    deadline: '2027-06-30',
    phases: [],
    details: placeholderDetails,
    steps: ['[Book an appointment]', '[Enrol in person]'],
    checker: null,
    storylineId: 'digital-id',
    source: { label: 'NIDA', publishedAt: '2026-07-18' },
    directoryId: 'emb-be',
    forSituations: ['abroad', 'parent'],
    forAbroad: true,
  },
  {
    id: 'hec-scholarship',
    institutionId: 'hec',
    title: 'HEC scholarship round',
    shortTitle: 'HEC scholarship',
    required: false,
    provenance: 'reviewed',
    icon: 'graduation',
    color: 'purple',
    phaseStart: '2026-10-15',
    deadline: '2026-11-15',
    phases: [],
    details: placeholderDetails,
    steps: ['[Application step]'],
    checker: null,
    source: { label: 'HEC', publishedAt: '2026-10-15' },
    forSituations: ['student'],
    forAbroad: false,
  },
];

const ago = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

export function feed(now: Date): In<typeof FeedItemSchema>[] {
  return [
    { id: 'f-rra-law', institutionId: 'rra', meta: 'Rwanda Revenue Authority · Law', publishedAt: ago(now, 120), title: 'New tax procedures law published', summary: 'In force 1 Jan 2027. Three changes for VAT-registered importers.', provenance: 'reviewed', important: true, link: { kind: 'regulation', id: 'tax-procedures' } },
    { id: 'f-nesa', institutionId: 'nesa', meta: 'NESA · Schedule', publishedAt: ago(now, 240), title: 'National exam timetable for 2026/27', summary: 'Dates for P6, S3 and S6. Two changes from the draft.', provenance: 'reviewed', important: true, link: { kind: 'calendar' } },
    { id: 'f-bnr-cashless', institutionId: 'bnr', meta: 'Storyline · Old banknotes', publishedAt: '2026-11-08T10:00:00+02:00', title: 'Withdrawal is not part of a cashless push', summary: 'BNR clarifies the purpose. No change to dates.', provenance: 'reviewed', important: false, link: { kind: 'storyline', id: 'banknotes' }, storylineId: 'banknotes' },
    { id: 'f-cok-saturdays', institutionId: 'cok', meta: 'City of Kigali · Notice', publishedAt: ago(now, 1_440), title: 'Nyarugenge one-stop centre opens Saturdays', summary: '08:00 to 13:00 from 1 December.', provenance: 'ai_summary', important: false, link: { kind: 'institution', id: 'cok' } },
  ];
}

export function safetyAlerts(now: Date): In<typeof SafetyAlertSchema>[] {
  return [{ id: `rain-${ymdIn(now, HOME_TIME_ZONE)}`, title: 'Heavy rain warning', area: 'Kigali', advice: 'avoid low roads', issuerId: 'meteo', until: new Date(now.getTime() + 4 * 3_600_000).toISOString() }];
}

export const storylines: In<typeof StorylineSchema>[] = [
  {
    id: 'banknotes',
    title: 'Old banknotes',
    institutionId: 'bnr',
    icon: 'banknote',
    color: 'brown',
    description: 'The withdrawal order, exchange windows, the extension and clarifications.',
    latest: 'Not part of a cashless push · 8 Nov',
    entries: [
      { id: 's-phase2', date: '2026-12-01', kind: 'Scheduled', title: 'Phase 2: BNR only', summary: 'Exchange continues only at the National Bank of Rwanda.', isChange: true },
      { id: 's-cashless', date: '2026-11-08', kind: 'Notice', title: 'Not part of a cashless push', summary: 'BNR clarifies the purpose. Dates unchanged.', isChange: false, link: { kind: 'original', id: 'bnr-2026-11-02' } },
      { id: 's-extended', date: '2026-11-02', kind: 'Update', title: 'Bank deadline extended', summary: 'Four more weeks at banks and MFIs.', isChange: true, diff: { before: '1 Nov', after: '30 Nov 2026' }, link: { kind: 'what_changed', id: 'banknotes' } },
      { id: 's-action', date: '2026-03-02', kind: 'Action', title: 'Exchange withdrawn banknotes', summary: 'Banks first, then BNR only.', isChange: true, link: { kind: 'action', id: 'banknotes' } },
      { id: 's-order', date: '2026-02-27', kind: 'Law', title: 'Order withdrawing old series', summary: 'Lists the issue dates that stop being legal tender.', isChange: true, link: { kind: 'regulation', id: 'banknote-order' } },
    ],
  },
  {
    id: 'digital-id',
    title: 'Single Digital ID',
    institutionId: 'nida',
    icon: 'idCard',
    color: 'teal',
    description: 'Enrolment for the Single Digital ID at home and at embassies.',
    latest: 'Enrolment opens at embassies · 18 Jul',
    entries: [{ id: 's-id-open', date: '2026-07-18', kind: 'Notice', title: 'Enrolment opens at embassies', summary: 'Rwandans abroad can enrol by appointment.', isChange: true, link: { kind: 'action', id: 'digital-id' } }],
  },
  {
    id: 'fuel',
    title: 'Fuel prices',
    institutionId: 'rura',
    icon: 'fuel',
    color: 'orange',
    description: 'Pump price ceilings published by RURA.',
    latest: 'Ceilings raised · 16 Apr',
    entries: [{ id: 's-fuel', date: '2026-04-16', kind: 'Update', title: 'Ceilings raised', summary: 'New pump price ceilings in Kigali.', isChange: true, link: { kind: 'rates' } }],
  },
];

export function inbox(now: Date): In<typeof InboxItemSchema>[] {
  const today = ymdIn(now, HOME_TIME_ZONE);
  return [
    { id: 'n-rain', group: { key: 'safety', title: 'Safety', sub: 'Kigali' }, level: 'critical', from: 'Meteo Rwanda', title: 'Heavy rain warning', body: 'Avoid low-lying roads and drainage channels.', receivedAt: ago(now, 25), seen: false, link: { kind: 'home' } },
    { id: 'n-bnr-reminder', group: { key: 'banknotes', title: 'Old banknotes', sub: 'Storyline' }, level: 'high', from: 'BNR · Reminder', title: '6 days left at banks', body: 'Shop cash box is done. Me is not yet.', receivedAt: zonedIso(today, '08:00', HOME_TIME_ZONE), seen: false, link: { kind: 'action', id: 'banknotes' } },
    { id: 'n-bnr-cashless', group: { key: 'banknotes', title: 'Old banknotes', sub: 'Storyline' }, level: 'normal', from: 'BNR', title: 'Not part of a cashless push', body: 'No change to dates or places.', receivedAt: '2026-11-08T10:05:00+02:00', seen: true, link: { kind: 'storyline', id: 'banknotes' } },
    { id: 'n-route', group: { key: 'route', title: 'Your route', sub: 'Kicukiro → City Centre' }, level: 'route', from: 'City of Kigali', title: 'KN 3 Rd closed tomorrow', body: '08:00–17:00. Diversion via KN 5 Rd.', receivedAt: ago(now, 95), seen: false, link: { kind: 'advisory', id: 'kn3' } },
    { id: 'n-digest', group: { key: 'digest', title: 'Daily digest', sub: 'Yesterday 18:00' }, level: 'digest', from: '6 updates', title: 'RRA, NESA, City of Kigali and 3 more', body: 'Tax procedures law · exam timetable · Saturday hours', receivedAt: zonedIso(addDays(today, -1), '18:00', HOME_TIME_ZONE), seen: true, link: { kind: 'home' } },
  ];
}

// Illustrative coordinates around central Kigali.
const P = (latitude: number, longitude: number) => ({ latitude, longitude });

export function roads(now: Date): In<typeof RoadsSchema> {
  const today = ymdIn(now, HOME_TIME_ZONE);
  const tomorrow = addDays(today, 1);
  return {
    asOf: ago(now, 12),
    route: { label: 'Kicukiro → City Centre', path: [P(-1.9706, 30.1044), P(-1.9640, 30.0960), P(-1.9575, 30.0870), P(-1.9520, 30.0790), P(-1.9470, 30.0700), P(-1.9441, 30.0619)] },
    advisories: [
      {
        id: 'kn3',
        road: 'KN 3 Rd',
        headline: 'KN 3 Rd closed for works',
        status: 'closed',
        window: { from: zonedIso(tomorrow, '08:00', HOME_TIME_ZONE), to: zonedIso(tomorrow, '17:00', HOME_TIME_ZONE) },
        onRoute: true,
        routeOverlap: 'Kicukiro → City Centre · 07:00–09:00 overlaps 1 h',
        issuer: 'City of Kigali',
        provenance: 'reviewed',
        sourceLabel: `City of Kigali on X · ${formatDate.short(addDays(today, -1))}, 18:10`,
        asOf: ago(now, 12),
        marker: P(-1.9548, 30.0830),
        segment: [P(-1.9575, 30.0870), P(-1.9520, 30.0790)],
        diversion: [P(-1.9575, 30.0870), P(-1.9590, 30.0800), P(-1.9545, 30.0745), P(-1.9520, 30.0790)],
        steps: [
          { icon: 'turnRight', title: 'Turn right at the roundabout', detail: 'towards KN 5 Rd' },
          { icon: 'arrowUp', title: 'Continue on KN 5 Rd', detail: 'about 1.2 km' },
          { icon: 'turnLeft', title: 'Rejoin KN 3 Rd', detail: 'past the works' },
        ],
      },
      {
        id: 'kn5',
        road: 'KN 5 Rd',
        headline: 'KN 5 Rd down to one lane',
        status: 'partial',
        window: { from: ago(now, 180), to: zonedIso(today, '18:00', HOME_TIME_ZONE) },
        onRoute: false,
        issuer: 'RTDA',
        provenance: 'official',
        sourceLabel: 'RTDA website',
        asOf: ago(now, 12),
        marker: P(-1.9585, 30.0760),
        segment: [P(-1.9600, 30.0790), P(-1.9570, 30.0730)],
        diversion: [],
        steps: [],
      },
      {
        id: 'cfd',
        road: 'Car Free Day loop',
        headline: 'Car Free Day: loop closed to cars',
        status: 'upcoming',
        window: { from: zonedIso('2026-12-06', '07:00', HOME_TIME_ZONE), to: zonedIso('2026-12-06', '10:00', HOME_TIME_ZONE) },
        onRoute: false,
        issuer: 'City of Kigali',
        provenance: 'official',
        sourceLabel: 'City of Kigali calendar',
        asOf: ago(now, 12),
        marker: P(-1.9500, 30.0590),
        segment: [P(-1.9480, 30.0560), P(-1.9500, 30.0600), P(-1.9530, 30.0620)],
        diversion: [],
        steps: [],
      },
    ],
  };
}

export const calendarEvents: In<typeof CalendarEventSchema>[] = [
  { id: 'cfd-1101', date: '2026-11-01', from: '07:00', to: '10:00', title: 'Car Free Day', who: 'City of Kigali', color: 'green', state: 'took_place' },
  { id: 'cfd-1115', date: '2026-11-15', from: '07:00', to: '10:00', title: 'Car Free Day', who: 'City of Kigali', color: 'green', state: 'took_place' },
  { id: 'umuganda-1128', date: '2026-11-28', from: '08:00', to: '11:00', title: 'Umuganda', who: 'Nationwide · traffic restricted', color: 'purple', state: 'confirmed' },
  { id: 'bnr-1130', date: '2026-11-30', title: 'Banknotes: bank deadline', who: 'BNR · tracking', color: 'red', state: 'deadline' },
  { id: 'bnr-1201', date: '2026-12-01', title: 'Banknotes: BNR only', who: 'BNR · phase 2', color: 'brown', state: 'scheduled' },
  { id: 'cfd-1206', date: '2026-12-06', from: '07:00', to: '10:00', title: 'Car Free Day', who: 'City of Kigali', color: 'green', state: 'expected' },
  { id: 'rra-1215', date: '2026-12-15', title: 'VAT and PAYE due', who: 'RRA · monthly', color: 'tint', state: 'deadline' },
  { id: 'cfd-1220', date: '2026-12-20', from: '07:00', to: '10:00', title: 'Car Free Day', who: 'City of Kigali', color: 'green', state: 'expected' },
  { id: 'umuganda-1226', date: '2026-12-26', from: '08:00', to: '11:00', title: 'Umuganda', who: 'Nationwide', color: 'purple', state: 'expected' },
];

/** Deterministic synthetic history so charts are stable between launches (mock only). */
function history(base: number, drift: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i - (n - 1);
    out.push(base * (1 + drift * t) + Math.sin(i * 1.7) * base * 0.0012 + Math.cos(i * 0.6) * base * 0.0008);
  }
  out[n - 1] = base;
  return out.map((v) => Math.max(v, base * 0.5));
}

export function rates(now: Date): In<typeof RatesSchema> {
  const today = ymdIn(now, HOME_TIME_ZONE);
  return {
    asOf: zonedIso(today, '09:00', HOME_TIME_ZONE),
    nextPublication: 'tomorrow',
    fx: [
      { code: 'USD', name: 'US dollar', value: 1452.18, changePct: 0.12, history: history(1452.18, 0.0004, 250) },
      { code: 'EUR', name: 'Euro', value: 1681.4, changePct: -0.08, history: history(1681.4, -0.0002, 250) },
      { code: 'GBP', name: 'Pound sterling', value: 1912.55, changePct: 0.05, history: history(1912.55, 0.0001, 250) },
      { code: 'KES', name: 'Kenyan shilling', value: 11.24, changePct: 0, history: history(11.24, 0, 250) },
      { code: 'UGX', name: 'Ugandan shilling', value: 0.39, changePct: 0, history: history(0.39, 0, 250) },
    ],
    fuel: {
      announced: '2026-04-16',
      items: [
        { label: 'Petrol / litre', price: 2393, delta: 619, color: 'green' },
        { label: 'Diesel / litre', price: 2368, delta: 588, color: 'yellow' },
      ],
      revisions: [
        { date: '2026-04-16', title: 'Ceilings raised', current: true },
        { date: '2026-04-03', title: 'Ceilings revised', current: false },
      ],
    },
  };
}

export const regulations: In<typeof RegulationSchema>[] = [
  {
    id: 'tax-procedures',
    institutionId: 'rra',
    reference: 'Law N° [number]/2026 · Official Gazette',
    title: { EN: 'Law on tax procedures', FR: 'Loi relative aux procédures fiscales', RW: '[Kinyarwanda title as published]' },
    published: '2026-11-24',
    inForce: '2027-01-01',
    status: 'upcoming',
    audience: 'For VAT-registered importers · reviewed by a coordinator',
    changes: ['[First change in plain words, tied to its article]', '[Second change in plain words, tied to its article]', '[Third change in plain words, tied to its article]'],
    replacesId: 'previous-procedures',
    replacesTitle: 'Previous procedures law',
  },
  { id: 'e-billing', institutionId: 'rra', reference: 'Order N° [number] · Official Gazette', title: { EN: 'Order on electronic billing', FR: '[French title as published]', RW: '[Kinyarwanda title as published]' }, published: '2024-06-01', inForce: '2024-07-01', status: 'in_force', audience: 'VAT-registered businesses', changes: [] },
  { id: 'previous-procedures', institutionId: 'rra', reference: 'Law N° [number] · Official Gazette', title: { EN: 'Previous procedures law', FR: '[French title as published]', RW: '[Kinyarwanda title as published]' }, published: '2019-01-01', inForce: '2019-01-01', status: 'repealed', audience: 'All taxpayers', changes: [] },
  { id: 'banknote-order', institutionId: 'bnr', reference: 'Order of 27 Feb 2026 · Official Gazette', title: { EN: 'Order withdrawing old banknote series', FR: '[French title as published]', RW: '[Kinyarwanda title as published]' }, published: '2026-02-27', inForce: '2026-03-02', status: 'in_force', audience: 'Anyone holding old series', changes: ['Lists the issue dates that stop being legal tender.'] },
];

export const directory: In<typeof DirectoryEntrySchema>[] = [
  {
    id: 'emb-be',
    mono: 'EMB',
    name: 'Embassy of Rwanda in Belgium',
    desk: 'Consular desk',
    city: 'Brussels',
    country: 'Belgium',
    timeZone: 'Europe/Brussels',
    phone: null,
    email: null,
    street: null,
    coordinate: null,
    hours: [
      { label: 'Monday – Thursday', days: [1, 2, 3, 4], open: '09:00', close: '16:30' },
      { label: 'Friday', days: [5], open: '09:00', close: '13:00' },
    ],
    services: [
      { title: 'Single Digital ID enrolment', detail: 'By appointment', icon: 'idCard', color: 'teal', required: true },
      { title: 'Passports', detail: 'Walk-in, mornings', icon: 'plane', color: 'indigo', required: false },
      { title: 'Civil registration', detail: 'Births and marriages abroad', icon: 'people', color: 'pink', required: false },
    ],
    officeHolder: { role: 'Ambassador', name: null },
    verifiedAt: '2026-11-12',
  },
  {
    id: 'bnr-currency',
    mono: 'BNR',
    name: 'BNR currency department',
    desk: 'Currency operations',
    city: 'Kigali',
    country: 'Rwanda',
    timeZone: 'Africa/Kigali',
    phone: null,
    email: null,
    street: null,
    coordinate: null,
    hours: [{ label: 'Monday – Friday', days: [1, 2, 3, 4, 5], open: '08:00', close: '17:00' }],
    services: [],
    officeHolder: { role: 'Governor', name: null },
    verifiedAt: '2026-11-12',
  },
];

export const institutionDetails: In<typeof InstitutionDetailSchema>[] = [
  {
    institutionId: 'rra',
    gradient: 'institution',
    deadlines: [
      { date: '2026-12-15', title: 'VAT return and payment', rule: 'Monthly, by the 15th' },
      { date: '2026-12-15', title: 'PAYE return and payment', rule: 'Monthly, by the 15th' },
      { date: '2026-12-31', title: 'Quarterly prepayment', rule: 'Each quarter' },
      { date: '2027-03-31', title: 'Annual income tax return', rule: 'Yearly' },
    ],
    laws: [
      { regulationId: 'tax-procedures', title: 'Law on tax procedures', meta: 'In force 1 Jan 2027', status: 'upcoming' },
      { regulationId: 'e-billing', title: 'Order on electronic billing', meta: 'No pending changes', status: 'in_force' },
      { regulationId: 'previous-procedures', title: 'Previous procedures law', meta: 'Repealed from 1 Jan 2027', status: 'repealed' },
    ],
    notices: [
      { id: 'rra-closed', title: 'Offices closed 1 and 4 December', meta: 'Notice · 3 days ago' },
      { id: 'rra-webinar', title: 'Webinar on the new procedures law', meta: 'Event · last week' },
    ],
    contacts: [
      { kind: 'phone', title: 'Taxpayer line', value: null },
      { kind: 'mail', title: 'Email', value: null },
      { kind: 'pin', title: 'Headquarters', value: 'Kigali' },
    ],
    verifiedAt: '2026-11-12',
  },
];

export const originals: In<typeof OriginalSchema>[] = [
  {
    id: 'bnr-2026-11-02',
    institutionId: 'bnr',
    reference: 'Ref. [number]',
    dated: 'Kigali, 2 November 2026',
    fields: [
      { id: 'bank-deadline', label: 'Bank deadline', value: '30 Nov 2026', excerpt: '…banks and microfinance institutions until 30 November 2026…', matchedOn: 'Website' },
      { id: 'bnr-only-ends', label: 'BNR-only phase ends', value: '1 Mar 2027', excerpt: '…thereafter at the National Bank of Rwanda until 1 March 2027…', matchedOn: 'Website' },
      { id: 'signed-by', label: 'Signed by', value: 'Governor', excerpt: 'Governor', matchedOn: 'Directory' },
    ],
    post: { author: 'National Bank of Rwanda', handle: '@[handle]', postedAt: '2026-11-02T16:02:00+02:00', text: 'Update on the exchange of withdrawn banknotes. See the attached notice.', edited: true, url: 'https://www.bnr.rw' },
    history: [
      { title: 'Seen on X', detail: 'Post with letter image', time: '16:02', icon: 'eye', color: 'gray' },
      { title: 'Post edited', detail: 'Wording only · no alert', time: '16:20', icon: 'refresh', color: 'gray' },
      { title: 'Same notice on bnr.rw', detail: 'Website copy matches', time: '16:31', icon: 'globe', color: 'tint' },
      { title: 'Reviewed, published', detail: 'Trackers told what changed', time: '16:40', icon: 'shield', color: 'green' },
    ],
    provenance: 'reviewed',
  },
];

export const searchIndex: In<typeof SearchDocSchema>[] = [
  { id: 'sd-action', kind: 'action', title: 'Exchange withdrawn banknotes', meta: 'Required · Tracking', icon: 'banknote', color: 'brown', link: { kind: 'action', id: 'banknotes' }, text: 'exchange withdrawn banknotes old notes banks microfinance' },
  { id: 'sd-order', kind: 'law', title: 'Order withdrawing old banknote series', meta: '27 Feb 2026 · In force', icon: 'doc', color: 'indigo', link: { kind: 'regulation', id: 'banknote-order' }, text: 'order withdrawing old banknote series legal tender issue dates' },
  { id: 'sd-letter', kind: 'notice', title: 'Bank exchange window extended', meta: 'Letter · 2 Nov 2026', icon: 'megaphone', color: 'gray', link: { kind: 'original', id: 'bnr-2026-11-02' }, text: 'bank exchange window extended', ocr: 'exchange of withdrawn banknotes at commercial banks and microfinance institutions' },
  { id: 'sd-cashless', kind: 'notice', title: 'Not part of a cashless push', meta: 'Notice · 8 Nov 2026', icon: 'megaphone', color: 'gray', link: { kind: 'storyline', id: 'banknotes' }, text: 'banknotes withdrawal not part of a cashless push' },
  { id: 'sd-story', kind: 'story', title: 'Old banknotes', meta: '6 updates · latest 8 Nov', icon: 'list', color: 'purple', link: { kind: 'storyline', id: 'banknotes' }, text: 'old banknotes storyline' },
  { id: 'sd-dir', kind: 'dir', title: 'BNR currency department', meta: 'Kigali headquarters', icon: 'bank', color: 'tint', link: { kind: 'directory', id: 'bnr-currency' }, text: 'bnr currency department banknotes exchange' },
  { id: 'sd-tax', kind: 'law', title: 'Law on tax procedures', meta: 'In force 1 Jan 2027', icon: 'doc', color: 'indigo', link: { kind: 'regulation', id: 'tax-procedures' }, text: 'tax procedures law vat importers rra' },
  { id: 'sd-embassy', kind: 'dir', title: 'Embassy of Rwanda in Belgium', meta: 'Consular desk · Brussels', icon: 'bank', color: 'tint', link: { kind: 'directory', id: 'emb-be' }, text: 'embassy belgium brussels consular passport digital id' },
];

/** Cross-language synonyms the search expands ("banknote" also finds amafaranga, billets). */
export const synonyms: readonly (readonly string[])[] = [
  ['banknote', 'banknotes', 'amafaranga', 'billets', 'billet', 'notes'],
  ['tax', 'taxes', 'imisoro', 'impôts'],
  ['embassy', 'ambassade', 'ambasade'],
];

export function claimCheck(message: string): In<typeof ClaimCheckSchema> {
  if (/cashless|banknote|amafaranga|billets|old notes|notes/i.test(message)) {
    return {
      verdict: 'conflicts',
      claimsChecked: 1,
      claimsTotal: 2,
      claim: 'The withdrawal is meant to force everyone cashless.',
      record: 'BNR said on 8 Nov it is not part of a cashless push.',
      unverified: ['“Cash not accepted after January”: no official source found yet.'],
      why: 'Imboni matched the claim against BNR’s reviewed notice of 8 Nov. It only compares with official records; it never labels a message false.',
      source: { institutionId: 'bnr', title: 'Not part of a cashless push', meta: 'Notice · 8 Nov · Reviewed', link: { kind: 'storyline', id: 'banknotes' } },
    };
  }
  return { verdict: 'no_source', claimsChecked: 0, claimsTotal: 1, unverified: ['No official source covers this message yet.'], why: 'No official record from the institutions Imboni follows mentions this. That is not the same as false.' };
}
