import { router, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';

import type { Session } from '@/data/schema';
import { haptic } from '@/lib/haptics';
import { useSession } from '@/state/session';

/** Where the sign-in flow returns to. Parsed from route params at the boundary. */
const AuthParamsSchema = z.object({
  next: z.enum(['ready', 'me', 'report', 'truth']).catch('ready'),
  id: z.string().optional(),
});
export type AuthParams = z.infer<typeof AuthParamsSchema>;

export function useAuthParams(): AuthParams {
  return AuthParamsSchema.parse(useLocalSearchParams());
}

export function useFinishAuth() {
  const signIn = useSession((s) => s.signIn);
  return async (params: AuthParams, session: Session | null) => {
    if (session) await signIn(session);
    haptic.success();
    if (params.next === 'ready') router.dismissTo('/ready');
    else if (params.next === 'report' && params.id) router.dismissTo({ pathname: '/report/[id]', params: { id: params.id } });
    else if (params.next === 'truth') router.dismissTo('/is-this-true');
    else router.dismissTo('/me');
  };
}
