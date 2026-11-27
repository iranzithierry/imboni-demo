import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { usePlaceTimeZone } from '@/features/data';
import { SetupHeader } from '@/features/setup/progress-nav';
import { haptic } from '@/lib/haptics';
import { requestNotifications } from '@/lib/notifications';
import { zoneCity } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import { IconTile, Switch } from '@/ui/atoms';
import { BrandMark } from '@/ui/brand';
import { Button, TextAction } from '@/ui/button';
import { Group, GroupLabel, GroupNote, INSET, Row } from '@/ui/list';
import { Dock, useDockInset } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors, useScheme } from '@/ui/theme';

/** Arrival order; the newest banner lands on top, as on an iPhone. */
const PREVIEWS: { title: string; body: string; when: string; kind: string }[] = [
  { title: 'Your day in 6 updates', body: 'MINEDUC, NIDA, the embassy and 3 more. Open the digest.', when: '18:00', kind: 'Digest' },
  { title: 'BNR · Deadline moved', body: 'Bank deadline for old banknotes: 1 Nov → 30 Nov 2026.', when: '2m ago', kind: 'High' },
  { title: 'Meteo Rwanda · Critical', body: 'Heavy rain in Kigali until 18:00. Avoid low-lying roads.', when: 'now', kind: 'Critical' },
];
const ARRIVAL_MS = 1100;

/**
 * What allowing notifications looks like: a phone's lock screen where the example alerts arrive one at a
 * time. Tapping a banner expands it; Replay runs the arrivals again. With reduced motion all three show.
 */
