import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNetInfo } from '@react-native-community/netinfo';
import { router } from 'expo-router';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/data/api';
import { HOME_KEYS, q } from '@/data/queries';
import { useActions, useToday } from '@/features/data';
import { ForYou } from '@/features/home/feed';
import { AtAGlance, DueSoon, ModuleRetry, SafetyBanner, UpNext } from '@/features/home/modules';
import { ageShort, formatDate, formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { deriveTracking } from '@/lib/tracking';
import { usePrefs } from '@/state/prefs';
import { useSession } from '@/state/session';
import { CapButton, CircleButton } from '@/ui/button';
import { LargeTitle, NavBar, Screen, useScrollY } from '@/ui/nav';
import { PressableScale } from '@/ui/pressable';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

export default function Home() {
  const top = useSafeAreaInsets().top;
  const { scrollY, onScroll } = useScrollY();
  const client = useQueryClient();
  const refreshing = useIsFetching({ predicate: (query) => HOME_KEYS.some((k) => k[0] === query.queryKey[0]) }) > 0;
  const net = useNetInfo();
  const offline = net.isConnected === false;
  const today = useToday();
  const actions = useActions();
  const tracked = usePrefs((s) => s.tracked);
  const archive = usePrefs((s) => s.archive);
  const session = useSession((s) => s.session);
  const view = actions.data ? deriveTracking(tracked, actions.data, archive, today) : null;
  const feed = useQuery(q.feed(useApi()));
  const savedAt = feed.dataUpdatedAt ? new Date(feed.dataUpdatedAt).toISOString() : null;

  const refresh = () => {
    haptic.threshold();
    for (const key of HOME_KEYS) client.invalidateQueries({ queryKey: [...key] });
  };

  return (
    <Screen>
      <NavBar scrollY={scrollY} title="Today" />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingTop: top, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} progressViewOffset={top} />}>
        {offline && savedAt && (
          <View style={styles.offline}>
            <CapButton label={`Offline · saved copy from ${formatTime(savedAt)}`} icon="wifiOff" variant="dark" height={32} />
          </View>
        )}
        <LargeTitle
          title="Today"
          caption={formatDate.weekdayLong(today)}
          scrollY={scrollY}
          style={{ paddingTop: 6 }}
          accessory={
            <View style={styles.headerButtons}>
              <CircleButton icon="search" label="Search" variant="card" size={36} onPress={() => router.push('/search')} />
              <PressableScale accessibilityRole="button" accessibilityLabel="Profile" onPress={() => router.navigate('/me')} style={styles.avatar}>
                <Txt v="sh" w="700" c={colors.white}>
                  {session.kind === 'account' ? (session.displayName[0] ?? 'Y') : 'G'}
                </Txt>
              </PressableScale>
            </View>
          }
        />
        <SafetyBanner />
        {actions.isError && !actions.data ? (
          <ModuleRetry label="Your actions" error={actions.error} onRetry={() => actions.refetch()} />
        ) : (
          view?.todo[0] && <UpNext row={view.todo[0]} today={today} />
        )}
        {view && <DueSoon rows={view.todo.slice(1, 4)} today={today} />}
        <AtAGlance today={today} offline={offline} />
        <ForYou />
        <Txt v="fn" c={colors.l2} center style={{ paddingTop: 18, paddingBottom: 8 }}>
          {offline ? 'New items load when you’re back online.' : savedAt ? `Updated ${ageShort(savedAt) === 'now' ? 'just now' : `${ageShort(savedAt)} ago`}` : ''}
        </Txt>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  offline: { alignItems: 'center', paddingTop: 4 },
  headerButtons: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.indigo, alignItems: 'center', justifyContent: 'center' },
});
