import { describe, expect, it } from '@jest/globals';

import { onlineManager } from '@tanstack/react-query';

import { AppError } from '@/lib/errors';

import { createMockApi } from '../api';

const api = createMockApi({ latencyMs: 0, failureRate: 0, timeoutMs: 1_000, now: () => new Date('2026-11-24T08:00:00Z') });
const session = { kind: 'account', method: 'phone', userId: 'u', displayName: 'You', token: 't' } as const;

describe('mock api', () => {
  it('validates every fixture against its schema', async () => {
    await expect(Promise.all([api.feed(), api.rates(), api.roads(), api.calendar(), api.actions(), api.institutions(), api.storylines(), api.inbox(), api.searchIndex(), api.safetyAlerts()])).resolves.toHaveLength(10);
    await expect(api.regulation('tax-procedures')).resolves.toMatchObject({ status: 'upcoming' });
    await expect(api.directory('emb-be')).resolves.toMatchObject({ timeZone: 'Europe/Brussels' });
    await expect(api.original('bnr-2026-11-02')).resolves.toMatchObject({ provenance: 'reviewed' });
  });

  it('reports missing records as typed not_found errors', async () => {
    await expect(api.regulation('nope')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('fails as a transport error when offline', async () => {
    onlineManager.setOnline(false);
    const err = await api.feed().catch((e: unknown) => e);
    onlineManager.setOnline(true);
    expect(err).toBeInstanceOf(AppError);
    expect(err instanceof AppError && err.isTransport).toBe(true);
  });

  it('runs the SMS code flow with typed failures', async () => {
    await expect(api.sendSmsCode('+32 0')).rejects.toMatchObject({ code: 'invalid_input' });
    const { demoCode } = await api.sendSmsCode('+32470123456');
    await expect(api.verifySmsCode('+32470123456', '000000')).rejects.toMatchObject({ code: 'invalid_code' });
    await expect(api.verifySmsCode('+32470123456', demoCode ?? '')).resolves.toMatchObject({ kind: 'account', method: 'phone' });
    await expect(api.verifySmsCode('+32470123456', demoCode ?? '')).rejects.toMatchObject({ code: 'code_expired' });
  });

  it('never says a claim is false', async () => {
    await expect(api.checkClaim('BNR is forcing everyone cashless')).resolves.toMatchObject({ verdict: 'conflicts' });
    await expect(api.checkClaim('Schools close on Friday')).resolves.toMatchObject({ verdict: 'no_source' });
  });

  it('only accepts reports from accounts', async () => {
    await expect(api.submitReport({ subjectId: 'banknotes', field: 'Cost', reason: 'Outdated', correction: '' }, { kind: 'guest' })).rejects.toMatchObject({ code: 'unauthorized' });
    await expect(api.submitReport({ subjectId: 'banknotes', field: 'Cost', reason: 'Outdated', correction: '' }, session)).resolves.toHaveProperty('receipt');
  });
});
