import { z } from 'zod';

const isoDate = z.iso.date();
const isoDateTime = z.iso.datetime({ offset: true });

export const SituationSchema = z.enum(['driver', 'student', 'parent', 'business', 'abroad', 'general']);
export type Situation = z.infer<typeof SituationSchema>;

export const LanguageSchema = z.enum(['EN', 'FR', 'RW']);
export type Language = z.infer<typeof LanguageSchema>;
export const Localized = z.object({ EN: z.string(), FR: z.string(), RW: z.string() });

/** Key into the bundled photo set (src/data/photos.ts). Unknown keys render no photo. */
const PhotoKey = z.string();

/** User-facing provenance labels. Scores never reach the client. */
export const ProvenanceSchema = z.enum(['official', 'institution_confirmed', 'reviewed', 'ai_summary', 'conflicting', 'updated', 'source_removed', 'withdrawn']);
export type Provenance = z.infer<typeof ProvenanceSchema>;

/** Every in-app link carried by data or push payloads. Mapped to routes in one exhaustive switch. */
export const RouteRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('home') }),
  z.object({ kind: z.literal('action'), id: z.string() }),
  z.object({ kind: z.literal('what_changed'), id: z.string() }),
  z.object({ kind: z.literal('storyline'), id: z.string() }),
  z.object({ kind: z.literal('regulation'), id: z.string() }),
  z.object({ kind: z.literal('original'), id: z.string() }),
  z.object({ kind: z.literal('institution'), id: z.string() }),
  z.object({ kind: z.literal('directory'), id: z.string() }),
  z.object({ kind: z.literal('advisory'), id: z.string() }),
  z.object({ kind: z.literal('notice'), id: z.string() }),
  z.object({ kind: z.literal('alert'), id: z.string() }),
  z.object({ kind: z.literal('calendar') }),
  z.object({ kind: z.literal('rates') }),
  z.object({ kind: z.literal('traffic') }),
  z.object({ kind: z.literal('tracking') }),
  z.object({ kind: z.literal('reports') }),
]);
export type RouteRef = z.infer<typeof RouteRefSchema>;

export const SectorSchema = z.enum(['finance', 'education', 'health', 'transport', 'identity', 'city', 'trade', 'utilities', 'safety', 'abroad']);
export type Sector = z.infer<typeof SectorSchema>;

export const InstitutionSchema = z.object({
  id: z.string(),
  mono: z.string().max(4),
  name: z.string(),
  kind: z.string(),
  sector: SectorSchema,
  why: z.string(),
  about: z.string(),
  situations: z.array(SituationSchema),
  forAbroad: z.boolean(),
  forEveryone: z.boolean(),
  directoryId: z.string().optional(),
  cover: PhotoKey.optional(),
  nameI18n: Localized.partial().optional(),
});
export type Institution = z.infer<typeof InstitutionSchema>;

export const ActionSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  title: z.string(),
  shortTitle: z.string(),
  summary: z.string(),
  required: z.boolean(),
  provenance: ProvenanceSchema,
  icon: z.enum(['banknote', 'doc', 'idCard', 'graduation', 'health', 'store']),
  photo: PhotoKey.optional(),
  phaseStart: isoDate,
  deadline: isoDate,
  /** Recurring rule shown instead of a single date, e.g. monthly filings. */
  repeats: z.string().optional(),
  phases: z.array(z.object({ label: z.string(), from: isoDate, to: isoDate, where: z.string().optional() })),
  details: z.object({ who: z.string(), where: z.string(), bring: z.string(), cost: z.string() }),
  steps: z.array(z.string()),
  /** Official portal the action points to, when it is done online. Imboni never collects the data itself. */
  portal: z.object({ label: z.string(), url: z.url() }).optional(),
  /** Issue-date table from the withdrawal order, when the action has a self-check. */
  checker: z
    .object({
      denominations: z.array(z.object({ value: z.string(), dates: z.array(z.object({ label: z.string(), withdrawn: z.boolean() })) })),
      source: z.string(),
    })
    .nullable(),
  storylineId: z.string().optional(),
  source: z.object({ label: z.string(), publishedAt: isoDate, url: z.url().optional() }),
  originalId: z.string().optional(),
  /** Headline as published in each language, when the source provides it. */
  titleI18n: Localized.partial().optional(),
  revision: z
    .object({
      rev: z.number().int(),
      at: isoDateTime,
      changes: z.array(z.object({ field: z.string(), before: isoDate, after: isoDate })),
      unchanged: z.array(z.object({ label: z.string(), value: z.string() })),
      history: z.array(z.object({ rev: z.number().int(), title: z.string(), meta: z.string() })),
    })
    .optional(),
  directoryId: z.string().optional(),
  forSituations: z.array(SituationSchema),
  forAbroad: z.boolean(),
});
export type Action = z.infer<typeof ActionSchema>;

