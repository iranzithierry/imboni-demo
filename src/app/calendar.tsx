import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { HOME_TIME_ZONE } from '@/config/constants';
import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { CalendarEvent } from '@/data/schema';
import { useToday } from '@/features/data';
import { EVENT_KIND, eventStateLabel } from '@/features/labels';
import { addToCalendar, type CalendarItem } from '@/lib/calendar';
import { addDays, daysBetween, formatDate, isoWeekday, zonedIso } from '@/lib/dates';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { IconTile, Tag } from '@/ui/atoms';
import { Button, IconButton } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { GroupLabel, SectionHeader } from '@/ui/list';
import { Highlight } from '@/ui/pressable';
import { RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const monthOf = (ymd: string) => ymd.slice(0, 7);
const shiftMonth = (ym: string, by: number) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1 + by, 1)).toISOString().slice(0, 7);
};
const daysIn = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y ?? 0, m ?? 1, 0)).getUTCDate();
};
const toItem = (e: CalendarEvent): CalendarItem =>
  e.from && e.to
    ? { title: e.title, start: new Date(zonedIso(e.date, e.from, HOME_TIME_ZONE)), end: new Date(zonedIso(e.date, e.to, HOME_TIME_ZONE)), allDay: false, notes: e.who, timeZone: HOME_TIME_ZONE }
    : { title: e.title, start: new Date(`${e.date}T00:00:00`), end: new Date(`${addDays(e.date, 1)}T00:00:00`), allDay: true, notes: e.who };

