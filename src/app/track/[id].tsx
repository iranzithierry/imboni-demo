import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { useAction, useNow, usePlaceTimeZone, useToday } from '@/features/data';
import { useTracker, type TrackOutcome } from '@/features/tracking';
import { daysBetween, formatDate, formatTime } from '@/lib/dates';
import { userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { PLAN_COPY, reminderSchedule, reminderTicks, type ReminderPlan } from '@/lib/reminders';
import { usePrefs } from '@/state/prefs';
import { Checkbox, IconTile, Switch } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Group, GroupLabel, GroupNote, INSET, Row } from '@/ui/list';
import { closeAction, Dock, HeaderActions, useDockInset } from '@/ui/nav';
import { Segmented } from '@/ui/segmented';
import { Txt } from '@/ui/text';
import { createStyles, fonts, GUTTER, motion, radius, useColors } from '@/ui/theme';

const PLANS = (Object.keys(PLAN_COPY) as ReminderPlan[]).map((value) => ({ value, label: PLAN_COPY[value].label }));

export default function TrackSheet() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { action } = useAction(id);
  const today = useToday();
  const now = useNow();
  const tz = usePlaceTimeZone();
  const bottom = useDockInset();
  const doneBottom = useDockInset(2);
  const people = usePrefs((s) => s.people);
  const addPerson = usePrefs((s) => s.addPerson);
  const existing = usePrefs((s) => s.tracked[id]);
  const tracker = useTracker();
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(existing?.copies.map((c) => c.label) ?? ['Me']));
  const [plan, setPlan] = useState<ReminderPlan>(existing?.plan ?? 'standard');
  const [calendar, setCalendar] = useState(existing?.addToCalendar ?? true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<TrackOutcome | null>(null);

  const header = (
    <>
      <Stack.Screen options={{ title: outcome ? '' : existing ? 'Edit tracking' : 'Track' }} />
      <HeaderActions actions={[closeAction]} />
    </>
  );

  if (!action) return header;
  const reminders = reminderSchedule(plan, action.deadline, today, now, tz);
  const ticks = reminderTicks(reminders, today, action.deadline, plan);
  const n = chosen.size;
  const first = reminders[0];

  const toggle = (label: string) => {
    haptic.selection();
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };
  const commitDraft = () => {
    const label = draft.trim();
    if (!label) return;
    addPerson(label);
    setChosen((prev) => new Set(prev).add(label));
    setDraft('');
  };
  const confirm = async () => {
    if (!n) return;
    setSaving(true);
    const result = await tracker.start(action, people.filter((p) => chosen.has(p)), plan, calendar);
    setSaving(false);
    haptic.success();
    setOutcome(result);
  };

  if (outcome) {
    const remindersNote = outcome.reminders === 'scheduled' ? (first ? `First reminder ${formatDate.weekdayShort(first.ymd)} at ${formatTime(first.at, tz)}.` : '') : outcome.reminders === 'none' ? 'No reminders are left before the deadline.' : `Reminders are off. ${userMessage(outcome.reminders)}`;
    const calendarNote = outcome.calendar === 'added' ? ' Added to your calendar.' : outcome.calendar === 'skipped' ? '' : ` Calendar: ${userMessage(outcome.calendar)}`;
    return (
      <View style={styles.sheet}>
        {header}
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: doneBottom }}>
          <Animated.View entering={FadeIn.duration(motion.base)} style={styles.done}>
            <IconTile icon="check" tone="ok" size={56} />
            <Txt v="title2" style={{ marginTop: 18 }}>{`Tracking for ${n === 1 ? '1 person' : `${n} people`}`}</Txt>
            <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>{`${remindersNote}${calendarNote} Each copy is marked done on its own, and you’ll hear if anything changes.`}</Txt>
          </Animated.View>
        </ScrollView>
        <Dock>
          <Button label="Open Tracking" onPress={() => router.dismissTo('/tracking')} />
          <Button
            label="Undo"
            variant="secondary"
            icon="undo"
            onPress={async () => {
              await tracker.stop(action.id);
              setOutcome(null);
            }}
          />
        </Dock>
      </View>
    );
  }

  return (
    <View style={styles.sheet}>
      {header}
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottom }}>
        <View style={styles.summary}>
          <IconTile icon="checklist" tone="brand" size={44} />
          <View style={{ flex: 1 }}>
            <Txt v="callout" w="semibold">
              {action.title}
            </Txt>
            <Txt v="footnote" c={colors.ink2} num>{`Due ${formatDate.long(action.deadline)} · ${daysBetween(today, action.deadline)} days`}</Txt>
          </View>
        </View>

        <GroupLabel>Who is this for</GroupLabel>
        <Animated.View layout={LinearTransition.duration(motion.base)}>
          <Group inset={INSET.check}>
            {people.map((p) => (
              <Row key={p} left={<Checkbox on={chosen.has(p)} />} title={p} accessibilityRole="checkbox" accessibilityState={{ checked: chosen.has(p) }} onPress={() => toggle(p)} />
            ))}
            <View style={styles.addRow}>
              <View style={styles.plus}>
                <Icon name="plus" size={13} color={colors.ink} weight="semibold" />
              </View>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={commitDraft}
                placeholder="Add someone, e.g. Child 2"
                placeholderTextColor={colors.ink3}
                returnKeyType="done"
                maxLength={40}
                style={styles.input}
                accessibilityLabel="Add a person by label"
              />
            </View>
          </Group>
        </Animated.View>
        <GroupNote>Each person gets their own checklist. Use a label like “Child 1”, never a full name.</GroupNote>

        <GroupLabel>Reminders</GroupLabel>
        <View style={styles.plan}>
          <Segmented accessibilityLabel="Reminder plan" options={PLANS} value={plan} onChange={setPlan} />
          <View style={styles.track} accessibilityLabel={`${reminders.length} reminders before ${formatDate.long(action.deadline)}`}>
            <View style={styles.line} />
            <View style={[styles.end, { left: 0 }]} />
            <View style={[styles.end, styles.endDue]} />
            <Txt v="caption" c={colors.ink2} style={styles.todayLabel}>
              Today
            </Txt>
            <Txt v="caption" c={colors.ink2} style={styles.dueLabel} num>
              {formatDate.short(action.deadline)}
            </Txt>
            {ticks.map((t) => (
              <Animated.View key={`${plan}-${t.key}`} entering={FadeIn.duration(motion.fast)} style={[styles.tick, { left: `${t.x * 100}%` }]}>
                <View style={styles.bell}>
                  <Icon name="bell" size={12} color={colors.white} weight="semibold" />
                </View>
                <Txt v="caption" num>
                  {t.label}
                </Txt>
              </Animated.View>
            ))}
          </View>
          <Txt v="footnote" c={colors.ink2}>
            {reminders.length ? PLAN_COPY[plan].note : 'No reminders are left before the deadline.'}
          </Txt>
        </View>

        <Group style={{ marginTop: 16 }} inset={INSET.tile}>
          <Row left={<IconTile icon="calendarAdd" tone="teal" />} title="Add the deadline to my calendar" right={<Switch label="Add to calendar" value={calendar} onChange={setCalendar} />} />
          <Row left={<IconTile icon="refresh" tone="sky" />} title="Tell me if it changes" subtitle="Always on for tracked actions" />
        </Group>
      </ScrollView>
      <Dock>
        <Button label={n === 0 ? 'Choose who it’s for' : existing ? 'Save changes' : `Track for ${n === 1 ? '1 person' : `${n} people`}`} disabled={n === 0} loading={saving} onPress={confirm} />
      </Dock>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.canvas },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: GUTTER, marginTop: 4, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52 },
  plus: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.pearl, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontSize: 15, fontFamily: fonts.regular, color: colors.ink, height: 48 },
  plan: { marginHorizontal: GUTTER, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  track: { height: 80, marginTop: 22, marginHorizontal: 14, marginBottom: 8 },
  line: { position: 'absolute', left: 0, right: 0, top: 14, height: 4, borderRadius: radius.xs, backgroundColor: colors.fill },
  end: { position: 'absolute', top: 10, width: 12, height: 12, marginLeft: -6, borderRadius: 6, backgroundColor: colors.accent },
  endDue: { left: '100%', backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent },
  todayLabel: { position: 'absolute', left: -12, top: 58 },
  dueLabel: { position: 'absolute', right: -14, top: 58 },
  tick: { position: 'absolute', top: 0, alignItems: 'center', gap: 6, transform: [{ translateX: -16 }] },
  bell: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  done: { paddingHorizontal: GUTTER + 4, paddingTop: 40 },
}));
