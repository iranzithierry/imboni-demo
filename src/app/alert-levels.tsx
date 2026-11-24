import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { DAILY_LIMIT_RANGE } from '@/config/constants';
import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { useInstitutionLookup, usePlaceTimeZone } from '@/features/data';
import { haptic } from '@/lib/haptics';
import { zoneCity } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import type { FollowLevel } from '@/state/schema';
import { Card, Initials, Switch, Tile } from '@/ui/atoms';
import { Icon } from '@/ui/icon';
import { Cell, Group, GroupFooter, GroupHeader, INSET } from '@/ui/list';
import { BackButton, LargeTitle, NavBar, Screen, useNavInset, useScrollY } from '@/ui/nav';
import { Segmented } from '@/ui/segmented';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const LEVELS: { value: FollowLevel; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: colors.l1 },
  { value: 'important', label: 'Important', color: colors.tint },
  { value: 'digest', label: 'Digest', color: colors.indigo },
  { value: 'off', label: 'Off', color: colors.l2 },
];
const DIGEST = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
] as const;

const toDate = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
};
const toHhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Compact time pickers on iOS; on Android a tap opens the system dialog. */
function TimeField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'ios') return <DateTimePicker value={toDate(value)} mode="time" display="compact" is24Hour onValueChange={(_, d) => onChange(toHhmm(d))} accentColor={colors.tint} />;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} onPress={() => setOpen(true)} style={styles.time}>
        <Txt v="sh" num>
          {value}
        </Txt>
      </Pressable>
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

