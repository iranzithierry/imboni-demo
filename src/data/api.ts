import { onlineManager } from '@tanstack/react-query';
import { isValidPhoneNumber } from 'libphonenumber-js/min';
import { createContext, use } from 'react';
import { z } from 'zod';

import { MODULE_TIMEOUT_MS, SMS_CODE_TTL_MINUTES } from '@/config/constants';
import { env } from '@/config/env';
import { AppError, newCorrelationId } from '@/lib/errors';

import * as fx from './fixtures';
import {
  ActionSchema,
  CalendarEventSchema,
  ClaimCheckSchema,
  DirectoryEntrySchema,
  FeedItemSchema,
  InboxItemSchema,
  InstitutionDetailSchema,
  InstitutionSchema,
  NoticeSchema,
  OriginalSchema,
  RatesSchema,
  RegulationSchema,
  ReportReceiptSchema,
  RoadsSchema,
  SafetyAlertSchema,
  SearchDocSchema,
  SessionSchema,
  StorylineSchema,
  type Action,
  type CalendarEvent,
  type ClaimCheck,
  type DirectoryEntry,
  type FeedItem,
  type InboxItem,
  type Institution,
  type InstitutionDetail,
  type Notice,
  type Original,
  type Rates,
  type Regulation,
  type ReportReceipt,
  type Roads,
  type SafetyAlert,
  type SearchDoc,
  type Session,
  type Storyline,
} from './schema';

export type ReportInput = { subjectId: string; field: string; reason: string; correction: string };
export type SignInProvider = 'apple' | 'google';

/** Contract the app depends on. Swap `createMockApi` for an HTTP client without touching screens. */
export interface ImboniApi {
  readonly isMock: boolean;
  safetyAlerts(signal?: AbortSignal): Promise<SafetyAlert[]>;
  feed(signal?: AbortSignal): Promise<FeedItem[]>;
  rates(signal?: AbortSignal): Promise<Rates>;
  roads(signal?: AbortSignal): Promise<Roads>;
  calendar(signal?: AbortSignal): Promise<CalendarEvent[]>;
  actions(signal?: AbortSignal): Promise<Action[]>;
  institutions(signal?: AbortSignal): Promise<Institution[]>;
  institutionDetail(id: string, signal?: AbortSignal): Promise<InstitutionDetail | null>;
  storylines(signal?: AbortSignal): Promise<Storyline[]>;
  notices(signal?: AbortSignal): Promise<Notice[]>;
  regulations(signal?: AbortSignal): Promise<Regulation[]>;
  regulation(id: string, signal?: AbortSignal): Promise<Regulation>;
  directory(id: string, signal?: AbortSignal): Promise<DirectoryEntry>;
  original(id: string, signal?: AbortSignal): Promise<Original>;
  inbox(signal?: AbortSignal): Promise<InboxItem[]>;
  searchIndex(signal?: AbortSignal): Promise<{ docs: SearchDoc[]; synonyms: string[][] }>;
  checkClaim(message: string, signal?: AbortSignal): Promise<ClaimCheck>;
  submitReport(input: ReportInput, session: Session): Promise<ReportReceipt>;
  sendSmsCode(e164: string): Promise<{ expiresAt: string; demoCode: string | null }>;
  verifySmsCode(e164: string, code: string): Promise<Session>;
  signIn(provider: SignInProvider, credential: string | null): Promise<Session>;
  deleteAccount(session: Session): Promise<void>;
}

type MockConfig = { latencyMs: number; failureRate: number; timeoutMs: number; now: () => Date };

/** The code the mock SMS gateway "sends" (the design's example). A real backend never returns it. */
const MOCK_SMS_CODE = '482913';

const wait = (ms: number, signal: AbortSignal | undefined, correlationId: string) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new AppError('cancelled', { correlationId }));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new AppError('cancelled', { correlationId }));
      },
      { once: true },
    );
  });

const timingSafeEqual = (a: string, b: string) => {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
};

