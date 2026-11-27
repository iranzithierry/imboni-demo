import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { DAILY_LIMIT_RANGE } from '@/config/constants';
import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { useInstitutionLookup, usePlaceTimeZone } from '@/features/data';
import { useMenu } from '@/features/record/menu';
import { haptic } from '@/lib/haptics';
import { zoneCity } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import type { FollowLevel } from '@/state/schema';
import { Card, IconTile, Switch } from '@/ui/atoms';
import { Icon, type IconName } from '@/ui/icon';
import { Group, GroupLabel, GroupNote, INSET, Row } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { Highlight } from '@/ui/pressable';
import { Segmented } from '@/ui/segmented';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, radius, Status, useColors } from '@/ui/theme';

const LEVELS: { value: FollowLevel; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'important', label: 'Important' },
  { value: 'digest', label: 'Digest' },
  { value: 'off', label: 'Off' },
];
const DIGEST = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
] as const;

/** The four delivery levels from the notification policy, in plain words. */
const DELIVERY: { word: string; icon: IconName; tone: Status; when: string }[] = [
  { word: 'Critical', icon: 'warning', tone: 'bad', when: 'A safety alert in your area, or something you track due within 48 hours. Arrives at once.' },
  { word: 'High', icon: 'exclamation', tone: 'warn', when: 'A new required action for you, a change to something you track, or a closure on your route. Arrives at once, outside quiet hours.' },
  { word: 'Normal', icon: 'megaphone', tone: 'neutral', when: 'New items from follows set to All, at most one push per storyline every 6 hours.' },
  { word: 'Digest', icon: 'newspaper', tone: 'neutral', when: 'Everything else you follow, in one summary.' },
];

const toDate = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
};
const toHhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Compact time pickers on iOS; elsewhere a tap opens the system dialog. */
function TimeField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const colors = useColors();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'ios') return <DateTimePicker value={toDate(value)} mode="time" display="compact" is24Hour onValueChange={(_, d) => onChange(toHhmm(d))} accentColor={colors.ink} />;
  return (
    <>
      <Highlight accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} onPress={() => setOpen(true)} style={styles.time}>
        <Txt v="subhead" w="medium" num>
          {value}
        </Txt>
      </Highlight>
      {open && (
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          is24Hour
          presentation="dialog"
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === 'set' && d) onChange(toHhmm(d));
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
}

function LevelValue({ level }: { level: FollowLevel }) {
  const colors = useColors();
  const styles = useStyles();
  const l = LEVELS.find((x) => x.value === level) ?? LEVELS[3];
  return (
    <View style={styles.level}>
      <Txt v="subhead" w="medium" c={level === 'off' ? colors.ink3 : colors.ink}>
        {l?.label}
      </Txt>
      <Icon name="chevronDown" size={11} color={colors.ink3} weight="semibold" />
    </View>
  );
}