export default function CalendarScreen() {
  const colors = useColors();
  const styles = useStyles();
  const today = useToday();
  const events = useQuery(q.calendar(useApi()));
  const toast = useToast();
  const [month, setMonth] = useState(monthOf(today));
  const [selected, setSelected] = useState(today);

  const go = (by: 1 | -1) => {
    haptic.selection();
    const next = shiftMonth(month, by);
    setMonth(next);
    setSelected(monthOf(today) === next ? today : `${next}-01`);
  };
  const swipe = usePanGesture({
    activeOffsetX: [-24, 24],
    failOffsetY: [-12, 12],
    onDeactivate: (e) => {
      'worklet';
      if (e.translationX < -60) scheduleOnRN(go, 1);
      else if (e.translationX > 60) scheduleOnRN(go, -1);
    },
  });

  const all = events.data ?? [];
  const lead = isoWeekday(`${month}-01`) - 1;
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: daysIn(month) }, (_, i) => addDays(`${month}-01`, i))];
  const dayEvents = all.filter((e) => e.date === selected);
  const upcoming = all.filter((e) => e.date > today && e.date !== selected && e.state !== 'took_place').slice(0, 8);
  const deadlines = all.filter((e) => e.kind === 'deadline' && e.date >= today);

  const add = async (items: CalendarEvent[], done: string) => {
    try {
      await addToCalendar(items.map(toItem));
      haptic.success();
      toast({ message: done, icon: 'calendarAdd' });
    } catch (e) {
      toast({ message: userMessage(toAppError(e).code), icon: 'warning' });
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Calendar', headerLargeTitleEnabled: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 48 }}>
        <Txt v="callout" c={colors.ink2} style={styles.intro}>
          Car Free Day, Umuganda, deadlines and holidays. Each date says whether it is the usual schedule or confirmed.
        </Txt>

        <View style={styles.card}>
          <View style={styles.monthRow}>
            <Txt v="title2" accessibilityRole="header" accessibilityLiveRegion="polite" style={{ flex: 1 }}>
              {`${formatDate.month(`${month}-01`)} ${formatDate.year(`${month}-01`)}`}
            </Txt>
            <IconButton icon="chevronLeft" label="Previous month" size={36} onPress={() => go(-1)} />
            <IconButton icon="chevronRight" label="Next month" size={36} onPress={() => go(1)} />
          </View>
          <View style={styles.weekdays} accessibilityElementsHidden>
            {WEEKDAYS.map((d, i) => (
              <Txt key={`${d}${i}`} v="caption" c={i >= 5 ? colors.ink3 : colors.ink2} center style={{ flex: 1 }}>
                {d}
              </Txt>
            ))}
          </View>
          <GestureDetector gesture={swipe}>
            <Animated.View key={month} entering={FadeIn.duration(motion.fast)} style={styles.grid} accessibilityRole="grid">
              {cells.map((ymd, i) => {
                if (!ymd) return <View key={`blank-${i}`} style={styles.cell} />;
                const evs = all.filter((e) => e.date === ymd);
                const isToday = ymd === today;
                const isSel = ymd === selected;
                const past = ymd < today;
                return (
                  <Pressable
                    key={ymd}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSel }}
                    accessibilityLabel={`${formatDate.weekdayLong(ymd)}${isToday ? ', today' : ''}${evs.length ? `, ${evs.map((e) => e.title).join(', ')}` : ''}`}
                    onPress={() => {
                      haptic.selection();
                      setSelected(ymd);
                    }}
                    style={styles.cell}>
                    <View style={[styles.day, isToday && !isSel && styles.today, isSel && styles.sel]}>
                      <Txt v="callout" w={isSel || isToday ? 'semibold' : 'regular'} num c={isSel ? colors.white : past ? colors.ink3 : colors.ink}>
                        {formatDate.day(ymd)}
                      </Txt>
                    </View>
                    <View style={styles.marks}>
                      {evs.slice(0, 3).map((e) => (
                        <View key={e.id} style={[styles.mark, e.kind === 'deadline' ? styles.markSolid : styles.markRing]} />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </Animated.View>
          </GestureDetector>
          <View style={styles.legend}>
            <View style={[styles.mark, styles.markSolid]} />
            <Txt v="caption" c={colors.ink2}>
              Deadline
            </Txt>
            <View style={[styles.mark, styles.markRing, { marginLeft: 10 }]} />
            <Txt v="caption" c={colors.ink2}>
              Event or holiday
            </Txt>
          </View>
        </View>
        {events.isError && !events.data && <RetryLine label="Calendar" error={events.error} onRetry={() => events.refetch()} style={{ marginTop: 12 }} />}

        <GroupLabel>{selected === today ? `Today · ${formatDate.weekdayLong(selected)}` : formatDate.weekdayLong(selected)}</GroupLabel>
        <Animated.View key={selected} entering={FadeIn.duration(motion.fast)} style={styles.list}>
          {dayEvents.length === 0 ? (
            <View style={styles.none}>
              <Txt v="subhead" c={colors.ink2}>
                Nothing scheduled from the institutions you follow.
              </Txt>
            </View>
          ) : (
            <>
              {dayEvents.map((e) => (
                <EventCard key={e.id} e={e} today={today} />
              ))}
              <Button label={dayEvents.length === 1 ? 'Add to my calendar' : `Add ${dayEvents.length} events to my calendar`} icon="calendarAdd" variant="secondary" size="md" onPress={() => add(dayEvents, dayEvents.length === 1 ? 'Added to your calendar' : `Added ${dayEvents.length} events`)} />
            </>
          )}
        </Animated.View>

        <SectionHeader title="Coming up" icon="calendar" accessory={deadlines.length ? <Button label={`Export ${deadlines.length} deadlines`} icon="calendarAdd" variant="secondary" size="sm" hug onPress={() => add(deadlines, `Added ${deadlines.length} deadlines to your calendar`)} /> : undefined} />
        <View style={styles.list}>
          {upcoming.map((e) => (
            <EventCard key={e.id} e={e} today={today} showDate />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

function EventCard({ e, today, showDate }: { e: CalendarEvent; today: string; showDate?: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  const st = eventStateLabel(e.state);
  const inDays = daysBetween(today, e.date);
  const when = e.from ? `${e.from}–${e.to ?? ''}` : 'All day';
  const body = (
    <>
      <IconTile icon={EVENT_KIND[e.kind]} tone={e.kind === 'deadline' ? 'brand' : 'sky'} size={40} />
      <View style={{ flex: 1 }}>
        {showDate && (
          <Txt v="caption" c={colors.ink3} num>
            {`${formatDate.weekdayShort(e.date)}${inDays === 1 ? ' · tomorrow' : inDays > 1 && inDays < 14 ? ` · in ${inDays} days` : ''}`}
          </Txt>
        )}
        <Txt v="callout" w="semibold">
          {e.title}
        </Txt>
        <Txt v="footnote" c={colors.ink2} num>{`${when} · ${e.who}`}</Txt>
        {(e.rule || e.note) && (
          <Txt v="footnote" c={colors.ink3} style={{ marginTop: 2 }}>
            {[e.rule, e.note].filter(Boolean).join(' · ')}
          </Txt>
        )}
        <Tag label={st.label} tone={st.tone} icon={st.icon} style={{ marginTop: 8 }} />
      </View>
      {e.link && <Icon name="chevronRight" size={13} color={colors.pearl} weight="semibold" />}
    </>
  );
  if (!e.link) return <View style={styles.event}>{body}</View>;
  const link = e.link;
  return (
    <Highlight accessibilityRole="button" onPress={() => router.push(toHref(link))} pressedStyle={{ backgroundColor: colors.pressed }} style={styles.event}>
      {body}
    </Highlight>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  intro: { paddingHorizontal: GUTTER, paddingTop: 4 },
  card: { marginHorizontal: GUTTER, marginTop: 18, padding: 14, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingBottom: 10 },
  weekdays: { flexDirection: 'row', paddingBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 50, alignItems: 'center', paddingTop: 2 },
  day: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.accent },
  sel: { backgroundColor: colors.accent },
  marks: { flexDirection: 'row', gap: 3, height: 6, marginTop: 3 },
  mark: { width: 6, height: 6, borderRadius: 3 },
  markSolid: { backgroundColor: colors.accent },
  markRing: { borderWidth: 1.5, borderColor: colors.sky },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, paddingLeft: 6 },
  list: { paddingHorizontal: GUTTER, gap: 10 },
  none: { padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed' },
  event: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
}));
