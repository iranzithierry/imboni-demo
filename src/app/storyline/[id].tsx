import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { StorylineEntry } from '@/data/schema';
import { useInstitutionLookup, useToday } from '@/features/data';
import { formatDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { shareText } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import type { FollowLevel } from '@/state/schema';
import { Badge, Card, Tile } from '@/ui/atoms';
import { CapButton } from '@/ui/button';
import { Icon, type IconName } from '@/ui/icon';
import { BackButton, NavBar, NavButton, Screen, useNavInset, useScrollY } from '@/ui/nav';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const LEVELS: { value: FollowLevel; label: string }[] = [
  { value: 'all', label: 'All updates' },
  { value: 'important', label: 'Important only' },
  { value: 'digest', label: 'Daily digest' },
  { value: 'off', label: 'Off' },
];
const KIND: Record<StorylineEntry['kind'], { color: string; icon: IconName }> = {
  Notice: { color: colors.gray, icon: 'megaphone' },
  Update: { color: colors.orange, icon: 'refresh' },
  Action: { color: colors.tint, icon: 'checkCircle' },
  Law: { color: colors.indigo, icon: 'doc' },
  Scheduled: { color: colors.gray, icon: 'calendar' },
};

export default function StorylineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery(q.storylines(useApi()));
  const { scrollY, onScroll } = useScrollY();
  const top = useNavInset();
  const today = useToday();
  const inst = useInstitutionLookup();
  const level = usePrefs((s) => s.storylines[id] ?? 'off');
  const setLevel = usePrefs((s) => s.setStorylineLevel);
  const [onlyChanges, setOnlyChanges] = useState(false);
  const story = query.data?.find((s) => s.id === id);
  if (!story) return <Screen>{query.isPending ? null : <ErrorScreen error={query.error ?? new Error('not_found')} onRetry={() => query.refetch()} />}</Screen>;
  const entries = story.entries.filter((e) => !onlyChanges || e.isChange);

  return (
    <Screen>
      <NavBar scrollY={scrollY} title={story.title} left={<BackButton label="Back" />} right={<NavButton label="Share" icon="share" onPress={() => shareText(story.title, { kind: 'storyline', id: story.id }).catch(() => undefined)} />} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: top + 6, paddingBottom: 40 }}>
        <View style={styles.head}>
          <Tile icon={story.icon} color={story.color} size="xl" />
          <View style={{ flex: 1 }}>
            <Txt v="fn" c={colors.l2}>{`Storyline · ${inst(story.institutionId).mono}`}</Txt>
            <Txt v="t1" accessibilityRole="header">
              {story.title}
            </Txt>
          </View>
        </View>
        <Txt v="co" c={colors.l2} style={{ paddingHorizontal: 20, marginTop: 10 }}>
          {story.description}
        </Txt>
        <View style={styles.controls}>
          <MenuView
            title="Alerts for this storyline"
            actions={LEVELS.map((l): MenuAction => ({ id: l.value, title: l.label, state: l.value === level ? 'on' : 'off' }))}
            onPressAction={({ nativeEvent }) => {
              const next = LEVELS.find((l) => l.value === nativeEvent.event);
              if (next) {
                haptic.selection();
                setLevel(story.id, next.value);
              }
            }}>
            <CapButton label={LEVELS.find((l) => l.value === level)?.label ?? 'Off'} icon="bell" trailingIcon="chevronDown" variant={level === 'off' ? 'gray' : 'solid'} height={34} />
          </MenuView>
          <CapButton label="Only changes" icon={onlyChanges ? 'checkCircle' : 'list'} variant={onlyChanges ? 'tinted' : 'gray'} height={34} accessibilityState={{ selected: onlyChanges }} onPress={() => setOnlyChanges((v) => !v)} />
        </View>
        <Card style={{ marginTop: 22, paddingHorizontal: 16, paddingVertical: 6 }}>
          {entries.map((e, i) => (
            <Animated.View key={e.id} entering={FadeIn} exiting={FadeOut} layout={LinearTransition}>
              <Entry entry={e} future={e.date > today} last={i === entries.length - 1} />
            </Animated.View>
          ))}
        </Card>
      </Animated.ScrollView>
    </Screen>
  );
}

function Entry({ entry, future, last }: { entry: StorylineEntry; future: boolean; last: boolean }) {
  const kind = KIND[future ? 'Scheduled' : entry.kind];
  const content = (
    <View style={styles.entry}>
      <View style={styles.rail}>
        {future ? <View style={styles.dashed} /> : <View style={[styles.node, { backgroundColor: kind.color }]}><Icon name={kind.icon} size={13} color={colors.white} /></View>}
        {!last && <View style={styles.line} />}
      </View>
      <View style={{ flex: 1 }}>
        <Txt v="c1" c={colors.l2} num>{`${formatDate.weekdayShort(entry.date).toUpperCase()} ${formatDate.year(entry.date)} · ${(future ? 'Scheduled' : entry.kind).toUpperCase()}`}</Txt>
        <Txt v="hl" style={{ marginTop: 1 }}>
          {entry.title}
        </Txt>
        <Txt v="fn" c={colors.l2} style={{ marginTop: 2 }}>
          {entry.summary}
        </Txt>
        {entry.diff && <Badge label={`${entry.diff.before} → ${entry.diff.after}`} tone="orange" icon="refresh" style={{ marginTop: 8 }} />}
      </View>
    </View>
  );
  if (!entry.link) return content;
  const link = entry.link;
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(toHref(link))} style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 },
  controls: { flexDirection: 'row', gap: 8, marginTop: 14, paddingHorizontal: 20 },
  entry: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  rail: { width: 26, alignItems: 'center' },
  node: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dashed: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.gray, marginTop: 3 },
  line: { width: 2, flex: 1, backgroundColor: colors.track, marginTop: 4, marginBottom: -12 },
});
