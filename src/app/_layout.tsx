import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { QUERY_CACHE_MAX_AGE_MS } from '@/config/constants';
import { queryClient, queryPersister, subscribeAppFocus } from '@/data/query-client';
import { useAppEffects } from '@/features/app-effects';
import { configureNotifications, useNotificationRouting } from '@/lib/notifications';
import { usePrefs } from '@/state/prefs';
import { useSession } from '@/state/session';
import { ToastProvider } from '@/ui/toast';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const modal = { presentation: 'modal' } as const;

function RootStack() {
  const onboarded = usePrefs((s) => s.onboarded);
  const prefsReady = usePrefs((s) => s.hydrated);
  const sessionReady = useSession((s) => s.hydrated);
  const ready = prefsReady && sessionReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  useNotificationRouting(ready && onboarded);
  useAppEffects(ready && onboarded);

  if (!ready) return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Screen name="search" options={{ animation: 'fade' }} />
      <Stack.Screen name="track/[id]" options={modal} />
      <Stack.Screen name="what-changed/[id]" options={modal} />
      <Stack.Screen name="original/[id]" options={modal} />
      <Stack.Screen name="report/[id]" options={modal} />
      <Stack.Screen name="share/[id]" options={modal} />
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" options={modal} />
    </Stack>
  );
}

export default function RootLayout() {
  const hydrateSession = useSession((s) => s.hydrate);
  useEffect(() => {
    hydrateSession();
    configureNotifications().catch(() => undefined);
    return subscribeAppFocus();
  }, [hydrateSession]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{
          persister: queryPersister,
          maxAge: QUERY_CACHE_MAX_AGE_MS,
          dehydrateOptions: { shouldDehydrateQuery: (query) => query.state.status === 'success' && usePrefs.getState().offlineCopies },
        }}>
        <ActionSheetProvider>
          <ToastProvider>
            <RootStack />
          </ToastProvider>
        </ActionSheetProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
