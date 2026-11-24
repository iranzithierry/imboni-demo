import { z } from 'zod';

const PublicEnv = z.object({
  EXPO_PUBLIC_MOCK_LATENCY_MS: z.coerce.number().int().min(0).max(10_000).default(450),
  EXPO_PUBLIC_MOCK_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
  EXPO_PUBLIC_SHARE_BASE_URL: z.url().optional(),
});

// EXPO_PUBLIC_* are inlined at build time only when referenced by their literal names.
export const env = PublicEnv.parse({
  EXPO_PUBLIC_MOCK_LATENCY_MS: process.env.EXPO_PUBLIC_MOCK_LATENCY_MS,
  EXPO_PUBLIC_MOCK_FAILURE_RATE: process.env.EXPO_PUBLIC_MOCK_FAILURE_RATE,
  EXPO_PUBLIC_SHARE_BASE_URL: process.env.EXPO_PUBLIC_SHARE_BASE_URL,
});
