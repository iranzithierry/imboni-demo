import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { HOME_TIME_ZONE } from '@/config/constants';
import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { useToday } from '@/features/data';
import { eventStateLabel } from '@/features/labels';
import { addToCalendar } from '@/lib/calendar';
import { addDays, formatDate, isoWeekday, zonedIso } from '@/lib/dates';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { Badge } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Group, GroupHeader } from '@/ui/list';
import { BackButton, NavBar, NavButton, Screen, useNavInset } from '@/ui/nav';
import { RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors, swatch } from '@/ui/theme';
import { useToast } from '@/ui/toast';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const monthOf = (ymd: string) => ymd.slice(0, 7);
const shiftMonth = (ym: string, by: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};
const daysIn = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y ?? 0, m ?? 1, 0)).getUTCDate();
};

export default function CalendarScreen() {
  const today = useToday();
  const events = useQuery(q.calendar(useApi()));
  const toast = useToast();
  // Nav holds the month title (41 + 6) and weekday row (16 + 6) under the bar.
  const top = useNavInset(69);
  const [month, setMonth] = useState(monthOf(today));
  const [selected, setSelected] = useState(today);
  const [direction, setDirection] = useState<1 | -1>(1);

  const go = (by: 1 | -1) => {
    haptic.selection();
    setDirection(by);
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

  const lead = isoWeekday(`${month}-01`) - 1;
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: daysIn(month) }, (_, i) => addDays(`${month}-01`, i))];
  const dayEvents = (events.data ?? []).filter((e) => e.date === selected);

  const add = async () => {
    try {
      await addToCalendar(
        dayEvents.map((e) =>
          e.from && e.to
            ? { title: e.title, start: new Date(zonedIso(e.date, e.from, HOME_TIME_ZONE)), end: new Date(zonedIso(e.date, e.to, HOME_TIME_ZONE)), allDay: false, notes: e.who, timeZone: HOME_TIME_ZONE }
            : { title: e.title, start: new Date(`${e.date}T00:00:00`), end: new Date(`${addDays(e.date, 1)}T00:00:00`), allDay: true, notes: e.who },
        ),
      );
      haptic.success();
      toast({ message: dayEvents.length === 1 ? 'Added to your calendar' : `Added ${dayEvents.length} events`, icon: 'calendar', iconColor: colors.red });
    } catch (e) {
      toast({ message: userMessage(toAppError(e).code), icon: 'warning', iconColor: colors.orange });
    }
  };

  return (
    <Screen bg={colors.white}>
      <NavBar
        background="glass"
        left={<BackButton label={formatDate.year(`${month}-01`)} color={colors.red} />}
        right={
          <>
            <NavButton label="Previous month" icon="chevronLeft" color={colors.red} onPress={() => go(-1)} />
            <NavButton label="Next month" icon="chevronRight" color={colors.red} onPress={() => go(1)} />
          </>
        }>
        <Txt v="lt" c={colors.red} style={{ paddingHorizontal: 20, paddingBottom: 6 }} accessibilityRole="header" accessibilityLiveRegion="polite">
          {formatDate.month(`${month}-01`)}
        </Txt>
        <View style={styles.weekdays} accessibilityElementsHidden>
          {WEEKDAYS.map((d, i) => (
            <Txt key={`${d}${i}`} v="c1" c={i >= 5 ? colors.l2 : colors.l1} center style={{ flex: 1 }}>
              {d}
            </Txt>
          ))}
        </View>
      </NavBar>
      <ScrollView contentContainerStyle={{ paddingTop: top, paddingBottom: 40 }} style={{ backgroundColor: colors.bg }}>
        <GestureDetector gesture={swipe}>
          <Animated.View key={month} entering={direction === 1 ? SlideInRight.springify().damping(20) : SlideInLeft.springify().damping(20)} style={styles.grid} accessibilityRole="grid">
            {cells.map((ymd, i) => {
              if (!ymd) return <View key={`blank-${i}`} style={styles.cell} />;
              const evs = (events.data ?? []).filter((e) => e.date === ymd);
              const isToday = ymd === today;
              const isSel = ymd === selected;
              const weekend = isoWeekday(ymd) >= 6;
              return (
                <Pressable
                  key={ymd}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                  accessibilityLabel={`${formatDate.weekdayLong(ymd)}${evs.length ? `, ${evs.length} event${evs.length > 1 ? 's' : ''}` : ''}`}
                  onPress={() => {
                    haptic.selection();
                    setSelected(ymd);
                  }}
                  style={styles.cell}>
                  <View style={[styles.day, isSel && { backgroundColor: isToday ? colors.red : colors.l1 }]}>
                    <Txt num style={{ fontSize: 19, fontWeight: isSel || isToday ? '600' : '400' }} c={isSel ? colors.white : isToday ? colors.red : weekend ? colors.l2 : colors.l1}>
                      {formatDate.day(ymd)}
                    </Txt>
                  </View>
                  <View style={styles.dots}>
                    {evs.slice(0, 3).map((e) => (
                      <View key={e.id} style={[styles.dot, { backgroundColor: swatch[e.color] }]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        </GestureDetector>
        {events.isError && !events.data && <RetryLine label="Calendar" error={events.error} onRetry={() => events.refetch()} />}
        <GroupHeader top={14}>{formatDate.weekdayLong(selected)}</GroupHeader>
        {dayEvents.length === 0 ? (
          <Txt v="co" c={colors.l2} center style={{ paddingTop: 24 }}>
            No events from your follows
          </Txt>
        ) : (
          <Animated.View key={selected} entering={FadeIn}>
            <Group>
              {dayEvents.map((e) => {
                const st = eventStateLabel(e.state);
                return (
                  <View key={e.id} style={styles.event}>
                    <View style={[styles.bar, { backgroundColor: swatch[e.color] }]} />
                    <View style={{ flex: 1 }}>
                      <Txt v="hl">{e.title}</Txt>
                      <Txt v="fn" c={colors.l2}>
                        {e.who}
                      </Txt>
                      <Badge label={st.label} tone={st.tone} icon={st.icon} style={{ marginTop: 8 }} />
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Txt v="fn" num>
                        {e.from ?? 'All day'}
                      </Txt>
                      {e.to && (
                        <Txt v="fn" c={colors.l2} num>
                          {e.to}
                        </Txt>
                      )}
                    </View>
                  </View>
                );
              })}
            </Group>
            <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
              <Button label="Add to my Calendar" icon="plus" variant="red" onPress={add} />
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekdays: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, backgroundColor: colors.white, paddingBottom: 8 },
  cell: { width: `${100 / 7}%`, height: 50, alignItems: 'center', paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(60,60,67,0.18)' },
  day: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 2, height: 5, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  event: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: colors.card },
  bar: { width: 4, borderRadius: 2 },
});
