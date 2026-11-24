import { MenuView } from '@expo/ui/community/menu';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeInUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { Language } from '@/data/schema';
import { haptic } from '@/lib/haptics';
import { usePrefs } from '@/state/prefs';
import { Badge, Tile } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Screen } from '@/ui/nav';
import { Ring } from '@/ui/ring';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const PAGES = [
  { title: 'Official notices, kept.', body: 'Announcements from Rwandan institutions become records you can find, follow and act on.' },
  { title: 'Deadlines that nudge you.', body: 'Track an action for yourself or your family. Reminders tighten as the date gets close.' },
  { title: 'Every change, shown.', body: 'Extensions and corrections arrive as a before and after, with the source a tap away.' },
] as const;

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'EN', label: 'English' },
  { value: 'FR', label: 'Français' },
  { value: 'RW', label: 'Kinyarwanda' },
];

const muted = 'rgba(235,235,245,0.6)';

export default function Welcome() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);
  const language = usePrefs((s) => s.contentLanguage);
  const setLanguage = usePrefs((s) => s.setLanguage);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });

  return (
    <Screen bg="#000" statusBar="light">
      <Backdrop />
      <View style={[styles.lang, { top: insets.top + 4 }]}>
        <MenuView
          title="Content language"
          actions={LANGUAGES.map((l) => ({ id: l.value, title: l.label, state: l.value === language ? 'on' : 'off' }))}
          onPressAction={({ nativeEvent }) => {
            const next = LANGUAGES.find((l) => l.value === nativeEvent.event);
            if (next) {
              haptic.selection();
              setLanguage(next.value);
            }
          }}>
          <View style={styles.langBtn} accessibilityRole="button" accessibilityLabel="Content language">
            <Icon name="globe" size={13} color={colors.white} />
            <Txt v="sh" w="600" c={colors.white}>
              {LANGUAGES.find((l) => l.value === language)?.label}
            </Txt>
          </View>
        </MenuView>
      </View>

      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          if (next !== page) haptic.selection();
          setPage(next);
        }}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 52 }}>
        {PAGES.map((p, i) => (
          <View key={p.title} style={{ width, paddingHorizontal: 22 }} accessibilityRole="summary">
            <View style={styles.visual}>{i === 0 ? <Notices /> : i === 1 ? <Countdown active={page === 1} /> : <Diff />}</View>
            <Txt v="lt" c={colors.white} center style={{ marginTop: 12 }}>
              {p.title}
            </Txt>
            <Txt v="co" c={muted} center style={{ marginTop: 10, paddingHorizontal: 6 }}>
              {p.body}
            </Txt>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.dots} accessibilityRole="tablist">
        {PAGES.map((p, i) => (
          <Dot key={p.title} index={i} scrollX={scrollX} width={width} />
        ))}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
        <Button label="Get started" variant="white" onPress={() => router.push('/situations')} />
        <Button label="I already have an account" variant="plainLight" onPress={() => router.push({ pathname: '/auth', params: { next: 'home' } })} />
        <Txt v="c1" c="rgba(235,235,245,0.45)" center>
          Independent service. Not a government app.
        </Txt>
      </View>
    </Screen>
  );
}

function Backdrop() {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
      <Defs>
        <RadialGradient id="welcome" cx="50%" cy="18%" rx="120%" ry="60%">
          <Stop offset="0" stopColor="#0B2A7A" />
          <Stop offset="0.45" stopColor="#050B1F" />
          <Stop offset="0.75" stopColor="#000000" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#welcome)" />
    </Svg>
  );
}

function Dot({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(scrollX.get() / width - index);
    return { opacity: interpolate(d, [0, 1], [1, 0.3], 'clamp'), width: interpolate(d, [0, 1], [18, 8], 'clamp') };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

function Floating({ children, delay, scale, opacity, bg }: { children: React.ReactNode; delay: number; scale: number; opacity: number; bg: string }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.set(withRepeat(withSequence(withTiming(-4, { duration: 1800 + delay }), withTiming(0, { duration: 1800 + delay })), -1, true));
  }, [y, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }, { scale }], opacity }));
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify().damping(18)} style={[styles.floatCard, { backgroundColor: bg }, style]}>
      {children}
    </Animated.View>
  );
}

function Notices() {
  return (
    <View style={{ gap: 10, width: '100%' }}>
      <Floating delay={0} scale={0.9} opacity={0.55} bg="rgba(255,255,255,0.14)">
        <Tile icon="calendar" color="purple" size="m" />
        <View style={{ flex: 1 }}>
          <Txt v="sh" w="600" c={colors.white}>
            Umuganda this Saturday
          </Txt>
          <Txt v="fn" c={muted}>
            08:00 – 11:00 · confirmed
          </Txt>
        </View>
      </Floating>
      <Floating delay={120} scale={0.95} opacity={0.8} bg="rgba(255,255,255,0.18)">
        <Tile icon="car" color="orange" size="m" />
        <View style={{ flex: 1 }}>
          <Txt v="sh" w="600" c={colors.white}>
            KN 3 Rd closed tomorrow
          </Txt>
          <Txt v="fn" c={muted}>
            08:00 – 17:00 · on your route
          </Txt>
        </View>
      </Floating>
      <Floating delay={240} scale={1} opacity={1} bg="rgba(255,255,255,0.92)">
        <Tile icon="bank" color="tint" size="m" />
        <View style={{ flex: 1 }}>
          <View style={styles.between}>
            <Txt v="sh" w="600">
              BNR · Deadline moved
            </Txt>
            <Txt v="fn" c={colors.l2}>
              now
            </Txt>
          </View>
          <Txt v="fn" num>
            Exchange old notes by 30 Nov 2026
          </Txt>
        </View>
      </Floating>
    </View>
  );
}

function Countdown({ active }: { active: boolean }) {
  return (
    <Ring size={260} stroke={22} progress={active ? 0.8 : 0} color={colors.orange} trackColor="rgba(255,149,0,0.22)">
      <Ring size={176} stroke={22} progress={active ? 0.66 : 0} color={colors.green} trackColor="rgba(52,199,89,0.22)" delay={400} style={{ position: 'absolute' }} />
      <View style={{ alignItems: 'center' }}>
        <Txt num c={colors.white} style={{ fontSize: 56, lineHeight: 56, fontWeight: '700' }}>
          6
        </Txt>
        <Txt v="fn" c={muted}>
          days left
        </Txt>
      </View>
    </Ring>
  );
}

function Diff() {
  return (
    <View style={styles.diff}>
      <Badge label="Updated 2 Nov" tone="orange" icon="refresh" />
      <Txt v="fn" c={muted} style={{ marginTop: 16 }}>
        Bank deadline
      </Txt>
      <Txt num strike c="rgba(235,235,245,0.45)" style={{ fontSize: 22, lineHeight: 28, marginTop: 4 }}>
        1 Nov 2026
      </Txt>
      <Txt num c={colors.white} style={{ fontSize: 34, lineHeight: 41, fontWeight: '700' }}>
        30 Nov 2026
      </Txt>
      <View style={styles.diffLine} />
      <View style={styles.row}>
        <Icon name="check" size={13} color={colors.green} />
        <Txt v="fn" c={muted}>
          Where, who and cost unchanged
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lang: { position: 'absolute', right: 16, zIndex: 5 },
  langBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 14, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)' },
  visual: { height: 400, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.white },
  bottom: { paddingHorizontal: 20, gap: 6 },
  floatCard: { borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  diff: { width: '100%', backgroundColor: colors.black, borderRadius: 22, padding: 20, marginHorizontal: 6 },
  diffLine: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(84,84,88,0.65)', marginVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