const FieldSchema = z.object({ label: z.string(), value: z.string() });
export type Field = z.infer<typeof FieldSchema>;
const ChangeSchema = z.object({ field: z.string(), before: z.string(), after: z.string() });
export type Change = z.infer<typeof ChangeSchema>;

export const FeedKindSchema = z.enum(['notice', 'action', 'regulation', 'storyline', 'schedule', 'advisory', 'rate']);
export type FeedKind = z.infer<typeof FeedKindSchema>;

/** One card envelope per record: what the card shows, nothing more. Personal state is overlaid in the app. */
export const FeedItemSchema = z.object({
  id: z.string(),
  kind: FeedKindSchema,
  institutionId: z.string(),
  publishedAt: isoDateTime,
  title: z.string(),
  summary: z.string(),
  provenance: ProvenanceSchema,
  important: z.boolean(),
  link: RouteRefSchema,
  storylineId: z.string().optional(),
  photo: PhotoKey.optional(),
  topics: z.array(z.string()),
  /** Empty means everyone. */
  audience: z.array(SituationSchema),
  /** Up to six kind-specific fields: deadline, status, value, hours. */
  fields: z.array(FieldSchema).max(6),
  change: ChangeSchema.optional(),
  /** Advisory cards carry their own small map. */
  advisoryId: z.string().optional(),
});
export type FeedItem = z.infer<typeof FeedItemSchema>;

export const NoticeSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  title: z.string(),
  summary: z.string(),
  body: z.array(z.string()).min(1),
  topics: z.array(z.string()),
  audience: z.array(SituationSchema),
  provenance: ProvenanceSchema,
  publishedAt: isoDateTime,
  photo: PhotoKey.optional(),
  fields: z.array(FieldSchema),
  storylineId: z.string().optional(),
  originalId: z.string().optional(),
  originalLanguage: LanguageSchema,
  source: z.object({ label: z.string(), url: z.url().optional() }),
  /** Headline and summary as published or translated in the other languages. */
  i18n: z.object({ FR: z.object({ title: z.string(), summary: z.string() }).optional(), RW: z.object({ title: z.string(), summary: z.string() }).optional() }),
});
export type Notice = z.infer<typeof NoticeSchema>;

export const SafetyAlertSchema = z.object({
  id: z.string(),
  severity: z.enum(['warning', 'watch']),
  title: z.string(),
  area: z.string(),
  advice: z.string(),
  steps: z.array(z.string()),
  issuerId: z.string(),
  issuedAt: isoDateTime,
  until: isoDateTime,
  photo: PhotoKey.optional(),
  source: z.string(),
});
export type SafetyAlert = z.infer<typeof SafetyAlertSchema>;

export const StorylineEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  kind: z.enum(['Notice', 'Update', 'Action', 'Law', 'Scheduled']),
  title: z.string(),
  summary: z.string(),
  isChange: z.boolean(),
  diff: z.object({ before: z.string(), after: z.string() }).optional(),
  link: RouteRefSchema.optional(),
});
export const StorylineSchema = z.object({
  id: z.string(),
  title: z.string(),
  institutionId: z.string(),
  icon: z.enum(['banknote', 'idCard', 'fuel', 'law', 'graduation', 'car']),
  cover: PhotoKey.optional(),
  description: z.string(),
  latest: z.string(),
  entries: z.array(StorylineEntrySchema),
});
export type Storyline = z.infer<typeof StorylineSchema>;
export type StorylineEntry = z.infer<typeof StorylineEntrySchema>;

