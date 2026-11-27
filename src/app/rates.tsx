import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { Fragment, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn, LinearTransition, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { RATE_ALERT_THRESHOLD_PCT } from '@/config/constants';
import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Rate, Rates } from '@/data/schema';
import { useNow, useToday } from '@/features/data';
import { AsOf } from '@/features/record/parts';
import { addDays, daysBetween, formatDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { usePrefs } from '@/state/prefs';
import { IconTile, Switch, Tag } from '@/ui/atoms';
import { IconButton } from '@/ui/button';
import { Icon, type IconName } from '@/ui/icon';
import { Group, INSET, Row, Rule, SectionHeader } from '@/ui/list';
import { Segmented } from '@/ui/segmented';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { featureColors, createStyles, fonts, GUTTER, motion, radius, useColors, useScheme, type Hue, type Palette, type Scheme } from '@/ui/theme';

const RANGES = [
  { value: '1W', label: '1W', days: 7, words: 'this week' },
  { value: '1M', label: '1M', days: 30, words: 'this month' },
  { value: '3M', label: '3M', days: 90, words: 'in 3 months' },
  { value: '1Y', label: '1Y', days: 250, words: 'this year' },
] as const;
type Range = (typeof RANGES)[number]['value'];

/** Each currency keeps one colour on its chart and its sparkline; its code always sits beside it. */
const CURRENCY_HUE: Record<string, Hue> = { USD: 'indigo', EUR: 'sky', GBP: 'pink', KES: 'amber', UGX: 'teal', TZS: 'violet' };
const currencyColor = (colors: Palette, code: string) => featureColors(colors, CURRENCY_HUE[code] ?? 'indigo');

/** The two fuel lines share one plot, so their pair is checked for colour-blind separation in each scheme. */
const FUEL_COLORS: Record<Scheme, { petrol: string; diesel: string }> = {
  light: { petrol: '#D97706', diesel: '#5150D6' },
  dark: { petrol: '#C98012', diesel: '#8080F0' },
};

const fmt = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = (v: number) => Math.round(v).toLocaleString('en-GB');
const move = (colors: Palette, pct: number): { icon: IconName; fg: string; text: string } =>
  pct > 0 ? { icon: 'arrowUp', fg: colors.ok, text: `+${pct.toFixed(2)}%` } : pct < 0 ? { icon: 'arrowDown', fg: colors.bad, text: `−${Math.abs(pct).toFixed(2)}%` } : { icon: 'minus', fg: colors.ink2, text: '0.00%' };

function points(values: readonly number[], w: number, h: number, padTop: number, padBottom: number) {
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  return values.map((v, i) => ({ x: (i / Math.max(1, values.length - 1)) * w, y: padTop + (h - padTop - padBottom) - ((v - lo) / span) * (h - padTop - padBottom) }));
}
const toPath = (pts: readonly { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** History in the currency's colour, with a scrubber: drag sideways to read any day. */
function FxChart({ rate, days, width, onScrub }: { rate: Rate; days: number; width: number; onScrub: (i: number | null) => void }) {
  const colors = useColors();
  const hue = currencyColor(colors, rate.code).fg;
  const H = 176;
  const values = rate.history.slice(-days);
  const pts = points(values, width, H, 18, 14);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const path = toPath(pts);
  const last = pts[pts.length - 1] ?? { x: width, y: H / 2 };
  const scrub = useSharedValue(-1);
  const lastIndex = useSharedValue(-1);

  const indexAt = (x: number) => {
    'worklet';
    return Math.max(0, Math.min(xs.length - 1, Math.round((x / width) * (xs.length - 1))));
  };
  // Horizontal drags read the chart; vertical ones fail it so the page keeps scrolling.
  const pan = usePanGesture({
    activeOffsetX: [-6, 6],
    failOffsetY: [-10, 10],
    onActivate: (e) => {
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
    // The resting dot sits inside the right edge so its ring isn't clipped.
    return { cx: i < 0 ? Math.min(last.x, width - 7) : (xs[i] ?? 0), cy: i < 0 ? last.y : (ys[i] ?? 0) };
  });

  return (
    <GestureDetector gesture={pan}>
      <View accessibilityRole="image" accessibilityLabel={`${rate.name} in Rwandan francs, from ${fmt(values[0] ?? rate.value)} to ${fmt(rate.value)}. Drag sideways to read a day.`}>
        <Svg width={width} height={H}>
          <Defs>
            <LinearGradient id="fxWash" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={hue} stopOpacity={0.2} />
              <Stop offset="1" stopColor={hue} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={f} x1={0} y1={H * f} x2={width} y2={H * f} stroke={colors.line} strokeWidth={StyleSheet.hairlineWidth} />
          ))}
          <Path d={`${path} L${width} ${H} L0 ${H} Z`} fill="url(#fxWash)" />
          <Path d={path} fill="none" stroke={hue} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <AnimatedLine y1={0} y2={H} stroke={colors.ink2} strokeWidth={1} animatedProps={lineProps} />
          <AnimatedCircle r={5} fill={hue} stroke={colors.card} strokeWidth={2} animatedProps={dotProps} />
        </Svg>
      </View>
    </GestureDetector>
  );
}

function Spark({ rate }: { rate: Rate }) {
  const colors = useColors();
  const pts = points(rate.history.slice(-20), 64, 26, 3, 3);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={64} height={26}>
        <Path d={toPath(pts)} fill="none" stroke={currencyColor(colors, rate.code).fg} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** Quick sums against the selected rate; the direction flips with one tap. */
function Converter({ rate }: { rate: Rate }) {
  const colors = useColors();
  const styles = useStyles();
  const [amount, setAmount] = useState('100');
  const [toRwf, setToRwf] = useState(true);
  const n = Number(amount.replace(/,/g, '')) || 0;
  const result = toRwf ? n * rate.value : n / rate.value;
  const from = toRwf ? rate.code : 'RWF';
  const to = toRwf ? 'RWF' : rate.code;
  return (
    <View style={styles.convert}>
      <View style={styles.convertField}>
        <TextInput
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          selectTextOnFocus
          accessibilityLabel={`Amount in ${from}`}
          style={[styles.input, { color: colors.ink }]}
        />
        <Txt v="callout" w="medium" c={colors.ink2}>
          {from}
        </Txt>
      </View>
      <IconButton
        icon="exchange"
        label={`Convert ${to} to ${from} instead`}
        variant="tinted"
        size={40}
        onPress={() => {
          haptic.selection();
          setToRwf((v) => !v);
          setAmount(result ? String(Number(result.toFixed(2))) : amount);
        }}
      />
      <View style={[styles.convertField, styles.convertResult]} accessibilityLiveRegion="polite">
        <Txt v="title3" numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1 }}>
          {toRwf ? whole(result) : fmt(result)}
        </Txt>
        <Txt v="callout" w="medium" c={colors.ink2}>
          {to}
        </Txt>
      </View>
    </View>
  );
}

