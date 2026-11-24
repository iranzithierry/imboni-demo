import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { useActions, useToday } from '@/features/data';
import { SwipeRow } from '@/features/tracking/swipe-row';
import { useTracker } from '@/features/tracking';
import { formatDate, formatTime } from '@/lib/dates';
import { userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { deriveTracking, type TrackRow } from '@/lib/tracking';
import { usePrefs } from '@/state/prefs';
import { Initials, Radio, Tile } from '@/ui/atoms';
import { CapButton, CircleButton } from '@/ui/button';
import { Icon, type IconName } from '@/ui/icon';
import { Cell, Group, GroupFooter, INSET, SectionTitle } from '@/ui/list';
import { LargeTitle, NavBar, Screen, useScrollY } from '@/ui/nav';
import { PressableScale } from '@/ui/pressable';
import { RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors, swatch, type Swatch } from '@/ui/theme';
import { useToast } from '@/ui/toast';

type Tab = 'todo' | 'done' | 'missed' | 'people';
const TABS: Record<Tab, { label: string; color: Swatch; icon: IconName }> = {
  todo: { label: 'To do', color: 'tint', icon: 'clock' },
  done: { label: 'Done', color: 'green', icon: 'check' },
  missed: { label: 'Missed', color: 'red', icon: 'exclamation' },
  people: { label: 'People', color: 'orange', icon: 'people' },
};
const PALETTE: Swatch[] = ['tint', 'orange', 'pink', 'teal', 'purple'];

export default function Tracking() {
  const top = useSafeAreaInsets().top;
  const { scrollY, onScroll } = useScrollY();
  const [tab, setTab] = useState<Tab>('todo');
  const today = useToday();
  const actions = useActions();
  const storylines = useQuery(q.storylines(useApi()));
  const tracked = usePrefs((s) => s.tracked);
  const archive = usePrefs((s) => s.archive);
  const followed = usePrefs((s) => s.storylines);
  const tracker = useTracker();
  const toast = useToast();
  const people = usePrefs((s) => s.people);
  const view = actions.data ? deriveTracking(tracked, actions.data, archive, today, people) : null;
  const counts: Record<Tab, number> = { todo: view?.todo.length ?? 0, done: view?.done.length ?? 0, missed: view?.missed.length ?? 0, people: view?.people.length ?? 0 };

  const markDone = async (row: TrackRow) => {
    const copy = row.open.find((c) => c.label === 'Me') ?? row.open[0];
    if (!copy) return;
    haptic.success();
    await tracker.setDone(row.action, copy.id, true);
    toast({ message: `Marked done for ${copy.label}`, icon: 'checkCircle', aboveTabBar: true, action: { label: 'Undo', onPress: () => tracker.setDone(row.action, copy.id, false) } });
  };
  const snooze = async (row: TrackRow) => {
    const res = await tracker.snooze(row.action);
    if ('until' in res) {
      haptic.success();
      toast({ message: `Snoozed until ${formatDate.weekdayShort(res.until.slice(0, 10))}, ${formatTime(res.until)}`, icon: 'snooze', iconColor: colors.dark.tint, aboveTabBar: true });
    } else toast({ message: userMessage(res.error), icon: 'warning', iconColor: colors.orange, aboveTabBar: true });
  };

  return (
    <Screen>
      <NavBar scrollY={scrollY} title="Tracking" />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: top, paddingBottom: 110 }}>
        <LargeTitle title="Tracking" scrollY={scrollY} accessory={<CircleButton icon="plus" label="Track something" variant="card" size={36} onPress={() => router.push('/search')} />} />
        <View style={styles.tiles}>
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <SummaryTile key={t} tab={t} count={counts[t]} on={tab === t} onPress={() => setTab(t)} />
          ))}
        </View>
        <SectionTitle title={TABS[tab].label} color={swatch[TABS[tab].color]} />
        {actions.isError && !actions.data ? (
          <RetryLine label="Tracking" error={actions.error} onRetry={() => actions.refetch()} />
        ) : (
          <Animated.View key={tab} entering={FadeIn} layout={LinearTransition}>
            {tab === 'todo' && view && (
              <>
                <Group inset={INSET.radio}>
                  {view.todo.map((r) => (
                    <SwipeRow key={r.action.id} row={r} onDone={() => markDone(r)} onSnooze={() => snooze(r)} />
                  ))}
                </Group>
                <GroupFooter>Swipe left to mark done. Swipe right to snooze the next reminder.</GroupFooter>
              </>
            )}
            {tab === 'done' && view && (
              <Group inset={INSET.radio}>
                {view.done.map((d) => (
                  <Cell key={d.key} left={<Radio on color={colors.green} size={24} />} title={d.title} subtitle={formatDate.short(d.doneAt.slice(0, 10))} tone="muted" />
                ))}
              </Group>
            )}
            {tab === 'missed' && view && (
              <Group inset={INSET.tile}>
                {view.missed.map((r) => (
                  <Cell key={r.action.id} align="top" left={<Tile icon="clock" color="red" />} title={r.action.title} subtitle={`Closed ${formatDate.short(r.action.deadline)} · ${r.open.map((c) => c.label).join(', ')}`}>
                    <View style={{ marginTop: 8 }}>
                      <CapButton label="Follow next round" onPress={() => router.push(toHref({ kind: 'institution', id: r.action.institutionId }))} />
                    </View>
                  </Cell>
                ))}
              </Group>
            )}
            {tab === 'people' && view && (
              <Group inset={INSET.radio}>
                {view.people.map((p, i) => (
                  <Cell key={p.label} left={<Initials label={p.label[0] ?? '?'} color={PALETTE[i % PALETTE.length] ?? 'tint'} size="s" />} title={p.label} detail={`${p.open} open`} />
                ))}
              </Group>
            )}
          </Animated.View>
        )}

        <SectionTitle title="Storylines" />
        <Group inset={INSET.tile}>
          {(storylines.data ?? [])
            .filter((s) => followed[s.id] && followed[s.id] !== 'off')
            .map((s) => (
              <Cell key={s.id} left={<Tile icon={s.icon} color={s.color} />} title={s.title} subtitle={s.latest} chevron onPress={() => router.push(toHref({ kind: 'storyline', id: s.id }))} />
            ))}
        </Group>
      </Animated.ScrollView>
    </Screen>
  );
}

function SummaryTile({ tab, count, on, onPress }: { tab: Tab; count: number; on: boolean; onPress: () => void }) {
  const t = TABS[tab];
  const width = (useWindowDimensions().width - 32 - 10) / 2;
  return (
    <PressableScale feedback="selection" accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${t.label}, ${count}`} onPress={onPress} style={[styles.tile, { width }, on && { borderColor: swatch[t.color] }]}>
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: swatch[t.color] }]}>
          <Icon name={t.icon} size={17} color={colors.white} />
        </View>
        <Txt v="t1" num>
          {count}
        </Txt>
      </View>
      <Txt v="sh" w="600" c={colors.l2}>
        {t.label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 8, paddingHorizontal: 16 },
  tile: { backgroundColor: colors.card, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 8, borderWidth: 2, borderColor: 'transparent' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
