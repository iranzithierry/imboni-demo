import { z } from 'zod';

import { LanguageSchema, SituationSchema } from '@/data/schema';

export const FollowLevelSchema = z.enum(['all', 'important', 'digest', 'off']);
export type FollowLevel = z.infer<typeof FollowLevelSchema>;

export const ReminderPlanSchema = z.enum(['standard', 'light', 'daily']);

export const CopySchema = z.object({ id: z.string(), label: z.string().min(1).max(40), doneAt: z.iso.datetime({ offset: true }).nullable() });
export type Copy = z.infer<typeof CopySchema>;

export const TrackedSchema = z.object({
  actionId: z.string(),
  copies: z.array(CopySchema).min(1),
  plan: ReminderPlanSchema,
  addToCalendar: z.boolean(),
  notificationIds: z.array(z.string()),
  createdAt: z.iso.datetime({ offset: true }),
  snoozedUntil: z.iso.datetime({ offset: true }).nullable(),
});
export type Tracked = z.infer<typeof TrackedSchema>;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const PlaceSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('abroad'), country: z.string().length(2) }),
  z.object({ mode: z.literal('rw'), district: z.string().min(1) }),
]);

export const PrefsSchema = z.object({
  onboarded: z.boolean(),
  situations: z.array(SituationSchema),
  studentLevel: z.string().nullable(),
  businessSector: z.string().nullable(),
  place: PlaceSchema,
  /** Institution id → alert level. Absent means not followed. */
  follows: z.record(z.string(), FollowLevelSchema),
  storylines: z.record(z.string(), FollowLevelSchema),
  contentLanguage: LanguageSchema,
  alerts: z.object({
    quietStart: hhmm,
    quietEnd: hhmm,
    criticalInQuiet: z.boolean(),
    dailyLimit: z.number().int().min(1).max(20),
    digest: z.enum(['daily', 'weekly']),
  }),
  rateAlerts: z.record(z.string(), z.boolean()),
  advisoryAlerts: z.record(z.string(), z.boolean()),
  offlineCopies: z.boolean(),
  lowData: z.boolean(),
  people: z.array(z.string().min(1).max(40)),
  tracked: z.record(z.string(), TrackedSchema),
  /** Checked step indexes per action. */
  steps: z.record(z.string(), z.array(z.number().int().min(0))),
  archive: z.array(z.object({ title: z.string(), doneAt: z.iso.datetime({ offset: true }) })),
  read: z.record(z.string(), z.literal(true)),
  dismissedAlerts: z.array(z.string()),
  saved: z.array(z.string()),
  muted: z.array(z.string()),
  /** Answers to "was this still done after the change?" keyed by `${actionId}:${rev}:${copyId}`. */
  revisionAnswers: z.record(z.string(), z.enum(['kept', 'reopened'])),
  reports: z.array(z.object({ receipt: z.string(), subject: z.string(), field: z.string(), reason: z.string(), at: z.iso.datetime({ offset: true }), status: z.enum(['received', 'reviewing', 'resolved']) })),
});
export type Prefs = z.infer<typeof PrefsSchema>;