function FxTab({ data }: { data: Rates }) {
  const colors = useColors();
  const styles = useStyles();
  const now = useNow();
  const [open, setOpen] = useState<string | null>(data.fx[0]?.code ?? null);
  const stale = now.getTime() - new Date(data.asOf).getTime() > 30 * 3_600_000;
  const converting = data.fx.find((r) => r.code === open) ?? data.fx[0];

  return (
    <Animated.View entering={FadeIn.duration(motion.fast)}>
      <View style={styles.asOf}>
        <AsOf iso={data.asOf} stale={stale} prefix={`BNR, ${formatDate.short(data.asOf.slice(0, 10))} at`} />
        <Txt v="caption" c={colors.ink3}>{`Next ${data.nextPublication}`}</Txt>
      </View>
      <Rule />
      {data.fx.map((r) => (
        <Fragment key={r.code}>
          <CurrencyRow
            rate={r}
            open={open === r.code}
            onToggle={() => {
              haptic.selection();
              setOpen((cur) => (cur === r.code ? null : r.code));
            }}
          />
          <Rule style={{ marginLeft: GUTTER }} />
        </Fragment>
      ))}
      {converting && (
        <>
          <SectionHeader title={`Convert ${converting.code}`} compact />
          <Converter key={converting.code} rate={converting} />
        </>
      )}
    </Animated.View>
  );
}

