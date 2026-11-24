import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, LinearTransition, ZoomIn } from 'react-native-reanimated';

import { useAction, useNow, usePlaceTimeZone, useToday } from '@/features/data';
import { useTracker, type TrackOutcome } from '@/features/tracking';
import { formatDate, formatTime } from '@/lib/dates';
import { userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { PLAN_COPY, reminderSchedule, reminderTicks, type ReminderPlan } from '@/lib/reminders';
import { usePrefs } from '@/state/prefs';
import { Card, Initials, Switch, Tile } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Cell, Group, GroupFooter, GroupHeader, INSET } from '@/ui/list';
import { NavButton } from '@/ui/nav';
import { Segmented } from '@/ui/segmented';
import { Txt } from '@/ui/text';
import { colors, type Swatch } from '@/ui/theme';

const PLANS = (Object.keys(PLAN_COPY) as ReminderPlan[]).map((value) => ({ value, label: PLAN_COPY[value].label }));
const PALETTE: Swatch[] = ['tint', 'orange', 'pink', 'teal', 'purple'];

export default function TrackSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { action } = useAction(id);
  const today = useToday();
  const now = useNow();
  const tz = usePlaceTimeZone();
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

  if (!action) return null;
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

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <NavButton label="Cancel" onPress={() => router.back()} />
        <Txt v="hl" accessibilityRole="header">
          Track
        </Txt>
        {outcome ? <View style={{ width: 60 }} /> : <NavButton label={existing ? 'Save' : 'Add'} bold disabled={!n || saving} onPress={confirm} />}
      </View>
      {outcome ? (
        <Done n={n} first={first ? `${formatDate.weekdayShort(first.ymd)}, ${formatTime(first.at, tz)}` : null} outcome={outcome} onUndo={async () => {
          await tracker.stop(action.id);
          setOutcome(null);
        }} />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          <GroupHeader top={8}>Who is this for</GroupHeader>
          <Animated.View layout={LinearTransition}>
            <Group inset={INSET.tile}>
              {people.map((p, i) => (
                <Cell
                  key={p}
                  left={<Initials label={p[0] ?? '?'} color={PALETTE[i % PALETTE.length] ?? 'tint'} size="s" />}
                  title={p}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: chosen.has(p) }}
                  onPress={() => toggle(p)}
                  right={chosen.has(p) ? <Animated.View entering={ZoomIn.springify()}><Icon name="check" size={17} color={colors.tint} /></Animated.View> : undefined}
                />
              ))}
              <View style={styles.addRow}>
                <View style={styles.plus}>
                  <Icon name="plus" size={12} color={colors.white} />
                </View>
                <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={commitDraft} placeholder="Add person" placeholderTextColor={colors.tint} returnKeyType="done" maxLength={40} style={styles.input} accessibilityLabel="Add person by label" />
              </View>
            </Group>
          </Animated.View>
          <GroupFooter>Each person gets their own checklist. Use a label, not a full name.</GroupFooter>

          <GroupHeader>Reminders</GroupHeader>
          <Card style={{ padding: 14 }}>
            <Segmented accessibilityLabel="Reminder plan" options={PLANS} value={plan} onChange={setPlan} />
            <View style={styles.track} accessibilityLabel={`${reminders.length} reminders before ${formatDate.long(action.deadline)}`}>
              <View style={styles.line} />
              <View style={styles.today} />
              <Txt v="c1" c={colors.l2} style={styles.todayLabel}>
                Today
              </Txt>
              {ticks.map((t, i) => (
                <Animated.View key={`${plan}-${t.key}`} entering={FadeInUp.delay(i * 50).springify()} style={[styles.tick, { left: `${t.x * 100}%` }]}>
                  <View style={styles.bell}>
                    <Icon name="bell" size={13} color={colors.white} />
                  </View>
                  <Txt v="c1" w="600" num>
                    {t.label}
                  </Txt>
                </Animated.View>
              ))}
            </View>
            <Txt v="fn" c={colors.l2} style={{ marginTop: 6 }}>
              {reminders.length ? PLAN_COPY[plan].note : 'No reminders left before the deadline.'}
            </Txt>
          </Card>

          <Group style={{ marginTop: 22 }} inset={INSET.tile}>
            <Cell left={<Tile icon="calendar" color="red" />} title="Add to Calendar" right={<Switch label="Add to Calendar" value={calendar} onChange={setCalendar} />} />
            <Cell left={<Tile icon="refresh" color="orange" />} title="Alert if it changes" detail="Always" />
          </Group>
        </ScrollView>
      )}
    </View>
  );
}

function Done({ n, first, outcome, onUndo }: { n: number; first: string | null; outcome: TrackOutcome; onUndo: () => void }) {
  const remindersNote =
    outcome.reminders === 'scheduled' ? (first ? `First reminder ${first}.` : '') : outcome.reminders === 'none' ? 'No reminders left before the deadline.' : `Reminders are off. ${userMessage(outcome.reminders)}`;
  const calendarNote = outcome.calendar === 'added' ? ' Added to your calendar.' : outcome.calendar === 'skipped' ? '' : ` Calendar: ${userMessage(outcome.calendar)}`;
  return (
    <Animated.View entering={FadeIn} style={styles.done}>
      <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.doneIcon}>
        <Icon name="bell" size={40} color={colors.white} />
      </Animated.View>
      <Txt v="t2" center style={{ marginTop: 20 }}>{`Tracking for ${n === 1 ? '1 person' : `${n} people`}`}</Txt>
      <Txt v="co" c={colors.l2} center style={{ marginTop: 6 }}>
        {`${remindersNote}${calendarNote} Each copy is marked done on its own.`}
      </Txt>
      <View style={{ alignSelf: 'stretch', marginTop: 30, gap: 8 }}>
        <Button label="Open Tracking" onPress={() => router.dismissTo('/tracking')} />
        <Button label="Undo" variant="plain" onPress={onUndo} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 6 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 44 },
  plus: { width: 22, height: 22, borderRadius: 11, marginHorizontal: 4, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontSize: 17, color: colors.l1, height: 44 },
  track: { height: 70, marginTop: 22, marginHorizontal: 10 },
  line: { position: 'absolute', left: 0, right: 0, top: 15, height: 4, borderRadius: 2, backgroundColor: colors.track },
  today: { position: 'absolute', left: -6, top: 11, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.l1 },
  todayLabel: { position: 'absolute', left: -8, top: 34 },
  tick: { position: 'absolute', top: 0, alignItems: 'center', gap: 6, transform: [{ translateX: -16 }] },
  bell: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.orange, borderWidth: 3, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  done: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 28 },
  doneIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
});
