import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn, useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { RATE_ALERT_THRESHOLD_PCT } from '@/config/constants';
import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Rate } from '@/data/schema';
import { useToday } from '@/features/data';
import { addDays, formatDate, formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { usePrefs } from '@/state/prefs';
import { Switch, Tile } from '@/ui/atoms';
import { BackButton, NavBar, Screen, useNavInset } from '@/ui/nav';
import { Segmented } from '@/ui/segmented';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const D = colors.dark;
const TABS = [
  { value: 'fx', label: 'Exchange' },
  { value: 'fuel', label: 'Fuel' },
] as const;
const RANGES = [
  { value: '1W', label: '1W', days: 7 },
  { value: '1M', label: '1M', days: 30 },
  { value: '3M', label: '3M', days: 90 },
  { value: '1Y', label: '1Y', days: 250 },
] as const;
type Range = (typeof RANGES)[number]['value'];

const toneOf = (pct: number) => (pct > 0 ? D.green : pct < 0 ? D.red : D.neutral);
const fmt = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctLabel = (p: number) => `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(2)}%`;

function points(values: readonly number[], w: number, h: number, pad: number) {
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  return values.map((v, i) => ({ x: (i / Math.max(1, values.length - 1)) * w, y: pad + (h - 2 * pad) - ((v - lo) / span) * (h - 2 * pad) }));
}
const toPath = (pts: readonly { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function Chart({ rate, range, onScrub }: { rate: Rate; range: Range; onScrub: (i: number | null) => void }) {
  const { width } = useWindowDimensions();
  const gradientId = useId();
  const H = 180;
  const days = RANGES.find((r) => r.value === range)?.days ?? 30;
  const values = rate.history.slice(-days);
  const pts = points(values, width, H, 20);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const color = toneOf(rate.changePct);
  const path = toPath(pts);
  const last = pts[pts.length - 1] ?? { x: width, y: H / 2 };
  const scrub = useSharedValue(-1);
  const lastIndex = useSharedValue(-1);

  const indexAt = (x: number) => {
    'worklet';
    const i = Math.round((x / width) * (xs.length - 1));
    return Math.max(0, Math.min(xs.length - 1, i));
  };
  const pan = usePanGesture({
    minDistance: 0,
    onBegin: (e) => {
      'worklet';
      const i = indexAt(e.x);
      scrub.set(i);
      lastIndex.set(i);
      scheduleOnRN(onScrub, i);
    },
    onUpdate: (e) => {
      'worklet';
      const i = indexAt(e.x);
      scrub.set(i);
      if (i !== lastIndex.get()) {
        lastIndex.set(i);
        scheduleOnRN(onScrub, i);
      }
    },
    onFinalize: () => {
      'worklet';
      scrub.set(-1);
      scheduleOnRN(onScrub, null);
    },
  });
  const lineProps = useAnimatedProps(() => {
    const i = scrub.get();
    const x = i < 0 ? -10 : (xs[i] ?? 0);
    return { x1: x, x2: x, opacity: i < 0 ? 0 : 1 };
  });
  const dotProps = useAnimatedProps(() => {
    const i = scrub.get();
    return { cx: i < 0 ? last.x - 6 : (xs[i] ?? 0), cy: i < 0 ? last.y : (ys[i] ?? 0) };
  });

  return (
    <GestureDetector gesture={pan}>
      <View accessibilityRole="image" accessibilityLabel={`${rate.code} to Rwandan franc over ${range}`}>
        <Svg width={width} height={H}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Line x1={0} y1={40} x2={width} y2={40} stroke={D.sep} strokeDasharray="2 4" />
          <Line x1={0} y1={100} x2={width} y2={100} stroke={D.sep} strokeDasharray="2 4" />
          <Path d={`${path} L${width} ${H} L0 ${H} Z`} fill={`url(#${gradientId})`} />
          <Path d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
          <AnimatedLine y1={0} y2={H} stroke={colors.white} strokeOpacity={0.5} strokeWidth={1} animatedProps={lineProps} />
          <AnimatedCircle r={5} fill={color} stroke={colors.black} strokeWidth={2} animatedProps={dotProps} />
        </Svg>
      </View>
    </GestureDetector>
  );
}

function Spark({ rate }: { rate: Rate }) {
  const pts = points(rate.history.slice(-20), 70, 28, 3);
  return (
    <Svg width={70} height={28} accessibilityElementsHidden>
      <Path d={toPath(pts)} fill="none" stroke={toneOf(rate.changePct)} strokeWidth={1.6} />
    </Svg>
  );
}

export default function RatesScreen() {
  const rates = useQuery(q.rates(useApi()));
  const top = useNavInset();
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('fx');
  const [code, setCode] = useState('USD');
  const [range, setRange] = useState<Range>('1M');
  const [scrubbed, setScrubbed] = useState<number | null>(null);
  const today = useToday();
  const alerts = usePrefs((s) => s.rateAlerts);
  const set = usePrefs((s) => s.set);
  const data = rates.data;
  if (!data) return <Screen bg="#000" statusBar="light">{rates.isPending ? null : <ErrorScreen error={rates.error} onRetry={() => rates.refetch()} />}</Screen>;
  const rate = data.fx.find((r) => r.code === code) ?? data.fx[0];
  if (!rate) return null;

  const days = RANGES.find((r) => r.value === range)?.days ?? 30;
  const shown = scrubbed === null ? rate.value : (rate.history.slice(-days)[scrubbed] ?? rate.value);
  const shownDay = scrubbed === null ? null : addDays(today, scrubbed - (Math.min(days, rate.history.length) - 1));

  return (
    <Screen bg="#000" statusBar="light">
      <NavBar
        dark
        left={<BackButton label="Today" color={D.tint} />}
        center={
          <View style={{ width: 190 }}>
            <Segmented dark accessibilityLabel="Rates section" options={TABS} value={tab} onChange={setTab} />
          </View>
        }
      />
      {tab === 'fx' ? (
        <Animated.ScrollView entering={FadeIn} contentContainerStyle={{ paddingTop: top + 10, paddingBottom: 40 }}>
          <View style={styles.px20}>
            <Txt v="fn" c={D.l2}>{`${rate.name} · BNR reference`}</Txt>
            <Txt num c={colors.white} style={{ fontSize: 40, lineHeight: 46, fontWeight: '700', marginTop: 2 }} accessibilityLiveRegion="polite">
              {fmt(shown)}
            </Txt>
            <Txt v="hl" num c={toneOf(rate.changePct)}>
              {shownDay ? formatDate.weekdayShort(shownDay) : `${pctLabel(rate.changePct)} `}
              {!shownDay && (
                <Txt v="fn" c={D.l2}>
                  today
                </Txt>
              )}
            </Txt>
          </View>
          <View style={{ paddingTop: 14 }}>
            <Chart rate={rate} range={range} onScrub={(i) => { if (i !== null) haptic.selection(); setScrubbed(i); }} />
          </View>
          <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
            <Segmented dark accessibilityLabel="Chart range" options={RANGES} value={range} onChange={setRange} />
          </View>
          <Txt v="fn" num c={D.l2} style={[styles.px20, { paddingTop: 10 }]}>{`As of ${formatDate.long(data.asOf.slice(0, 10))}, ${formatTime(data.asOf)} · next publication ${data.nextPublication}`}</Txt>
          <Txt v="cap" c={D.l2} style={[styles.px20, { paddingTop: 24, paddingBottom: 6 }]}>
            Watchlist
          </Txt>
          {data.fx.map((r) => (
            <Pressable key={r.code} accessibilityRole="button" accessibilityState={{ selected: r.code === code }} onPress={() => { haptic.selection(); setCode(r.code); setScrubbed(null); }} style={[styles.watch, r.code === code && { backgroundColor: D.card }]}>
              <View style={{ flex: 1 }}>
                <Txt v="hl" c={colors.white}>
                  {r.code}
                </Txt>
                <Txt v="fn" c={D.l2} numberOfLines={1}>
                  {r.name}
                </Txt>
              </View>
              <Spark rate={r} />
              <View style={{ alignItems: 'flex-end', width: 92 }}>
                <Txt v="hl" num c={colors.white}>
                  {fmt(r.value)}
                </Txt>
                <View style={[styles.chg, { backgroundColor: toneOf(r.changePct) }]}>
                  <Txt v="fn" w="600" num c={colors.white}>
                    {pctLabel(r.changePct)}
                  </Txt>
                </View>
              </View>
            </Pressable>
          ))}
          <View style={[styles.watch, styles.alertRow]}>
            <Tile icon="bell" color="orange" />
            <View style={{ flex: 1 }}>
              <Txt c={colors.white}>{`Alert when ${rate.code} moves`}</Txt>
              <Txt v="fn" c={D.l2}>{`More than ${RATE_ALERT_THRESHOLD_PCT}% in a day`}</Txt>
            </View>
            <Switch label={`${rate.code} rate alert`} value={alerts[rate.code] ?? false} activeColor={D.green} onChange={(v) => set('rateAlerts', { ...alerts, [rate.code]: v })} />
          </View>
        </Animated.ScrollView>
      ) : (
        <Animated.ScrollView entering={FadeIn} contentContainerStyle={{ paddingTop: top + 12, paddingBottom: 40 }}>
          <Txt v="fn" c={D.l2} style={styles.px20}>
            Pump price ceilings in Kigali · RURA
          </Txt>
          <View style={styles.fuel}>
            {data.fuel.items.map((f) => (
              <View key={f.label} style={styles.fuelCard}>
                <Tile icon="fuel" color={f.color} />
                <Txt v="fn" c={D.l2} style={{ marginTop: 18 }}>
                  {f.label}
                </Txt>
                <Txt v="t1" num c={colors.white}>
                  {f.price.toLocaleString('en-GB')}
                </Txt>
                <Txt v="fn" num c={f.delta > 0 ? D.orange : D.green}>{`${f.delta > 0 ? '▲' : '▼'} ${Math.abs(f.delta)}`}</Txt>
              </View>
            ))}
          </View>
          <View style={styles.darkGroup}>
            {[
              ['Announced', formatDate.long(data.fuel.announced)],
              ['Valid until', 'Next RURA notice'],
              ['Outside Kigali', 'Per province'],
            ].map(([k, v], i) => (
              <View key={k} style={[styles.darkRow, i > 0 && styles.darkLine]}>
                <Txt c={colors.white} style={{ flex: 1 }}>
                  {k}
                </Txt>
                <Txt c={D.l2} num>
                  {v}
                </Txt>
              </View>
            ))}
          </View>
          <Txt v="cap" c={D.l2} style={[styles.px20, { paddingTop: 22, paddingBottom: 6 }]}>
            Revisions
          </Txt>
          <View style={styles.darkGroup}>
            {data.fuel.revisions.map((r, i) => (
              <View key={r.date} style={[styles.darkRow, i > 0 && styles.darkLine]}>
                <Txt num c={D.l2} style={{ width: 70 }}>
                  {formatDate.short(r.date)}
                </Txt>
                <Txt c={colors.white} style={{ flex: 1 }}>
                  {r.title}
                </Txt>
                {r.current && (
                  <View style={[styles.chg, { backgroundColor: 'rgba(10,132,255,0.25)' }]}>
                    <Txt v="c1" w="600" c={D.tint}>
                      Current
                    </Txt>
                  </View>
                )}
              </View>
            ))}
          </View>
        </Animated.ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  px20: { paddingHorizontal: 20 },
  watch: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: D.sep },
  alertRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.sep },
  chg: { minWidth: 72, alignItems: 'flex-end', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  fuel: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  fuelCard: { flex: 1, backgroundColor: D.card, borderRadius: 18, padding: 16 },
  darkGroup: { marginHorizontal: 16, marginTop: 14, backgroundColor: D.card, borderRadius: 12 },
  darkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  darkLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: D.sepStrong },
});
