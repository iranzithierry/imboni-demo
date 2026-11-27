import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { InboxItem } from '@/data/schema';
import { ChangeLine } from '@/features/record/parts';
import { inboxStamp } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { usePrefs } from '@/state/prefs';
import { Dot, Skeleton } from '@/ui/atoms';
import { Icon, type IconName } from '@/ui/icon';
import { Rule } from '@/ui/list';
import { BarTitle, HeaderActions } from '@/ui/nav';
import { Highlight } from '@/ui/pressable';
import { UnderlineTabs } from '@/ui/tabs';
import { EmptyState, RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, useColors } from '@/ui/theme';

type Level = InboxItem['level'];

/** Only urgent levels get colour; the word always says the level, so colour is never the only signal. */
const LEVEL: Record<Level, { word: string; icon: IconName; urgent?: boolean }> = {
  critical: { word: 'Critical', icon: 'warning', urgent: true },
  high: { word: 'High', icon: 'exclamation' },
  normal: { word: 'Update', icon: 'megaphone' },
  digest: { word: 'Digest', icon: 'newspaper' },
  route: { word: 'Your route', icon: 'car' },
  report: { word: 'Report', icon: 'flag' },
};

export default function Inbox() {
  const colors = useColors();
  const styles = useStyles();
  const inbox = useQuery(q.inbox(useApi()));
  const read = usePrefs((s) => s.read);
  const markRead = usePrefs((s) => s.markRead);
  const [view, setView] = useState<'all' | 'unread'>('all');
  const [pulling, setPulling] = useState(false);
  const isRead = (n: InboxItem) => n.seen || Boolean(read[n.id]);
  const all = inbox.data ?? [];
  const unread = all.filter((n) => !isRead(n));
  const items = view === 'all' ? all : unread;

  const open = (item: InboxItem) => {
    markRead([item.id]);
    router.push(toHref(item.link));
  };
  const readAll = () => {
    haptic.success();
    markRead(unread.map((n) => n.id));
  };

  return (
    <>
      <BarTitle title="Inbox" />
      {/* Always mounted: on the web the header keeps whatever a removed HeaderActions last set. */}
      <HeaderActions actions={unread.length ? [{ icon: 'check', text: 'Read all', label: 'Mark all as read', onPress: readAll }] : []} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => {
              setPulling(true);
              inbox.refetch().finally(() => setPulling(false));
            }}
            tintColor={colors.accent}
          />
        }>
        <UnderlineTabs
          accessibilityLabel="Inbox filter"
          options={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread', count: unread.length },
          ]}
          value={view}
          onChange={setView}
        />
        {inbox.isError && !inbox.data ? (
          <RetryLine label="Inbox" error={inbox.error} onRetry={() => inbox.refetch()} style={{ marginTop: 16 }} />
        ) : inbox.isPending ? (
          [0, 1, 2].map((i) => (
            <View key={i} style={styles.row} accessibilityLabel="Loading">
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="40%" height={12} />
                <Skeleton width="85%" height={14} />
              </View>
            </View>
          ))
        ) : !items.length ? (
          <EmptyState
            icon="checkCircle"
            art="inbox"
            title="All caught up"
            body="New alerts, reminders and changes to what you track land here."
            action={view === 'unread' && all.length ? { label: 'Show all', onPress: () => setView('all') } : undefined}
          />
        ) : (
          <Animated.View key={view} entering={FadeIn.duration(motion.fast)} layout={LinearTransition.duration(motion.base)}>
            {items.map((item, i) => (
              <Fragment key={item.id}>
                {i > 0 && <Rule style={{ marginLeft: GUTTER }} />}
                <InboxRow item={item} unread={!isRead(item)} onOpen={() => open(item)} />
              </Fragment>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </>
  );
}

/** One notification: who and when on top, then what happened. Unread rows carry a dot and a heavier title. */
function InboxRow({ item, unread, onOpen }: { item: InboxItem; unread: boolean; onOpen: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  const level = LEVEL[item.level];
  const tone = level.urgent ? colors.bad : colors.ink2;
  return (
    <Highlight
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${level.word}. ${item.from}. ${item.title}. ${item.body}`}
      onPress={onOpen}
      pressedStyle={{ backgroundColor: colors.pressed }}
      style={styles.row}>
      <View style={styles.dot}>{unread && <Dot size={8} />}</View>
      <View style={{ flex: 1 }}>
        <View style={styles.meta}>
          <Icon name={level.icon} size={12} color={tone} weight="semibold" />
          <Txt v="caption" c={tone} numberOfLines={1} style={{ flexShrink: 1 }}>
            {`${level.word} · ${item.from}`}
          </Txt>
          <Txt v="caption" c={colors.ink3} num style={{ marginLeft: 'auto' }}>
            {inboxStamp(item.receivedAt)}
          </Txt>
        </View>
        <Txt v="callout" w={unread ? 'semibold' : 'regular'} numberOfLines={2} style={{ marginTop: 4 }}>
          {item.title}
        </Txt>
        <Txt v="subhead" c={colors.ink2} numberOfLines={2} style={{ marginTop: 2 }}>
          {item.body}
        </Txt>
        {item.change && <ChangeLine change={item.change} style={{ marginTop: 10, alignSelf: 'flex-start' }} />}
      </View>
    </Highlight>
  );
}

const useStyles = createStyles(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, paddingRight: GUTTER, paddingLeft: GUTTER - 14 },
    dot: { width: 14, paddingTop: 5, alignItems: 'center' },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  }),
);
