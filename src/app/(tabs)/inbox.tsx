import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { InboxItem } from '@/data/schema';
import { inboxStamp } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { usePrefs } from '@/state/prefs';
import { Icon, type IconName } from '@/ui/icon';
import { LargeTitle, NavBar, NavButton, Screen, useScrollY } from '@/ui/nav';
import { Segmented } from '@/ui/segmented';
import { EmptyState, RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const LEVEL: Record<InboxItem['level'], { color: string; icon: IconName }> = {
  critical: { color: colors.red, icon: 'rain' },
  high: { color: colors.orange, icon: 'refresh' },
  normal: { color: colors.gray, icon: 'megaphone' },
  digest: { color: colors.indigo, icon: 'newspaper' },
  route: { color: colors.tint, icon: 'car' },
};
const VIEWS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
] as const;

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList<InboxItem, { key: string; title: string; sub: string }>);

export default function Inbox() {
  const top = useSafeAreaInsets().top;
  const { scrollY } = useScrollY();
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const inbox = useQuery(q.inbox(useApi()));
  const read = usePrefs((s) => s.read);
  const markRead = usePrefs((s) => s.markRead);
  const [view, setView] = useState<'all' | 'unread'>('all');
  const isRead = (n: InboxItem) => n.seen || Boolean(read[n.id]);
  const items = (inbox.data ?? []).filter((n) => view === 'all' || !isRead(n));
  const sections = [...new Map(items.map((n) => [n.group.key, n.group])).values()].map((g) => ({ ...g, data: items.filter((n) => n.group.key === g.key) }));
  const unread = (inbox.data ?? []).filter((n) => !isRead(n));

  return (
    <Screen bg={colors.white}>
      <NavBar scrollY={scrollY} title="Inbox" right={<NavButton label="Read all" disabled={!unread.length} onPress={() => { haptic.success(); markRead(unread.map((n) => n.id)); }} />} />
      <AnimatedSectionList
        sections={sections}
        keyExtractor={(n) => n.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingTop: top + 44, paddingBottom: 110 }}
        ListHeaderComponent={
          <>
            <LargeTitle title="Inbox" scrollY={scrollY} style={{ paddingTop: 0 }} />
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <Segmented accessibilityLabel="Inbox filter" options={VIEWS} value={view} onChange={setView} />
            </View>
            {inbox.isError && !inbox.data && <RetryLine label="Inbox" error={inbox.error} onRetry={() => inbox.refetch()} />}
          </>
        }
        ListEmptyComponent={inbox.data ? <EmptyState icon="check" title="All caught up" body="New alerts land here, grouped by storyline." /> : undefined}
        renderSectionHeader={({ section }) => (
          <View style={styles.header} accessibilityRole="header">
            <Txt v="fn" w="600">
              {section.title}
            </Txt>
            <Txt v="fn" c={colors.l2}>
              {section.sub}
            </Txt>
          </View>
        )}
        renderItem={({ item }) => <InboxRow item={item} unread={!isRead(item)} onOpen={() => { markRead([item.id]); router.push(toHref(item.link)); }} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </Screen>
  );
}

function InboxRow({ item, unread, onOpen }: { item: InboxItem; unread: boolean; onOpen: () => void }) {
  const level = LEVEL[item.level];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.from}. ${item.title}. ${item.body}`} onPress={onOpen} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
      <View style={[styles.dot, { opacity: unread ? 1 : 0 }]} />
      <View style={[styles.icon, { backgroundColor: level.color }]}>
        <Icon name={level.icon} size={17} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.between}>
          <Txt numberOfLines={1} w={unread ? '600' : '400'} style={{ flex: 1 }}>
            {item.from}
          </Txt>
          <Txt v="fn" c={colors.l2} num>
            {inboxStamp(item.receivedAt)}
          </Txt>
        </View>
        <Txt v="sh" numberOfLines={1} w={unread ? '500' : '400'}>
          {item.title}
        </Txt>
        <Txt v="sh" c={colors.l2} numberOfLines={2}>
          {item.body}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 6, backgroundColor: 'rgba(242,242,247,0.97)' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, paddingLeft: 8, paddingRight: 16, backgroundColor: colors.white },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.tint, marginTop: 14 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.sep, marginLeft: 66 },
});
