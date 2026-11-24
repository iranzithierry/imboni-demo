import { MenuView } from '@expo/ui/community/menu';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedReaction } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import type { Action } from '@/data/schema';
import { useAction, useInstitutionLookup, useToday } from '@/features/data';
import { provenanceLabel } from '@/features/labels';
import { useReportPicker } from '@/features/report';
import { daysBetween, formatDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { usePrefs } from '@/state/prefs';
import { Badge, Card, GlassBadge, Gradient, Initials, Radio, Tile } from '@/ui/atoms';
import { Button, CircleButton } from '@/ui/button';
import { Cell, Group, GroupHeader, INSET } from '@/ui/list';
import { Dock, NavBar, Screen, useDockInset, useScrollY } from '@/ui/nav';
import { PressableScale } from '@/ui/pressable';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors, type GradientName } from '@/ui/theme';

const HERO: Record<Action['icon'], GradientName> = { banknote: 'banknote', doc: 'institution', idCard: 'brand', graduation: 'law' };
const HERO_COLLAPSE = 170;

export default function ActionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { action, error, refetch, isPending } = useAction(id);
  if (!action) return <Screen>{isPending ? null : <ErrorScreen error={error ?? new Error('not_found')} onRetry={() => refetch()} />}</Screen>;
  return <ActionView action={action} />;
}