export default function AlertLevels() {
  const colors = useColors();
  const styles = useStyles();
  const alerts = usePrefs((s) => s.alerts);
  const follows = usePrefs((s) => s.follows);
  const storylines = usePrefs((s) => s.storylines);
  const setStorylineLevel = usePrefs((s) => s.setStorylineLevel);
  const stories = useQuery(q.storylines(useApi())).data ?? [];
  const set = usePrefs((s) => s.set);
  const setFollow = usePrefs((s) => s.setFollow);
  const inst = useInstitutionLookup();
  const city = zoneCity(usePlaceTimeZone());
  const menu = useMenu();
  const used = 2;
  const update = (patch: Partial<typeof alerts>) => set('alerts', { ...alerts, ...patch });
  const followed = Object.entries(follows).filter(([id]) => !id.startsWith('dir:'));

  const pickLevel = (title: string, current: FollowLevel, apply: (next: FollowLevel) => void) =>
    menu(
      LEVELS.map((x) => ({
        label: x.value === current ? `${x.label} (current)` : x.label,
        onPress: () => {
          haptic.selection();
          apply(x.value);
        },
      })),
      title,
      'All: every item, bundled. Important: changes and required actions. Digest: summary only. Off: tracked reminders still arrive.',
    );
  const step = (delta: number) => {
    haptic.selection();
    update({ dailyLimit: Math.min(DAILY_LIMIT_RANGE.max, Math.max(DAILY_LIMIT_RANGE.min, alerts.dailyLimit + delta)) });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Alerts', headerLargeTitleEnabled: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: 4, paddingBottom: 40 }}>
        <Card radiusSize="lg" style={styles.today}>
          <View style={styles.between}>
            <Txt v="callout" w="semibold">
              Today
            </Txt>
            <Txt v="footnote" c={colors.ink2} num>
              <Txt v="footnote" w="medium" num>
                {used}
              </Txt>
              {` of ${alerts.dailyLimit} pushes used`}
            </Txt>
          </View>
          <View style={styles.bars} accessibilityLabel={`${used} of ${alerts.dailyLimit} pushes used today`}>
            {Array.from({ length: alerts.dailyLimit }, (_, i) => (
              <View key={i} style={[styles.bar, { backgroundColor: i < used ? colors.accent : colors.fill }]} />
            ))}
          </View>
          <Txt v="footnote" c={colors.ink2} style={{ marginTop: 10 }}>
            Critical alerts never count. Anything over the limit waits for your digest.
          </Txt>
        </Card>

        <GroupLabel>How alerts reach you</GroupLabel>
        <Group inset={INSET.tile}>
          {DELIVERY.map((d) => (
            <Row key={d.word} left={<IconTile icon={d.icon} tone={d.tone} />} align="top">
              <Txt v="callout" w="semibold">
                {d.word}
              </Txt>
              <Txt v="footnote" c={colors.ink2} style={{ marginTop: 1 }}>
                {d.when}
              </Txt>
            </Row>
          ))}
        </Group>

        <GroupLabel>Delivery</GroupLabel>
        <Group inset={INSET.tile}>
          <Row
            left={<IconTile icon="moon" tone="indigo" solid />}
            title="Quiet hours"
            right={
              <View style={styles.times}>
                <TimeField label="Quiet hours start" value={alerts.quietStart} onChange={(v) => update({ quietStart: v })} />
                <Txt v="footnote" c={colors.ink3}>
                  to
                </Txt>
                <TimeField label="Quiet hours end" value={alerts.quietEnd} onChange={(v) => update({ quietEnd: v })} />
              </View>
            }
          />
          <Row left={<IconTile icon="warning" tone="red" solid />} title="Critical during quiet hours" subtitle="Safety near you, deadlines within 48 hours" right={<Switch label="Critical alerts during quiet hours" value={alerts.criticalInQuiet} onChange={(v) => update({ criticalInQuiet: v })} />} />
          <Row
            left={<IconTile icon="bell" tone="brand" solid />}
            title="Most pushes a day"
            right={
              <View
                style={styles.stepper}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="Most pushes a day"
                accessibilityValue={{ min: DAILY_LIMIT_RANGE.min, max: DAILY_LIMIT_RANGE.max, now: alerts.dailyLimit }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
                <Highlight accessibilityRole="button" accessibilityLabel="Fewer" disabled={alerts.dailyLimit <= DAILY_LIMIT_RANGE.min} onPress={() => step(-1)} style={styles.stepBtn}>
                  <Icon name="minus" size={15} color={alerts.dailyLimit <= DAILY_LIMIT_RANGE.min ? colors.pearl : colors.ink} weight="semibold" />
                </Highlight>
                <Txt v="callout" w="semibold" num center style={styles.stepValue}>
                  {alerts.dailyLimit}
                </Txt>
                <Highlight accessibilityRole="button" accessibilityLabel="More" disabled={alerts.dailyLimit >= DAILY_LIMIT_RANGE.max} onPress={() => step(1)} style={styles.stepBtn}>
                  <Icon name="plus" size={15} color={alerts.dailyLimit >= DAILY_LIMIT_RANGE.max ? colors.pearl : colors.ink} weight="semibold" />
                </Highlight>
              </View>
            }
          />
          <Row
            left={<IconTile icon="newspaper" tone="sky" solid />}
            title="Digest"
            right={
              <View style={{ width: 168 }}>
                <Segmented accessibilityLabel="Digest frequency" options={DIGEST} value={alerts.digest} onChange={(v) => update({ digest: v })} />
              </View>
            }
          />
        </Group>
        <GroupNote>{`${alerts.digest === 'daily' ? 'Every day at 18:00' : 'Sundays at 18:00'} · times follow ${city}`}</GroupNote>

        <GroupLabel>Per follow</GroupLabel>
        <Group inset={INSET.mono}>
          {followed.map(([id, level]) => {
            const i = inst(id);
            return (
              <Row key={id} left={<InstitutionLogo id={i.id} label={i.mono} />} title={i.name} subtitle={i.kind} right={<LevelValue level={level} />} accessibilityLabel={`${i.name}, ${level}`} onPress={() => pickLevel(i.name, level, (next) => setFollow(id, next))} />
            );
          })}
          {stories.map((story) => {
            const level = storylines[story.id] ?? 'off';
            return (
              <Row
                key={story.id}
                left={<IconTile icon={story.icon} size={40} tone="violet" />}
                title={story.title}
                subtitle="Storyline"
                right={<LevelValue level={level} />}
                accessibilityLabel={`${story.title}, storyline, ${level}`}
                onPress={() => pickLevel(story.title, level, (next) => setStorylineLevel(story.id, next))}
              />
            );
          })}
        </Group>
        <GroupNote>All: every item, bundled. Important: changes and required actions. Digest: summary only. Off: tracked reminders still arrive.</GroupNote>
      </ScrollView>
    </>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  today: { marginHorizontal: GUTTER },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  bars: { flexDirection: 'row', gap: 4, marginTop: 12 },
  bar: { flex: 1, height: 8, borderRadius: radius.xs },
  times: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { height: 36, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 36, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  stepBtn: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 28 },
  level: { flexDirection: 'row', alignItems: 'center', gap: 5 },
}));