export function createMockApi(config: MockConfig): ImboniApi {
  const pendingCodes = new Map<string, number>();

  async function call<S extends z.ZodType>(schema: S, produce: (now: Date) => unknown, signal?: AbortSignal, failable = true): Promise<z.infer<S>> {
    const correlationId = newCorrelationId();
    if (!onlineManager.isOnline()) throw new AppError('network_unavailable', { correlationId });
    const latency = config.latencyMs * (0.6 + Math.random() * 0.8);
    if (latency > config.timeoutMs) {
      await wait(config.timeoutMs, signal, correlationId);
      throw new AppError('timeout', { correlationId });
    }
    await wait(latency, signal, correlationId);
    if (failable && Math.random() < config.failureRate) throw new AppError('server', { correlationId });
    const parsed = schema.safeParse(produce(config.now()));
    if (!parsed.success) throw new AppError('invalid_response', { correlationId, cause: parsed.error });
    return parsed.data;
  }

  const byId = <T extends { id: string }>(list: readonly T[], id: string) => {
    const hit = list.find((x) => x.id === id);
    if (!hit) throw new AppError('not_found', { detail: id });
    return hit;
  };

  const session = (method: 'apple' | 'google' | 'phone', displayName: string) => ({
    kind: 'account' as const,
    method,
    userId: `usr_${newCorrelationId()}`,
    displayName,
    token: `mock.${newCorrelationId()}.${newCorrelationId()}`,
  });

  return {
    isMock: true,
    safetyAlerts: (signal) => call(z.array(SafetyAlertSchema), (now) => fx.safetyAlerts(now), signal),
    feed: (signal) => call(z.array(FeedItemSchema), (now) => fx.feed(now), signal),
    rates: (signal) => call(RatesSchema, (now) => fx.rates(now), signal),
    roads: (signal) => call(RoadsSchema, (now) => fx.roads(now), signal),
    calendar: (signal) => call(z.array(CalendarEventSchema), () => fx.calendarEvents, signal),
    actions: (signal) => call(z.array(ActionSchema), () => fx.actions, signal),
    institutions: (signal) => call(z.array(InstitutionSchema), () => fx.institutions, signal),
    institutionDetail: (id, signal) => call(InstitutionDetailSchema.nullable(), () => fx.institutionDetails.find((d) => d.institutionId === id) ?? null, signal),
    storylines: (signal) => call(z.array(StorylineSchema), () => fx.storylines, signal),
    notices: (signal) => call(z.array(NoticeSchema), (now) => fx.notices(now), signal),
    regulations: (signal) => call(z.array(RegulationSchema), () => fx.regulations, signal),
    regulation: (id, signal) => call(RegulationSchema, () => byId(fx.regulations, id), signal),
    directory: (id, signal) => call(DirectoryEntrySchema, () => byId(fx.directory, id), signal),
    original: (id, signal) => call(OriginalSchema, () => byId(fx.originals, id), signal),
    inbox: (signal) => call(z.array(InboxItemSchema), (now) => fx.inbox(now), signal),
    searchIndex: (signal) =>
      call(z.object({ docs: z.array(SearchDocSchema), synonyms: z.array(z.array(z.string())) }), () => ({ docs: fx.searchIndex, synonyms: fx.synonyms.map((g) => [...g]) }), signal),
    checkClaim: (message, signal) => {
      if (!message.trim()) return Promise.reject(new AppError('invalid_input'));
      return call(ClaimCheckSchema, () => fx.claimCheck(message), signal, false);
    },
    submitReport: (input, s) => {
      if (s.kind !== 'account') return Promise.reject(new AppError('unauthorized'));
      if (!input.reason) return Promise.reject(new AppError('invalid_input'));
      return call(ReportReceiptSchema, (now) => ({ receipt: `R-${String(now.getTime()).slice(-5)}`, receivedAt: now.toISOString() }), undefined, false);
    },
    sendSmsCode: async (e164) => {
      if (!isValidPhoneNumber(e164)) throw new AppError('invalid_input');
      const expiresAt = Date.now() + SMS_CODE_TTL_MINUTES * 60_000;
      pendingCodes.set(e164, expiresAt);
      await call(z.null(), () => null, undefined, false);
      return { expiresAt: new Date(expiresAt).toISOString(), demoCode: MOCK_SMS_CODE };
    },
    verifySmsCode: async (e164, code) => {
      const expiresAt = pendingCodes.get(e164);
      await call(z.null(), () => null, undefined, false);
      if (!expiresAt) throw new AppError('code_expired');
      if (Date.now() > expiresAt) {
        pendingCodes.delete(e164);
        throw new AppError('code_expired');
      }
      if (!timingSafeEqual(code, MOCK_SMS_CODE)) throw new AppError('invalid_code');
      pendingCodes.delete(e164);
      return SessionSchema.parse(session('phone', 'You'));
    },
    signIn: async (provider, credential) => {
      if (provider === 'apple' && !credential) throw new AppError('unauthorized');
      await call(z.null(), () => null, undefined, false);
      return SessionSchema.parse(session(provider, 'You'));
    },
    deleteAccount: async (s) => {
      if (s.kind !== 'account') throw new AppError('unauthorized');
      await call(z.null(), () => null, undefined, false);
    },
  };
}

export const defaultApi = createMockApi({
  latencyMs: env.EXPO_PUBLIC_MOCK_LATENCY_MS,
  failureRate: env.EXPO_PUBLIC_MOCK_FAILURE_RATE,
  timeoutMs: MODULE_TIMEOUT_MS,
  now: () => new Date(),
});

export const ApiContext = createContext<ImboniApi>(defaultApi);
export const useApi = () => use(ApiContext);