export const InboxItemSchema = z.object({
  id: z.string(),
  group: z.object({ key: z.string(), title: z.string(), sub: z.string() }),
  level: z.enum(['critical', 'high', 'normal', 'digest', 'route', 'report']),
  from: z.string(),
  title: z.string(),
  body: z.string(),
  receivedAt: isoDateTime,
  seen: z.boolean(),
  link: RouteRefSchema,
  change: ChangeSchema.optional(),
});
export type InboxItem = z.infer<typeof InboxItemSchema>;

const LatLngSchema = z.object({ latitude: z.number(), longitude: z.number() });
export type LatLng = z.infer<typeof LatLngSchema>;

export const AdvisorySchema = z.object({
  id: z.string(),
  road: z.string(),
  headline: z.string(),
  status: z.enum(['closed', 'partial', 'diversion', 'upcoming']),
  window: z.object({ from: isoDateTime, to: isoDateTime }),
  reason: z.string(),
  onRoute: z.boolean(),
  routeOverlap: z.string().optional(),
  issuer: z.string(),
  provenance: ProvenanceSchema,
  sourceLabel: z.string(),
  asOf: isoDateTime,
  area: z.string(),
  marker: LatLngSchema,
  segment: z.array(LatLngSchema),
  diversion: z.array(LatLngSchema),
  steps: z.array(z.object({ icon: z.enum(['turnRight', 'arrowUp', 'turnLeft']), title: z.string(), detail: z.string() })),
});
export type Advisory = z.infer<typeof AdvisorySchema>;

export const RoadsSchema = z.object({
  asOf: isoDateTime,
  route: z.object({ label: z.string(), window: z.string(), path: z.array(LatLngSchema) }),
  advisories: z.array(AdvisorySchema),
});
export type Roads = z.infer<typeof RoadsSchema>;

export const EventStateSchema = z.enum(['expected', 'confirmed', 'changed', 'cancelled', 'took_place', 'deadline', 'scheduled']);
export type EventState = z.infer<typeof EventStateSchema>;
export const EventKindSchema = z.enum(['car_free_day', 'umuganda', 'deadline', 'holiday', 'school', 'phase', 'consular']);
export type EventKind = z.infer<typeof EventKindSchema>;
export const CalendarEventSchema = z.object({
  id: z.string(),
  date: isoDate,
  from: z.string().optional(),
  to: z.string().optional(),
  title: z.string(),
  who: z.string(),
  kind: EventKindSchema,
  state: EventStateSchema,
  rule: z.string().optional(),
  note: z.string().optional(),
  link: RouteRefSchema.optional(),
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const RateSchema = z.object({
  code: z.string().length(3),
  name: z.string(),
  value: z.number().positive(),
  changePct: z.number(),
  /** Daily reference values, oldest first, last == value. */
  history: z.array(z.number().positive()).min(2),
});
export type Rate = z.infer<typeof RateSchema>;

export const RatesSchema = z.object({
  asOf: isoDateTime,
  nextPublication: z.string(),
  fx: z.array(RateSchema),
  fuel: z.object({
    announced: isoDate,
    validity: z.string(),
    items: z.array(z.object({ label: z.string(), price: z.number().int(), delta: z.number().int() })),
    revisions: z.array(z.object({ date: isoDate, title: z.string(), detail: z.string(), current: z.boolean() })),
    /** Ceiling per litre at each revision, oldest first; a price holds until the next entry. */
    history: z.array(z.object({ date: isoDate, petrol: z.number().int(), diesel: z.number().int() })).min(2),
  }),
});
export type Rates = z.infer<typeof RatesSchema>;

export const RegulationStatusSchema = z.enum(['upcoming', 'in_force', 'amended', 'repealed']);
export type RegulationStatus = z.infer<typeof RegulationStatusSchema>;

export const RegulationSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  instrument: z.enum(['Law', 'Presidential order', 'Ministerial order', 'Regulation', 'Directive']),
  reference: z.string(),
  title: Localized,
  summary: z.string(),
  published: isoDate,
  inForce: isoDate,
  status: RegulationStatusSchema,
  audience: z.string(),
  changes: z.array(z.string()),
  replacesId: z.string().optional(),
  replacesTitle: z.string().optional(),
  storylineId: z.string().optional(),
  topics: z.array(z.string()),
});
export type Regulation = z.infer<typeof RegulationSchema>;