export default function AlertLevels() {
  const { scrollY, onScroll } = useScrollY();
  const top = useNavInset();
  const alerts = usePrefs((s) => s.alerts);
  const follows = usePrefs((s) => s.follows);
  const storylines = usePrefs((s) => s.storylines);
  const setStorylineLevel = usePrefs((s) => s.setStorylineLevel);
  const stories = useQuery(q.storylines(useApi())).data ?? [];
  const set = usePrefs((s) => s.set);
  const setFollow = usePrefs((s) => s.setFollow);
  const inst = useInstitutionLookup();
  const city = zoneCity(usePlaceTimeZone());
  const used = 2;
  const update = (patch: Partial<typeof alerts>) => set('alerts', { ...alerts, ...patch });
  const followed = Object.entries(follows).filter(([id]) => !id.startsWith('dir:'));

  return (
    <Screen>
      <NavBar scrollY={scrollY} title="Alerts" left={<BackButton label="Back" />} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: top, paddingBottom: 40 }}>
        <LargeTitle title="Alerts" scrollY={scrollY} style={{ paddingTop: 0 }} />
        <Card style={{ padding: 16, marginTop: 6 }}>
          <View style={styles.between}>
            <Txt v="hl">Today</Txt>
            <Txt v="fn" c={colors.l2} num>
              <Txt v="fn" w="700">
                {used}
              </Txt>
              {` of ${alerts.dailyLimit} used`}
            </Txt>
          </View>
          <View style={styles.bars} accessibilityLabel={`${used} of ${alerts.dailyLimit} alerts used today`}>
            {Array.from({ length: alerts.dailyLimit }, (_, i) => (
              <Animated.View key={i} style={[styles.bar, { backgroundColor: i < used ? colors.orange : colors.track }]} />
            ))}
          </View>
          <Txt v="fn" c={colors.l2} style={{ marginTop: 10 }}>
            Critical alerts never count. Extra alerts move to your digest.
          </Txt>
        </Card>

        <GroupHeader>Delivery</GroupHeader>
        <Group inset={INSET.tile}>
          <Cell
            left={<Tile icon="moon" color="indigo" />}
            title="Quiet hours"
            right={
              <View style={styles.times}>
                <TimeField label="Quiet hours start" value={alerts.quietStart} onChange={(v) => update({ quietStart: v })} />
                <TimeField label="Quiet hours end" value={alerts.quietEnd} onChange={(v) => update({ quietEnd: v })} />
              </View>
            }
          />
          <Cell left={<Tile icon="warning" color="red" />} title="Critical in quiet hours" subtitle="Safety near you, deadlines within 48 h" right={<Switch label="Critical alerts in quiet hours" value={alerts.criticalInQuiet} onChange={(v) => update({ criticalInQuiet: v })} />} />
          <Cell
            left={<Tile icon="bell" color="orange" />}
            title="Daily limit"
            right={
              <View style={styles.stepper} accessibilityRole="adjustable" accessibilityValue={{ min: DAILY_LIMIT_RANGE.min, max: DAILY_LIMIT_RANGE.max, now: alerts.dailyLimit }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fewer"
                  disabled={alerts.dailyLimit <= DAILY_LIMIT_RANGE.min}
                  onPress={() => {
                    haptic.selection();
                    update({ dailyLimit: Math.max(DAILY_LIMIT_RANGE.min, alerts.dailyLimit - 1) });
                  }}
                  style={styles.step}>
                  <Icon name="minus" size={17} color={alerts.dailyLimit <= DAILY_LIMIT_RANGE.min ? colors.l3 : colors.l1} />
                </Pressable>
                <View style={styles.stepSep} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="More"
                  disabled={alerts.dailyLimit >= DAILY_LIMIT_RANGE.max}
                  onPress={() => {
                    haptic.selection();
                    update({ dailyLimit: Math.min(DAILY_LIMIT_RANGE.max, alerts.dailyLimit + 1) });
                  }}
                  style={styles.step}>
                  <Icon name="plus" size={17} color={alerts.dailyLimit >= DAILY_LIMIT_RANGE.max ? colors.l3 : colors.l1} />
                </Pressable>
              </View>
            }
          />
          <Cell left={<Tile icon="newspaper" color="purple" />} title="Digest" right={<View style={{ width: 160 }}><Segmented accessibilityLabel="Digest frequency" options={DIGEST} value={alerts.digest} onChange={(v) => update({ digest: v })} /></View>} />
        </Group>
        <GroupFooter>{`${alerts.digest === 'daily' ? 'Every day at 18:00' : 'Sundays at 18:00'} · times follow ${city}`}</GroupFooter>

        <GroupHeader>Per follow</GroupHeader>
        <Group inset={INSET.avatar}>
          {followed.map(([id, level]) => {
            const i = inst(id);
            const l = LEVELS.find((x) => x.value === level) ?? LEVELS[3];
            return (
              <MenuView
                key={id}
                title={i.name}
                actions={LEVELS.map((x): MenuAction => ({ id: x.value, title: x.label, state: x.value === level ? 'on' : 'off' }))}
                onPressAction={({ nativeEvent }) => {
                  const next = LEVELS.find((x) => x.value === nativeEvent.event);
                  if (next) {
                    haptic.selection();
                    setFollow(id, next.value);
                  }
                }}>
                <Cell left={<Initials label={i.mono} color={i.color} />} title={i.name} subtitle={i.kind} right={<View style={styles.level}><Txt v="sh" c={l?.color}>{l?.label}</Txt><Icon name="chevronUpDown" size={13} color={l?.color ?? colors.l2} /></View>} />
              </MenuView>
            );
          })}
          {stories.map((story) => {
            const level = storylines[story.id] ?? 'off';
            const l = LEVELS.find((x) => x.value === level) ?? LEVELS[3];
            return (
              <MenuView
                key={story.id}
                title={story.title}
                actions={LEVELS.map((x): MenuAction => ({ id: x.value, title: x.label, state: x.value === level ? 'on' : 'off' }))}
                onPressAction={({ nativeEvent }) => {
                  const next = LEVELS.find((x) => x.value === nativeEvent.event);
                  if (next) {
                    haptic.selection();
                    setStorylineLevel(story.id, next.value);
                  }
                }}>
                <Cell left={<Tile icon={story.icon} color={story.color} size="m" style={{ borderRadius: 19 }} />} title={story.title} subtitle="Storyline" right={<View style={styles.level}><Txt v="sh" c={l?.color}>{l?.label}</Txt><Icon name="chevronUpDown" size={13} color={l?.color ?? colors.l2} /></View>} />
              </MenuView>
            );
          })}
        </Group>
        <GroupFooter>All: every item, bundled. Important: changes and required actions. Digest: summary only. Off: tracked reminders still arrive.</GroupFooter>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  bars: { flexDirection: 'row', gap: 4, marginTop: 10 },
  bar: { flex: 1, height: 8, borderRadius: 4 },
  times: { flexDirection: 'row', gap: 6 },
  time: { height: 30, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.fill, justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 32, borderRadius: 9, backgroundColor: colors.fill },
  step: { width: 46, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepSep: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: 'rgba(60,60,67,0.3)' },
  level: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
