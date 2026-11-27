import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useAction, useInstitutionLookup } from '@/features/data';
import { ProvenanceLabel } from '@/features/record/parts';
import { useTracker } from '@/features/tracking';
import { daysBetween, formatDate, formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { usePrefs } from '@/state/prefs';
import { IconTile, Tag } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Group, GroupLabel, Row } from '@/ui/list';
import { closeAction, HeaderActions } from '@/ui/nav';
import { Highlight } from '@/ui/pressable';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors } from '@/ui/theme';

export default function WhatChanged() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { action } = useAction(id);
  const inst = useInstitutionLookup();
  const tracked = usePrefs((s) => s.tracked[id]);
  const answers = usePrefs((s) => s.revisionAnswers);
  const answer = usePrefs((s) => s.answerRevision);
  const tracker = useTracker();
  const [open, setOpen] = useState(false);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(open ? '180deg' : '0deg', { duration: motion.base, easing: Easing.out(Easing.quad) }) }] }));
  const rev = action?.revision;
  const header = (
    <>
      <Stack.Screen options={{ title: 'What changed' }} />
      <HeaderActions actions={[closeAction]} />
    </>
  );
  if (!action || !rev) return header;

  // A copy marked done before this revision may no longer be done: ask once per copy.
  const stale = tracked?.copies.find((c) => c.doneAt !== null && new Date(c.doneAt).getTime() < new Date(rev.at).getTime());
  const key = stale ? `${action.id}:${rev.rev}:${stale.id}` : null;
  const answered = key ? answers[key] : undefined;

  return (
    <View style={styles.sheet}>
      {header}
      {action.originalId && <HeaderActions placement="left" actions={[{ icon: 'doc', text: 'Source', label: 'View the source', onPress: () => router.push(toHref({ kind: 'original', id: action.originalId ?? '' })) }]} />}
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={styles.intro}>
          <Txt v="title2" accessibilityRole="header">
            {action.title}
          </Txt>
          <Txt v="footnote" c={colors.ink2} num style={{ marginTop: 6 }}>{`Revision ${rev.rev} · ${formatDate.long(rev.at.slice(0, 10))}, ${formatTime(rev.at, 'Africa/Kigali')}`}</Txt>
          <View style={{ marginTop: 6 }}>
            <ProvenanceLabel provenance={action.provenance} institution={inst(action.institutionId).name} source={action.source.label} at={rev.at} />
          </View>
        </View>

        {rev.changes.map((c) => {
          const delta = daysBetween(c.before, c.after);
          return (
            <View key={c.field} style={styles.change}>
              <View style={styles.between}>
                <Txt v="subhead" w="semibold">
                  {c.field}
                </Txt>
                {Math.abs(delta) > 1 && <Tag label={`${delta > 0 ? '+' : '−'}${Math.abs(delta)} days`} tone={delta > 0 ? 'ok' : 'bad'} icon="calendar" />}
              </View>
              <View style={[styles.diff, { backgroundColor: colors.badWash, marginTop: 12 }]} accessibilityLabel={`Before: ${formatDate.long(c.before)}`}>
                <Icon name="minus" size={14} color={colors.bad} weight="semibold" />
                <Txt v="caption" c={colors.bad} style={styles.diffLabel}>
                  Before
                </Txt>
                <Txt v="callout" num strike c={colors.ink2}>
                  {formatDate.long(c.before)}
                </Txt>
              </View>
              <View style={[styles.diff, { backgroundColor: colors.okWash, marginTop: 6 }]} accessibilityLabel={`After: ${formatDate.long(c.after)}`}>
                <Icon name="plus" size={14} color={colors.ok} weight="semibold" />
                <Txt v="caption" c={colors.ok} style={styles.diffLabel}>
                  Now
                </Txt>
                <Txt v="title3" num>
                  {formatDate.long(c.after)}
                </Txt>
              </View>
            </View>
          );
        })}

        <Animated.View layout={LinearTransition.duration(motion.base)} style={{ marginTop: 12 }}>
          <Group>
            <Highlight
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => {
                haptic.selection();
                setOpen((o) => !o);
              }}
              pressedStyle={{ backgroundColor: colors.pressed }}
              style={styles.toggle}>
              <IconTile icon="checkCircle" tone="ok" size={32} />
              <Txt v="callout" w="medium" style={{ flex: 1 }}>{`${rev.unchanged.length} things stay the same`}</Txt>
              <Animated.View style={chevron}>
                <Icon name="chevronDown" size={14} color={colors.ink3} weight="semibold" />
              </Animated.View>
            </Highlight>
            {open &&
              rev.unchanged.map((u) => (
                <Animated.View key={u.label} entering={FadeIn.duration(motion.fast)}>
                  <Row title={u.label} detail={u.value} />
                </Animated.View>
              ))}
          </Group>
        </Animated.View>

        {stale && key && (
          <Animated.View layout={LinearTransition.duration(motion.base)} entering={FadeIn.duration(motion.base)}>
            {!answered ? (
              <View style={styles.ask}>
                <Txt v="title3">{`“${stale.label}” was marked done before this change.`}</Txt>
                <Txt v="subhead" c={colors.ink2} style={{ marginTop: 4 }}>
                  Is it still done? Imboni asks instead of reopening it on its own.
                </Txt>
                <View style={styles.answers}>
                  <View style={{ flex: 1 }}>
                    <Button label="Still done" variant="secondary" size="md" onPress={() => answer(key, 'kept')} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Reopen"
                      variant="tinted"
                      size="md"
                      onPress={async () => {
                        answer(key, 'reopened');
                        await tracker.setDone(action, stale.id, false);
                      }}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.ask, styles.answered]}>
                <Icon name="checkCircle" size={20} color={colors.ok} />
                <Txt v="subhead" style={{ flex: 1 }}>
                  {answered === 'kept' ? 'Kept as done. No reminders for that copy.' : 'Reopened. Reminders resume for that copy.'}
                </Txt>
              </View>
            )}
          </Animated.View>
        )}

        <GroupLabel>History</GroupLabel>
        <Group>
          {rev.history.map((h) => (
            <Row key={h.rev} left={<Tag label={`Rev ${h.rev}`} tone={h.rev === rev.rev ? 'ink' : 'outline'} />} title={h.title} subtitle={h.meta} />
          ))}
        </Group>
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.canvas },
  intro: { paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: 8 },
  change: { marginHorizontal: GUTTER, marginTop: 12, padding: 16, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  diff: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.sm },
  diffLabel: { width: 44 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 10 },
  ask: { marginHorizontal: GUTTER, marginTop: 16, padding: 18, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  answers: { flexDirection: 'row', gap: 10, marginTop: 16 },
  answered: { flexDirection: 'row', alignItems: 'center', gap: 10 },
}));