export const DirectoryEntrySchema = z.object({
  id: z.string(),
  mono: z.string(),
  institutionId: z.string(),
  name: z.string(),
  desk: z.string(),
  city: z.string(),
  country: z.string(),
  timeZone: z.string(),
  phone: z.string().nullable(),
  email: z.email().nullable(),
  street: z.string().nullable(),
  coordinate: LatLngSchema.nullable(),
  photo: PhotoKey.optional(),
  /** ISO weekday 1 (Mon) .. 7 (Sun) → opening window in local time. */
  hours: z.array(z.object({ label: z.string(), days: z.array(z.number().int().min(1).max(7)), open: z.string(), close: z.string() })),
  services: z.array(z.object({ title: z.string(), detail: z.string(), icon: z.enum(['idCard', 'plane', 'people', 'banknote', 'doc', 'store']), required: z.boolean() })),
  officeHolder: z.object({ role: z.string(), name: z.string().nullable() }),
  verifiedAt: isoDate,
});
export type DirectoryEntry = z.infer<typeof DirectoryEntrySchema>;

export const InstitutionDetailSchema = z.object({
  institutionId: z.string(),
  deadlines: z.array(z.object({ date: isoDate, title: z.string(), rule: z.string(), link: RouteRefSchema.optional() })),
  laws: z.array(z.object({ regulationId: z.string(), title: z.string(), meta: z.string(), status: RegulationStatusSchema })),
  notices: z.array(z.object({ id: z.string(), title: z.string(), meta: z.string(), link: RouteRefSchema })),
  contacts: z.array(z.object({ kind: z.enum(['phone', 'mail', 'pin', 'link']), title: z.string(), value: z.string().nullable() })),
  verifiedAt: isoDate,
});
export type InstitutionDetail = z.infer<typeof InstitutionDetailSchema>;

export const OriginalSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  kind: z.enum(['letter', 'post', 'gazette']),
  reference: z.string(),
  dated: z.string(),
  heading: z.string(),
  /** Read text of the document, split into paragraphs; `fieldId` marks a passage a field was taken from. */
  passages: z.array(z.object({ text: z.string(), fieldId: z.string().optional() })),
  signatory: z.string().optional(),
  fields: z.array(z.object({ id: z.string(), label: z.string(), value: z.string(), excerpt: z.string(), matchedOn: z.string() })),
  post: z.object({ author: z.string(), handle: z.string(), postedAt: isoDateTime, text: z.string(), edited: z.boolean(), url: z.url() }),
  history: z.array(z.object({ title: z.string(), detail: z.string(), time: z.string(), icon: z.enum(['eye', 'refresh', 'globe', 'shield']) })),
  provenance: ProvenanceSchema,
});
export type Original = z.infer<typeof OriginalSchema>;

export const SearchKindSchema = z.enum(['action', 'law', 'notice', 'story', 'dir']);
export type SearchKind = z.infer<typeof SearchKindSchema>;
export const SearchDocSchema = z.object({
  id: z.string(),
  kind: SearchKindSchema,
  title: z.string(),
  meta: z.string(),
  link: RouteRefSchema,
  /** Full text including OCR from attached images. */
  text: z.string(),
  ocr: z.string().optional(),
});
export type SearchDoc = z.infer<typeof SearchDocSchema>;

export const ClaimCheckSchema = z.object({
  verdict: z.enum(['matches', 'conflicts', 'no_source']),
  claimsChecked: z.number().int(),
  claimsTotal: z.number().int(),
  claim: z.string().optional(),
  record: z.string().optional(),
  unverified: z.array(z.string()),
  why: z.string(),
  source: z.object({ institutionId: z.string(), title: z.string(), meta: z.string(), link: RouteRefSchema }).optional(),
});
export type ClaimCheck = z.infer<typeof ClaimCheckSchema>;

export const ReportReceiptSchema = z.object({ receipt: z.string(), receivedAt: isoDateTime });
export type ReportReceipt = z.infer<typeof ReportReceiptSchema>;

export const SessionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('guest') }),
  z.object({ kind: z.literal('account'), method: z.enum(['apple', 'google', 'phone']), userId: z.string(), displayName: z.string(), token: z.string() }),
]);
export type Session = z.infer<typeof SessionSchema>;
