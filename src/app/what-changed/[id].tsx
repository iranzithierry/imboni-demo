import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, withSpring, ZoomIn } from 'react-native-reanimated';

import { useAction } from '@/features/data';
import { useTracker } from '@/features/tracking';
import { provenanceLabel } from '@/features/labels';
import { daysBetween, formatDate, formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { usePrefs } from '@/state/prefs';
import { Badge, Card, Initials, Tile } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Cell, Group, GroupHeader } from '@/ui/list';
import { NavButton } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { colors, spring } from '@/ui/theme';

export default function WhatChanged() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { action } = useAction(id);
  const tracked = usePrefs((s) => s.tracked[id]);
  const answers = usePrefs((s) => s.revisionAnswers);
  const answer = usePrefs((s) => s.answerRevision);
  const tracker = useTracker();
  const [open, setOpen] = useState(false);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: withSpring(open ? '180deg' : '0deg', spring) }] }));
  const rev = action?.revision;
  if (!action || !rev) return null;

  // A copy marked done before this revision may no longer be done: ask once per copy.
  const stale = tracked?.copies.find((c) => c.doneAt !== null && new Date(c.doneAt).getTime() < new Date(rev.at).getTime());
  const key = stale ? `${action.id}:${rev.rev}:${stale.id}` : null;
  const answered = key ? answers[key] : undefined;
  const prov = provenanceLabel(action.provenance);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <NavButton label="Close" onPress={() => router.back()} />
        <Txt v="hl" accessibilityRole="header">
          What changed
        </Txt>
        <NavButton label="Source" onPress={() => action.originalId && router.push(toHref({ kind: 'original', id: action.originalId }))} disabled={!action.originalId} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.intro}>
          <Tile icon="refresh" color="orange" size="m" />
          <View style={{ flex: 1 }}>
            <Txt v="hl">{action.title}</Txt>
            <Txt v="fn" c={colors.l2} num>{`Updated ${formatDate.long(rev.at.slice(0, 10))}, ${formatTime(rev.at, 'Africa/Kigali')} · ${prov.label}`}</Txt>
          </View>
        </View>
        {rev.changes.map((c) => {
          const delta = daysBetween(c.before, c.after);
          return (
            <Card key={c.field} style={{ padding: 16, marginTop: 12 }}>
              <Txt v="fn" w="600" c={colors.l2}>
                {c.field}
              </Txt>
              <View style={[styles.diff, { backgroundColor: 'rgba(255,59,48,0.08)', marginTop: 10 }]} accessibilityLabel={`Before: ${formatDate.long(c.before)}`}>
                <Icon name="minus" size={17} color={colors.red} />
                <Txt v="co" num strike c={colors.l2}>
                  {formatDate.long(c.before)}
                </Txt>
              </View>
              <View style={[styles.diff, { backgroundColor: 'rgba(52,199,89,0.12)', marginTop: 6 }]} accessibilityLabel={`After: ${formatDate.long(c.after)}`}>
                <Icon name="plus" size={17} color={colors.green} />
                <Txt v="t3" num>
                  {formatDate.long(c.after)}
                </Txt>
                {Math.abs(delta) > 1 && <Badge label={`${delta > 0 ? '+' : '−'}${Math.abs(delta)} days`} tone={delta > 0 ? 'green' : 'red'} style={{ marginLeft: 'auto' }} />}
              </View>
            </Card>
          );
        })}

        <Animated.View layout={LinearTransition} style={{ marginTop: 12 }}>
          <Group>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => {
                haptic.selection();
                setOpen((o) => !o);
              }}
              style={({ pressed }) => [styles.toggle, pressed && { backgroundColor: colors.pressed }]}>
              <Txt style={{ flex: 1 }}>{`${rev.unchanged.length} fields unchanged`}</Txt>
              <Animated.View style={chevron}>
                <Icon name="chevronDown" size={17} color={colors.l3} />
              </Animated.View>
            </Pressable>
            {open &&
              rev.unchanged.map((u) => (
                <Animated.View key={u.label} entering={FadeIn}>
                  <Cell right={<Txt v="sh">{u.value}</Txt>}>
                    <Txt c={colors.l2}>{u.label}</Txt>
                  </Cell>
                </Animated.View>
              ))}
          </Group>
        </Animated.View>

        {stale && key && (
          <Animated.View layout={LinearTransition} entering={FadeIn}>
            {!answered ? (
              <Card style={{ padding: 18, marginTop: 22, alignItems: 'center' }}>
                <Initials label={stale.label[0] ?? '?'} color="orange" />
                <Txt v="hl" center style={{ marginTop: 10 }}>{`“${stale.label}” was marked done before this change.`}</Txt>
                <Txt v="fn" c={colors.l2} style={{ marginTop: 2 }}>
                  Is it still done?
                </Txt>
                <View style={styles.answers}>
                  <Button label="Still done" variant="gray" compact style={{ flex: 1 }} onPress={() => answer(key, 'kept')} />
                  <Button
                    label="Reopen"
                    variant="tinted"
                    compact
                    style={{ flex: 1 }}
                    onPress={async () => {
                      answer(key, 'reopened');
                      await tracker.setDone(action, stale.id, false);
                    }}
                  />
                </View>
              </Card>
            ) : (
              <Animated.View entering={ZoomIn.springify()}>
                <Card style={styles.answered}>
                  <Icon name="checkCircle" size={22} color={colors.green} />
                  <Txt v="sh" style={{ flex: 1 }}>
                    {answered === 'kept' ? 'Kept as done. No reminders for that copy.' : 'Reopened. Reminders resume for that copy.'}
                  </Txt>
                </Card>
              </Animated.View>
            )}
          </Animated.View>
        )}

        <GroupHeader>History</GroupHeader>
        <Group>
          {rev.history.map((h) => (
            <Cell key={h.rev} left={<Badge label={`Rev ${h.rev}`} tone={h.rev === rev.rev ? 'orange' : 'gray'} />} title={h.title} subtitle={h.meta} />
          ))}
        </Group>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.sep, backgroundColor: 'rgba(249,249,249,0.94)' },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 16 },
  diff: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  toggle: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: colors.card },
  answers: { flexDirection: 'row', gap: 8, marginTop: 14, alignSelf: 'stretch' },
  answered: { marginTop: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