/** One currency: a compact row that opens in place to its chart, ranges and alert. */
function CurrencyRow({ rate, open, onToggle }: { rate: Rate; open: boolean; onToggle: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  const today = useToday();
  const alerts = usePrefs((s) => s.rateAlerts);
  const set = usePrefs((s) => s.set);
  const [range, setRange] = useState<Range>('1M');
  const [scrubbed, setScrubbed] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const day = move(colors, rate.changePct);
  const tint = currencyColor(colors, rate.code);
  const r = RANGES.find((x) => x.value === range) ?? RANGES[1];
  const values = rate.history.slice(-r.days);
  const shown = scrubbed === null ? rate.value : (values[scrubbed] ?? rate.value);
  const shownDay = scrubbed === null ? null : addDays(today, scrubbed - (values.length - 1));
  const first = values[0] ?? rate.value;
  const span = move(colors, ((rate.value - first) / first) * 100);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(open ? '180deg' : '0deg', { duration: motion.base }) }] }));

  return (
    <Animated.View layout={LinearTransition.duration(motion.base)}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${rate.name}, ${fmt(rate.value)} francs, ${day.text}`} onPress={onToggle} style={({ pressed }) => [styles.currency, pressed && { backgroundColor: colors.pressed }]}>
        <View style={[styles.codeTile, { backgroundColor: tint.bg }]}>
          <Txt v="footnote" w="semibold" c={colors.ink}>
            {rate.code}
          </Txt>
        </View>
        <Txt v="callout" w="medium" numberOfLines={1} style={{ flex: 1 }}>
          {rate.name}
        </Txt>
        {!open && <Spark rate={rate} />}
        <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
          <Txt v="callout" w="semibold" num>
            {fmt(rate.value)}
          </Txt>
          <View style={styles.move}>
            <Icon name={day.icon} size={10} color={day.fg} weight="semibold" />
            <Txt v="caption" c={day.fg} num>
              {day.text}
            </Txt>
          </View>
        </View>
        <Animated.View style={chevron}>
          <Icon name="chevronDown" size={12} color={colors.ink3} weight="semibold" />
        </Animated.View>
      </Pressable>
      {open && (
        <Animated.View entering={FadeIn.duration(motion.base)} style={styles.detail}>
          <View style={styles.cardPadFlat}>
            <Txt v="title1" accessibilityLiveRegion="polite">
              {fmt(shown)}
            </Txt>
            <Txt v="footnote" c={shownDay ? colors.ink2 : span.fg} num>
              {shownDay ? formatDate.weekdayShort(shownDay) : `${span.text} ${r.words} · drag the chart to read a day`}
            </Txt>
          </View>
          <View style={{ marginTop: 10 }} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
            {chartWidth > 0 && (
              <FxChart
                key={range}
                rate={rate}
                days={r.days}
                width={chartWidth}
                onScrub={(i) => {
                  if (i !== null) haptic.selection();
                  setScrubbed(i);
                }}
              />
            )}
          </View>
          <View style={[styles.cardPadFlat, styles.ranges]} accessibilityRole="tablist">
            {RANGES.map((x) => {
              const on = x.value === range;
              return (
                <Pressable
                  key={x.value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={x.words}
                  onPress={() => {
                    haptic.selection();
                    setRange(x.value);
                    setScrubbed(null);
                  }}
                  style={[styles.range, { backgroundColor: on ? colors.ink : colors.fill }]}>
                  <Txt v="footnote" w="semibold" c={on ? colors.canvas : colors.ink2} num>
                    {x.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.cardPadFlat, styles.alertRow]}>
            <View style={{ flex: 1 }}>
              <Txt v="subhead" w="medium">{`Tell me when ${rate.code} moves`}</Txt>
              <Txt v="caption" c={colors.ink2}>{`More than ${RATE_ALERT_THRESHOLD_PCT}% in a day, one push`}</Txt>
            </View>
            <Switch label={`${rate.code} rate alert`} value={alerts[rate.code] ?? false} onChange={(v) => set('rateAlerts', { ...alerts, [rate.code]: v })} />
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

/** Pump ceilings over time. Prices hold until RURA's next notice, so the lines step rather than slope. */
function FuelChart({ history, width }: { history: Rates['fuel']['history']; width: number }) {
  const colors = useColors();
  const styles = useStyles();
  const series = FUEL_COLORS[useScheme()];
  const [picked, setPicked] = useState<number | null>(null);
  const lastPick = useRef<number | null>(null);
  const H = 172;
  const LEFT = 44;
  const plotW = width - LEFT - 8;
  const start = history[0]?.date ?? '';
  const end = history[history.length - 1]?.date ?? start;
  const totalDays = Math.max(1, daysBetween(start, end));
  // The last step gets a little run-out so the newest ceiling reads as a level, not a point.
  const runOut = plotW * 0.08;
  const x = (date: string) => LEFT + (daysBetween(start, date) / totalDays) * (plotW - runOut);
  const prices = history.flatMap((h) => [h.petrol, h.diesel]);
  const lo = Math.floor(Math.min(...prices) / 200) * 200;
  const hi = Math.ceil(Math.max(...prices) / 200) * 200;
  const y = (v: number) => 10 + (H - 20) * (1 - (v - lo) / (hi - lo || 1));
  const ticks = Array.from({ length: Math.round((hi - lo) / 200) + 1 }, (_, i) => lo + i * 200);
  const step = (key: 'petrol' | 'diesel') => history.map((h, i) => (i === 0 ? `M${x(h.date)} ${y(h[key])}` : `H${x(h.date)} V${y(h[key])}`)).join(' ') + ` H${LEFT + plotW}`;
  const shown = history[picked ?? history.length - 1];

  const pick = (px: number | null) => {
    let best: number | null = null;
    if (px !== null) {
      best = 0;
      history.forEach((h, i) => {
        if (Math.abs(x(h.date) - px) < Math.abs(x(history[best ?? 0]?.date ?? start) - px)) best = i;
      });
    }
    if (best !== null && best !== lastPick.current) haptic.selection();
    lastPick.current = best;
    setPicked(best);
  };
  // Horizontal drags read the chart; vertical ones fail it so the page keeps scrolling.
  const pan = usePanGesture({
    activeOffsetX: [-6, 6],
    failOffsetY: [-10, 10],
    onActivate: (e) => {
      'worklet';
      scheduleOnRN(pick, e.x);
    },
    onUpdate: (e) => {
      'worklet';
      scheduleOnRN(pick, e.x);
    },
    onFinalize: () => {
      'worklet';
      scheduleOnRN(pick, null);
    },
  });

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.key, { backgroundColor: series.petrol }]} />
          <Txt v="footnote" c={colors.ink2}>
            Petrol
          </Txt>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.key, { backgroundColor: series.diesel }]} />
          <Txt v="footnote" c={colors.ink2}>
            Diesel
          </Txt>
        </View>
      </View>
      {shown && (
        <Txt v="subhead" num style={{ marginTop: 8 }} accessibilityLiveRegion="polite">
          <Txt v="subhead" w="medium" num>{`${formatDate.long(shown.date)} · `}</Txt>
          {`petrol ${whole(shown.petrol)}, diesel ${whole(shown.diesel)}`}
        </Txt>
      )}
      <GestureDetector gesture={pan}>
        <View
          style={{ marginTop: 12 }}
          accessibilityRole="image"
          accessibilityLabel={`Pump ceilings since ${formatDate.long(start)}. Petrol from ${whole(history[0]?.petrol ?? 0)} to ${whole(history[history.length - 1]?.petrol ?? 0)} francs a litre, diesel from ${whole(history[0]?.diesel ?? 0)} to ${whole(history[history.length - 1]?.diesel ?? 0)}. The revisions below list every change.`}>
          <Svg width={width} height={H}>
            {ticks.map((t) => (
              <Line key={t} x1={LEFT} y1={y(t)} x2={LEFT + plotW} y2={y(t)} stroke={colors.line} strokeWidth={StyleSheet.hairlineWidth} />
            ))}
            {shown && picked !== null && <Line x1={x(shown.date)} y1={0} x2={x(shown.date)} y2={H} stroke={colors.ink2} strokeWidth={1} />}
            <Path d={step('diesel')} fill="none" stroke={series.diesel} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <Path d={step('petrol')} fill="none" stroke={series.petrol} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {shown && (
              <>
                <Circle cx={x(shown.date)} cy={y(shown.diesel)} r={4.5} fill={series.diesel} stroke={colors.card} strokeWidth={2} />
                <Circle cx={x(shown.date)} cy={y(shown.petrol)} r={4.5} fill={series.petrol} stroke={colors.card} strokeWidth={2} />
              </>
            )}
          </Svg>
          {ticks.map((t) => (
            <Txt key={t} v="caption" c={colors.ink3} num style={[styles.tick, { top: y(t) - 8 }]}>
              {whole(t)}
            </Txt>
          ))}
        </View>
      </GestureDetector>
      <View style={[styles.axis, { paddingLeft: LEFT, paddingHorizontal: 0 }]}>
        <Txt v="caption" c={colors.ink3} num>
          {formatDate.short(start)}
        </Txt>
        <Txt v="caption" c={colors.ink3} num>
          {formatDate.short(end)}
        </Txt>
      </View>
    </View>
  );
}

function FuelTab({ data }: { data: Rates }) {
  const colors = useColors();
  const styles = useStyles();
  const series = FUEL_COLORS[useScheme()];
  const [width, setWidth] = useState(0);
  const keyFor = (label: string) => (label.toLowerCase().startsWith('diesel') ? series.diesel : series.petrol);
  return (
    <Animated.View entering={FadeIn.duration(motion.fast)}>
      <View style={styles.fuel}>
        {data.fuel.items.map((f) => (
          <View key={f.label} style={styles.fuelCard}>
            <View style={styles.legendItem}>
              <View style={[styles.key, { backgroundColor: keyFor(f.label) }]} />
              <Txt v="footnote" c={colors.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
                {f.label}
              </Txt>
            </View>
            <Txt v="title1" style={{ marginTop: 10 }}>
              {f.price.toLocaleString('en-GB')}
            </Txt>
            <Txt v="caption" c={colors.ink3}>
              Rwandan francs
            </Txt>
            <Tag label={`${f.delta > 0 ? '+' : '−'}${Math.abs(f.delta)}`} icon={f.delta > 0 ? 'arrowUp' : 'arrowDown'} tone={f.delta > 0 ? 'warn' : 'ok'} style={{ marginTop: 12 }} />
            <Txt v="caption" c={colors.ink3} style={{ marginTop: 4 }}>
              vs the previous ceiling
            </Txt>
          </View>
        ))}
      </View>

      <View style={[styles.card, styles.cardPad]}>
        <Txt v="headline">Ceiling history</Txt>
        <View style={{ marginTop: 10 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && <FuelChart history={data.fuel.history} width={width} />}
        </View>
      </View>

      <SectionHeader title="Current ceiling" icon="fuel" />
      <Group>
        <Row title="Announced" detail={formatDate.long(data.fuel.announced)} />
        <Row title="Valid" detail={data.fuel.validity} />
        <Row title="Applies to" detail="Kigali; provinces add transport" />
      </Group>
      <SectionHeader title="Revisions" icon="history" />
      <Group>
        {data.fuel.revisions.map((r) => (
          <Row key={r.date} title={r.title} subtitle={`${formatDate.long(r.date)} · ${r.detail}`} right={r.current ? <Tag label="Current" tone="amber" icon="check" /> : undefined} />
        ))}
      </Group>
      <Group style={{ marginTop: 12 }} inset={INSET.tile}>
        <Row left={<IconTile icon="list" tone="violet" />} title="Fuel prices storyline" subtitle="Every RURA notice, in order" chevron onPress={() => router.push(toHref({ kind: 'storyline', id: 'fuel' }))} />
      </Group>
    </Animated.View>
  );
}

export default function RatesScreen() {
  const colors = useColors();
  const styles = useStyles();
  const rates = useQuery(q.rates(useApi()));
  const [tab, setTab] = useState<'fx' | 'fuel'>('fx');
  const data = rates.data;

  return (
    <>
      <Stack.Screen options={{ title: 'Rates', headerLargeTitleEnabled: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>
        {!data ? (
          rates.isPending ? null : (
            <ErrorScreen error={rates.error} onRetry={() => rates.refetch()} />
          )
        ) : (
          <>
            <View style={styles.head}>
              <Txt v="subhead" c={colors.ink2}>
                BNR’s daily reference rates and RURA’s pump price ceilings, each with the time it was published.
              </Txt>
              <View style={{ marginTop: 16 }}>
                <Segmented
                  accessibilityLabel="Rates section"
                  options={[
                    { value: 'fx', label: 'Exchange rates' },
                    { value: 'fuel', label: 'Fuel prices' },
                  ]}
                  value={tab}
                  onChange={setTab}
                />
              </View>
            </View>
            {tab === 'fx' ? <FxTab data={data} /> : <FuelTab data={data} />}
          </>
        )}
      </ScrollView>
    </>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    head: { paddingHorizontal: GUTTER, paddingTop: 2 },
    card: { marginHorizontal: GUTTER, marginTop: 16, paddingVertical: 18, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, overflow: 'hidden' },
    cardPad: { paddingHorizontal: 18 },
    codeTile: { minWidth: 44, height: 30, paddingHorizontal: 8, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    move: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    ranges: { flexDirection: 'row', gap: 8, marginTop: 14 },
    range: { flex: 1, height: 34, borderRadius: radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
    convert: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: GUTTER },
    asOf: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 10 },
    currency: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingVertical: 12 },
    detail: { paddingBottom: 16 },
    cardPadFlat: { paddingHorizontal: GUTTER },
    alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
    convertField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 56, paddingHorizontal: 14, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
    convertResult: { backgroundColor: colors.greenWash, borderColor: colors.greenWash },
    input: { flex: 1, fontFamily: fonts.medium, fontSize: 19, padding: 0 },
    fuel: { flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, paddingTop: 16 },
    fuelCard: { flex: 1, padding: 16, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
    legend: { flexDirection: 'row', gap: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    key: { width: 14, height: 3, borderRadius: 2 },
    tick: { position: 'absolute', left: 0, width: 38, textAlign: 'right' },
  }),
);
