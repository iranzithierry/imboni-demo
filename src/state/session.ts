import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { SessionSchema, type Session } from '@/data/schema';
import { AppError, reportError } from '@/lib/errors';

const KEY = 'imboni.session';

type SessionStore = {
  session: Session;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
};

/** The session token lives only in the OS keychain/keystore, never in AsyncStorage. */
export const useSession = create<SessionStore>()((set) => ({
  session: { kind: 'guest' },
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      const parsed = raw ? SessionSchema.safeParse(JSON.parse(raw)) : null;
      set({ session: parsed?.success ? parsed.data : { kind: 'guest' }, hydrated: true });
    } catch (e) {
      reportError(new AppError('unknown', { cause: e, detail: 'session hydrate' }), 'session');
      set({ session: { kind: 'guest' }, hydrated: true });
    }
  },
  signIn: async (session) => {
    await SecureStore.setItemAsync(KEY, JSON.stringify(session), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
    set({ session });
  },
  signOut: async () => {
    await SecureStore.deleteItemAsync(KEY);
    set({ session: { kind: 'guest' } });
  },
}));

export const isAccount = (s: Session): s is Extract<Session, { kind: 'account' }> => s.kind === 'account';