function ActionView({ action }: { action: Action }) {
  const top = useSafeAreaInsets().top;
  const bottom = useDockInset();
  const today = useToday();
  const { scrollY, onScroll } = useScrollY();
  const [collapsed, setCollapsed] = useState(false);
  useAnimatedReaction(
    () => scrollY.get() > HERO_COLLAPSE,
    (now, prev) => {
      if (now !== prev) scheduleOnRN(setCollapsed, now);
    },
  );
  const inst = useInstitutionLookup()(action.institutionId);
  const tracked = usePrefs((s) => s.tracked[action.id]);
  const checked = usePrefs((s) => s.steps[action.id] ?? []);
  const toggleStep = usePrefs((s) => s.toggleStep);
  const report = useReportPicker();
  const left = daysBetween(today, action.deadline);
  const prov = provenanceLabel(action.provenance);
  const phase = action.phases.find((p) => p.from <= today && today <= p.to);
  const nextPhase = action.phases.find((p) => p.from > today);
  const spans = action.phases.map((p) => Math.max(1, daysBetween(p.from, p.to)));
  const share = () => router.push({ pathname: '/share/[id]', params: { id: action.id } });

  return (
    <Screen>
      <StatusBar style={collapsed ? 'dark' : 'light'} animated />
      <NavBar
        scrollY={scrollY}
        threshold={HERO_COLLAPSE}
        title={action.shortTitle}
        left={<CircleButton icon="chevronLeft" label="Back" variant="glass" size={36} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />}
        right={
          <View style={styles.navRight}>
            <CircleButton icon="share" label="Share" variant="glass" size={36} onPress={share} />
            <MenuView
              actions={[
                ...(action.originalId ? [{ id: 'original', title: 'View original', image: 'doc.text' as const }] : []),
                ...(action.storylineId ? [{ id: 'storyline', title: 'Storyline', image: 'list.bullet' as const }] : []),
                { id: 'report', title: 'Report a problem', image: 'flag' },
              ]}
              onPressAction={({ nativeEvent }) => {
                if (nativeEvent.event === 'original' && action.originalId) router.push(toHref({ kind: 'original', id: action.originalId }));
                if (nativeEvent.event === 'storyline' && action.storylineId) router.push(toHref({ kind: 'storyline', id: action.storylineId }));
                if (nativeEvent.event === 'report') report(action);
              }}>
              <View style={styles.more} accessibilityRole="button" accessibilityLabel="More">
                <Txt v="hl">···</Txt>
              </View>
            </MenuView>
          </View>
        }
      />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: bottom }}>
        <View style={[styles.hero, { paddingTop: top + 56 }]}>
          <Gradient name={HERO[action.icon]} />
          <View style={styles.row8}>
            <Initials label={inst.mono} color={inst.color} size="s" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }} />
            <Txt v="fn" w="600" c="rgba(255,255,255,0.9)">
              {inst.name}
            </Txt>
          </View>
          <Txt v="t1" c={colors.white} style={{ marginTop: 14, maxWidth: 300 }} accessibilityRole="header">
            {action.title}
          </Txt>
          <View style={styles.count}>
            <Txt num c={colors.white} style={{ fontSize: 64, lineHeight: 64, fontWeight: '700', letterSpacing: -1.2 }}>
              {Math.max(0, left)}
            </Txt>
            <View style={{ paddingBottom: 6 }}>
              <Txt v="hl" c={colors.white}>
                {left < 0 ? 'days ago, closed' : `${left === 1 ? 'day' : 'days'} left${phase ? ` at ${phase.label.split(' ')[0]?.toLowerCase()}` : ''}`}
              </Txt>
              <Txt v="fn" num c="rgba(255,255,255,0.85)">{`Ends ${formatDate.weekdayShort(action.deadline)} ${formatDate.year(action.deadline)}`}</Txt>
            </View>
          </View>
          <View style={[styles.row8, { marginTop: 16, gap: 6 }]}>
            {action.required && <GlassBadge label="Required" icon="exclamation" />}
            <GlassBadge label={prov.label} icon={prov.icon} />
          </View>
        </View>

        {action.revision && (
          <PressableScale feedback="tap" accessibilityRole="button" onPress={() => router.push(toHref({ kind: 'what_changed', id: action.id }))} style={[styles.card, { marginTop: 14 }]}>
            <Tile icon="refresh" color="orange" />
            <View style={{ flex: 1 }}>
              <Txt v="sh" w="600">{`Deadline extended on ${formatDate.short(action.revision.at.slice(0, 10))}`}</Txt>
              <Txt v="fn" c={colors.l2} num>
                <Txt v="fn" c={colors.l2} strike>
                  {formatDate.short(action.revision.changes[0]?.before ?? action.deadline)}
                </Txt>
                {` → ${formatDate.long(action.revision.changes[0]?.after ?? action.deadline)}`}
              </Txt>
            </View>
            <Txt c={colors.l3}>›</Txt>
          </PressableScale>
        )}

        {action.phases.length > 0 && (
          <>
            <GroupHeader>Phases</GroupHeader>
            <Card style={{ padding: 16 }}>
              <View style={styles.bars}>
                {action.phases.map((p, i) => (
                  <View key={p.label} style={[styles.bar, { flex: spans[i], backgroundColor: p === phase ? colors.orange : colors.track }]} />
                ))}
              </View>
              <View style={styles.phases}>
                {[phase, nextPhase].map((p, i) =>
                  p ? (
                    <View key={p.label} style={{ flex: 1 }}>
                      <Badge label={i === 0 ? 'Now' : 'Next'} tone={i === 0 ? 'orange' : 'gray'} />
                      <Txt v="hl" style={{ marginTop: 6 }}>
                        {p.label}
                      </Txt>
                      <Txt v="fn" c={colors.l2} num>
                        {i === 0 ? `Until ${formatDate.short(p.to)}` : `${formatDate.short(p.from)} – ${formatDate.long(p.to)}`}
                      </Txt>
                    </View>
                  ) : null,
                )}
              </View>
            </Card>
          </>
        )}

        {action.checker && (
          <PressableScale feedback="tap" accessibilityRole="button" onPress={() => router.push({ pathname: '/note-checker/[id]', params: { id: action.id } })} style={[styles.card, { marginTop: 14 }]}>
            <Tile icon="banknote" color="green" size="m" />
            <View style={{ flex: 1 }}>
              <Txt v="hl">Check your notes</Txt>
              <Txt v="fn" c={colors.l2}>
                Only some issue dates are withdrawn
              </Txt>
            </View>
            <Txt c={colors.l3}>›</Txt>
          </PressableScale>
        )}

        <GroupHeader>Details</GroupHeader>
        <Group inset={INSET.tile}>
          <Cell left={<Tile icon="people" color="indigo" />} title="Who" right={<Txt v="sh" c={colors.l2}>{action.details.who}</Txt>} />
          <Cell left={<Tile icon="bank" color="tint" />} title="Where" right={<Txt v="sh" c={colors.l2}>{action.details.where}</Txt>} onPress={action.directoryId ? () => router.push(toHref({ kind: 'directory', id: action.directoryId ?? '' })) : undefined} />
          <Cell left={<Tile icon="idCard" color="teal" />} title="Bring" right={<Txt v="sh" c={colors.l2}>{action.details.bring}</Txt>} />
          <Cell left={<Tile icon="check" color="green" />} title="Cost" right={<Txt v="sh" c={colors.l2}>{action.details.cost}</Txt>} />
        </Group>

        <GroupHeader>{`Steps · ${checked.length} of ${action.steps.length}`}</GroupHeader>
        <Group inset={INSET.radio}>
          {action.steps.map((step, i) => {
            const on = checked.includes(i);
            return (
              <Pressable
                key={step}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  haptic.selection();
                  toggleStep(action.id, i);
                }}
                style={({ pressed }) => [styles.step, pressed && { backgroundColor: colors.pressed }]}>
                <Radio on={on} size={24} />
                <Txt c={on ? colors.l2 : colors.l1} strike={on} style={{ flex: 1 }}>
                  {step}
                </Txt>
              </Pressable>
            );
          })}
        </Group>

        <GroupHeader>Source</GroupHeader>
        <Group inset={INSET.tile}>
          <Cell
            left={<Tile icon="doc" color="black" />}
            title={action.originalId ? 'View original' : action.source.label}
            subtitle={`${action.source.label} · ${formatDate.long(action.source.publishedAt)}`}
            chevron={Boolean(action.originalId)}
            onPress={action.originalId ? () => router.push(toHref({ kind: 'original', id: action.originalId ?? '' })) : undefined}
          />
          {action.storylineId && <Cell left={<Tile icon="list" color="purple" />} title="Storyline" chevron onPress={() => router.push(toHref({ kind: 'storyline', id: action.storylineId ?? '' }))} />}
          <Cell left={<Tile icon="flag" color="gray" />} title="Report a problem" chevron onPress={() => report(action)} />
        </Group>
      </Animated.ScrollView>
      <Dock row>
        <Button label="Reminders" icon="bell" variant="gray" iconOnly onPress={() => router.push({ pathname: '/track/[id]', params: { id: action.id } })} accessibilityHint="Opens reminder settings" />
        <View style={{ flex: 1 }}>
          <Button
            label={tracked ? `Tracking for ${tracked.copies.length === 1 ? '1 person' : `${tracked.copies.length} people`}` : 'Track this action'}
            icon={tracked ? 'check' : 'plus'}
            variant={tracked ? 'tinted' : 'fill'}
            onPress={() => {
              haptic.tap();
              router.push(tracked ? '/tracking' : { pathname: '/track/[id]', params: { id: action.id } });
            }}
          />
        </View>
      </Dock>
    </Screen>
  );
}

const styles = StyleSheet.create({
  navRight: { flexDirection: 'row', gap: 8 },
  more: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.78)', alignItems: 'center', justifyContent: 'center' },
  hero: { paddingHorizontal: 20, paddingBottom: 26, overflow: 'hidden' },
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 18 },
  card: { marginHorizontal: 16, backgroundColor: colors.card, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { height: 6, borderRadius: 3 },
  phases: { flexDirection: 'row', gap: 12, marginTop: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: colors.card },
});
