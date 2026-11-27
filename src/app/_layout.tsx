import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Appearance, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CACHE_SCHEMA_VERSION, QUERY_CACHE_MAX_AGE_MS } from '@/config/constants';
import { queryClient, queryPersister, subscribeAppFocus } from '@/data/query-client';
import { useAppEffects } from '@/features/app-effects';
import { configureNotifications, useNotificationRouting } from '@/lib/notifications';
import { usePrefs } from '@/state/prefs';
import { useSession } from '@/state/session';
import { useHeaderOptions, WEB_COLUMN } from '@/ui/nav';
import { createStyles, useColors, useScheme } from '@/ui/theme';
import { ToastProvider } from '@/ui/toast';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// A cold-start link to a detail screen (a widget tap, a shared link) opens with the index underneath,
// which forwards to Home, so the back button has somewhere to go. It is also where the router lands
// when finishing onboarding flips the guards; the tabs group has no route of its own to land on.
export const unstable_settings = { anchor: 'index' };

const sheet = { presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true, sheetCornerRadius: 16, headerShown: false } as const;
// Modals close with their own button. The JS header on the web and Android would add a back arrow too.
const modal = { presentation: 'modal', ...(Platform.OS === 'ios' ? {} : { headerLeft: () => null }) } as const;

function RootStack() {
  const colors = useColors();
  const header = useHeaderOptions();
  const onboarded = usePrefs((s) => s.onboarded);
  const prefsReady = usePrefs((s) => s.hydrated);
  const sessionReady = useSession((s) => s.hydrated);
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  // A font that fails to load falls back to the system face rather than holding the app on the splash.
  const ready = prefsReady && sessionReady && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  useNotificationRouting(ready && onboarded);
  useAppEffects(ready && onboarded);

  if (!ready) return null;
  return (
    <Stack screenOptions={header}>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="track/[id]" options={modal} />
      <Stack.Screen name="what-changed/[id]" options={modal} />
      <Stack.Screen name="original/[id]" options={modal} />
      <Stack.Screen name="report/[id]" options={modal} />
      <Stack.Screen name="share/[id]" options={{ presentation: 'modal', headerShown: false, contentStyle: { backgroundColor: colors.night } }} />
      <Stack.Screen name="label/[id]" options={sheet} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ presentation: 'modal', headerShown: false }} />
    </Stack>
  );
}

/** The chosen theme drives native chrome (headers, tab bar, switches, sheets) as well as our own views. */
function ThemeRoot({ children }: { children: ReactNode }) {
  const pref = usePrefs((s) => s.theme);
  const scheme = useScheme();
  const colors = useColors();
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(pref === 'system' ? 'auto' : pref);
  }, [pref]);
  const theme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, primary: colors.accent, background: colors.canvas, card: colors.card, text: colors.ink, border: colors.line, notification: colors.accent } };
  }, [scheme, colors]);
  return (
    <ThemeProvider value={theme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  );
}

/** On the web the app keeps a phone-width column instead of stretching rows across a desktop window. */
function WebColumn({ children }: { children: ReactNode }) {
  const styles = useStyles();
  if (Platform.OS !== 'web') return children;
  return (
    <View style={styles.webOuter}>
      <View style={styles.webColumn}>{children}</View>
    </View>
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
      <ThemeRoot>
        <WebColumn>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister: queryPersister,
              maxAge: QUERY_CACHE_MAX_AGE_MS,
              buster: CACHE_SCHEMA_VERSION,
              dehydrateOptions: { shouldDehydrateQuery: (query) => query.state.status === 'success' && usePrefs.getState().offlineCopies },
            }}>
            <ActionSheetProvider>
              <ToastProvider>
                <RootStack />
              </ToastProvider>
            </ActionSheetProvider>
          </PersistQueryClientProvider>
        </WebColumn>
      </ThemeRoot>
    </GestureHandlerRootView>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    webOuter: { flex: 1, backgroundColor: colors.fill, alignItems: 'center' },
    webColumn: { flex: 1, width: '100%', maxWidth: WEB_COLUMN, backgroundColor: colors.canvas, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  }),
);
