import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNetInfo } from '@react-native-community/netinfo';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useApi } from '@/data/api';
import { HOME_KEYS, q } from '@/data/queries';
import { useActions, useToday } from '@/features/data';
import { FeedList, useForYou, type FeedFilter } from '@/features/home/feed';
import { DueSoon, ModuleRetry, SafetyBanner, TodayStrip, UpNext } from '@/features/home/modules';
import { ageShort, formatDate, formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { placeLabel } from '@/lib/places';
import { deriveTracking } from '@/lib/tracking';
import { usePrefs } from '@/state/prefs';
import { Tag } from '@/ui/atoms';
import { Rule, SectionHeader } from '@/ui/list';
import { BarTitle, HeaderActions } from '@/ui/nav';
import { UnderlineTabs } from '@/ui/tabs';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, useColors } from '@/ui/theme';

export default function Home() {
  const colors = useColors();
  const styles = useStyles();
  const client = useQueryClient();
  // Only a pull shows the spinner; background refetches on focus would otherwise push the large title down.
  const [pulling, setPulling] = useState(false);
  const net = useNetInfo();
  const offline = net.isConnected === false;
  const today = useToday();
  const actions = useActions();
  const tracked = usePrefs((s) => s.tracked);
  const archive = usePrefs((s) => s.archive);
  const place = usePrefs((s) => s.place);
  const view = actions.data ? deriveTracking(tracked, actions.data, archive, today) : null;
  const feed = useQuery(q.feed(useApi()));
  const { items } = useForYou();
  const saved = usePrefs((s) => s.saved);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const tabs = [
    { value: 'all', label: 'Today' },
    { value: 'important', label: 'Important', count: items.filter((f) => f.important).length },
    { value: 'saved', label: 'Saved', count: items.filter((f) => saved.includes(f.id)).length },
  ] as const;
  const savedAt = feed.dataUpdatedAt ? new Date(feed.dataUpdatedAt).toISOString() : null;

  const refresh = () => {
    haptic.threshold();
    setPulling(true);
    Promise.all(HOME_KEYS.map((key) => client.invalidateQueries({ queryKey: [...key] }))).finally(() => setPulling(false));
  };

  return (
    <>
      <BarTitle title="For you" />
      <HeaderActions actions={[{ icon: 'search', label: 'Search', onPress: () => router.push('/search') }]} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={refresh} tintColor={colors.accent} />}>
        <Txt v="subhead" c={colors.ink2} num style={styles.context}>
          {`${formatDate.weekdayLong(today)} · ${placeLabel(place)}`}
        </Txt>
        {offline && savedAt && (
          <View style={styles.offline}>
            <Tag label={`Offline · saved copy from ${formatTime(savedAt)}`} icon="wifiOff" tone="ink" />
          </View>
        )}
        <View style={{ marginTop: 10 }}>
          <UnderlineTabs accessibilityLabel="Feed" options={tabs} value={filter} onChange={setFilter} />
        </View>
        {filter === 'all' && (
          <>
            <SafetyBanner />
            {actions.isError && !actions.data ? (
              <ModuleRetry label="Your actions" error={actions.error} onRetry={() => actions.refetch()} />
            ) : (
              view?.todo[0] && (
                <>
                  <Rule />
                  <UpNext row={view.todo[0]} today={today} />
                </>
              )
            )}
            {view && view.todo.length > 1 && (
              <>
                <Rule />
                <DueSoon rows={view.todo.slice(1, 4)} today={today} />
              </>
            )}
            <Rule />
            <TodayStrip today={today} offline={offline} />
            <Rule />
            <SectionHeader title="Latest" compact />
          </>
        )}
        <FeedList filter={filter} />
        <Txt v="footnote" c={colors.ink3} center style={styles.updated}>
          {offline ? 'New items load when you’re back online.' : savedAt ? `Updated ${ageShort(savedAt) === 'now' ? 'just now' : `${ageShort(savedAt)} ago`} · Imboni is independent, not a government app` : ''}
        </Txt>
      </ScrollView>
    </>
  );
}

const useStyles = createStyles(() =>
  StyleSheet.create({
    context: { paddingHorizontal: GUTTER, paddingTop: 2 },
    offline: { paddingHorizontal: GUTTER, paddingTop: 12 },
    updated: { paddingTop: 28, paddingHorizontal: GUTTER },
  }),
);