function LockScreen() {
  const colors = useColors();
  const scheme = useScheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const [count, setCount] = useState(reduced ? PREVIEWS.length : 0);
  const [run, setRun] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (reduced || count >= PREVIEWS.length) return;
    const t = setTimeout(() => {
      haptic.tap();
      setCount((n) => n + 1);
    }, count === 0 ? 500 : ARRIVAL_MS);
    return () => clearTimeout(t);
  }, [count, run, reduced]);

  const dark = scheme === 'dark';
  const glass = dark ? 'rgba(58,58,60,0.92)' : 'rgba(255,255,255,0.94)';
  const ink = dark ? '#F5F5F7' : '#2A120A';
  const ink2 = dark ? '#AEAEB2' : '#6E6E73';
  const shown = PREVIEWS.slice(0, count).reverse();

  return (
    <View style={styles.paneWrap}>
      <View style={styles.phone} accessibilityLabel="Example notifications on a lock screen" onLayout={(e) => setSize(e.nativeEvent.layout)}>
        <Svg style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={dark ? '#1C1C1E' : '#DCDCE2'} />
              <Stop offset="1" stopColor={dark ? '#0B0B0C' : '#B8B8C2'} />
            </LinearGradient>
          </Defs>
          <Rect width={size.width} height={size.height} fill="url(#wall)" />
        </Svg>
        <View style={styles.island} />
        <Txt v="footnote" w="medium" c={ink2} center style={{ marginTop: 14 }}>
          Tuesday 24 November
        </Txt>
        <Txt v="display" c={ink} center style={styles.clock}>
          17:42
        </Txt>
        <View style={styles.stack}>
          {shown.map((p) => {
            const expanded = open === p.title;
            return (
              <Animated.View key={`${run}-${p.title}`} entering={reduced ? undefined : FadeInDown.duration(motion.base).easing(Easing.out(Easing.cubic))} layout={LinearTransition.duration(motion.base)}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${p.kind}. ${p.title}. ${p.body}`}
                  onPress={() => {
                    haptic.selection();
                    setOpen(expanded ? null : p.title);
                  }}
                  style={({ pressed }) => [styles.banner, { backgroundColor: glass, opacity: pressed ? 0.85 : 1 }]}>
                  <BrandMark size={32} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.between}>
                      <Txt v="footnote" w="semibold" c={ink} numberOfLines={1} style={{ flex: 1 }}>
                        {p.title}
                      </Txt>
                      <Txt v="caption" c={ink2}>
                        {p.when}
                      </Txt>
                    </View>
                    <Txt v="footnote" c={ink} numberOfLines={expanded ? undefined : 1} style={{ marginTop: 1 }}>
                      {p.body}
                    </Txt>
                    {expanded && (
                      <Txt v="caption" c={ink2} style={{ marginTop: 6 }}>
                        {p.kind === 'Critical' ? 'Critical alerts arrive at once, even in quiet hours.' : p.kind === 'High' ? 'Changes to what you track arrive at once.' : 'Everything else waits for one evening summary.'}
                      </Txt>
                    )}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>
      <View style={styles.paneFoot}>
        <Txt v="footnote" c={colors.ink2} style={{ flex: 1 }}>
          {count < PREVIEWS.length ? 'Alerts arriving…' : 'Tap an alert to see when it reaches you.'}
        </Txt>
        <TextAction
          label="Replay"
          icon="refresh"
          onPress={() => {
            setOpen(null);
            setCount(0);
            setRun((n) => n + 1);
          }}
        />
      </View>
    </View>
  );
}

export default function Alerts() {
  const colors = useColors();
  const styles = useStyles();
  const alerts = usePrefs((s) => s.alerts);
  const set = usePrefs((s) => s.set);
  const city = zoneCity(usePlaceTimeZone());
  const [asking, setAsking] = useState(false);
  const bottom = useDockInset(2);

  const enable = async () => {
    setAsking(true);
    // This screen explains first; the call below triggers the one-time system prompt.
    await requestNotifications().catch(() => false);
    setAsking(false);
    router.push('/save');
  };

  return (
    <View style={{ flex: 1 }}>
      <SetupHeader step={4} mode="onboarding" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: bottom }}>
        <View style={styles.head}>
          <Txt v="title1" accessibilityRole="header">
            Alerts that respect your day
          </Txt>
          <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>
            Urgent things reach you at once. Everything else waits for one summary in the evening.
          </Txt>
        </View>
        <LockScreen />
        <GroupLabel>Your settings</GroupLabel>
        <Group inset={INSET.tile}>
          <Row left={<IconTile icon="moon" tone="indigo" solid />} title="Quiet hours" detail={`${alerts.quietStart}–${alerts.quietEnd}`} />
          <Row left={<IconTile icon="warning" tone="red" solid />} title="Critical alerts during quiet hours" right={<Switch label="Critical alerts during quiet hours" value={alerts.criticalInQuiet} onChange={(v) => set('alerts', { ...alerts, criticalInQuiet: v })} />} />
          <Row left={<IconTile icon="bell" tone="brand" solid />} title="Most pushes a day" detail={String(alerts.dailyLimit)} />
        </Group>
        <GroupNote>{`Times follow ${city}. Critical alerts never count toward the limit. Change any of this later in Profile.`}</GroupNote>
      </ScrollView>
      <Dock>
        <Button label="Turn on notifications" icon="bell" loading={asking} onPress={enable} />
        <Button label="Not now" variant="secondary" onPress={() => router.push('/save')} />
      </Dock>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  head: { paddingHorizontal: GUTTER + 4, paddingTop: 4 },
  paneWrap: { marginHorizontal: GUTTER, marginTop: 22 },
  phone: { alignSelf: 'center', width: '86%', height: 400, paddingHorizontal: 10, borderRadius: 44, borderCurve: 'continuous', borderWidth: 6, borderColor: colors.night, overflow: 'hidden' },
  island: { alignSelf: 'center', marginTop: 10, width: 86, height: 24, borderRadius: 12, backgroundColor: '#000' },
  clock: { fontSize: 58, lineHeight: 64 },
  stack: { marginTop: 14, gap: 6 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 11, borderRadius: 20, borderCurve: 'continuous' },
  paneFoot: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingHorizontal: 4, borderRadius: radius.sm },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
}));
