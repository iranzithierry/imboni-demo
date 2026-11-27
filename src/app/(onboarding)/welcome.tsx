import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Language } from '@/data/schema';
import { useMenu } from '@/features/record/menu';
import { FEATURE_SCENES } from '@/illustrations/animated/scenes';
import { usePrefs } from '@/state/prefs';
import { Wordmark } from '@/ui/brand';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { useColumnWidth } from '@/ui/nav';
import { Highlight, PressableScale } from '@/ui/pressable';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, hueColors, motion, radius, useColors, useScheme, type Hue } from '@/ui/theme';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'EN', label: 'English' },
  { value: 'FR', label: 'Français' },
  { value: 'RW', label: 'Kinyarwanda' },
];

const PAGES: { scene: keyof typeof FEATURE_SCENES; hue: Hue; title: string; body: string }[] = [
  { scene: 'kept', hue: 'sky', title: 'Official notices, kept', body: 'Announcements from Rwandan institutions become records you can find and follow, long after the post scrolls away.' },
  { scene: 'remind', hue: 'brand', title: 'Deadlines that remind you', body: 'Track what you need to do. Reminders tighten as the date gets close, for you and the people you look after.' },
  { scene: 'changed', hue: 'indigo', title: 'See exactly what changed', body: 'When a date, amount or place moves, you see the before and after, not a reworded post.' },
  { scene: 'roads', hue: 'amber', title: 'Closures on your route', body: 'Road works and Car Free Day on the way you drive, with the diversion drawn on the map.' },
  { scene: 'truth', hue: 'pink', title: 'Is this true?', body: 'Paste a forwarded message and Imboni compares it with the official record before you share it.' },
];

function Dot({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  const colors = useColors();
  const styles = useStyles();
  const shape = useAnimatedStyle(() => ({ width: withTiming(on ? 22 : 7, { duration: motion.base }), backgroundColor: withTiming(on ? colors.accent : colors.pearl, { duration: motion.base }) }));
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress} style={styles.dotHit}>
      <Animated.View style={[styles.dot, shape]} />
    </PressableScale>
  );
}

export default function Welcome() {
  const colors = useColors();
  const scheme = useScheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const width = useColumnWidth();
  const language = usePrefs((s) => s.contentLanguage);
  const setLanguage = usePrefs((s) => s.setLanguage);
  const menu = useMenu();
  const pager = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const current = LANGUAGES.find((l) => l.value === language)?.label ?? 'English';
  const stage = width - GUTTER * 2;
  // The scene gives way on short screens so the title and three lines of text always fit below it.
  const sceneWidth = pagerHeight ? Math.max(180, Math.min(stage - 24, ((pagerHeight - 196) * 4) / 3)) : stage - 24;
  const last = page === PAGES.length - 1;

  const goTo = (i: number) => {
    pager.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.top}>
        <Wordmark size={30} />
        <Highlight
          accessibilityRole="button"
          accessibilityLabel={`Content language, ${current}`}
          onPress={() =>
            menu(
              LANGUAGES.map((l) => ({ label: l.value === language ? `${l.label} (current)` : l.label, onPress: () => setLanguage(l.value) })),
              'Content language',
              'Notices show in this language, with the original always one tap away.',
            )
          }
          pressedStyle={{ backgroundColor: colors.pressed }}
          style={styles.lang}>
          <Icon name="globe" size={14} color={colors.ink} weight="semibold" />
          <Txt v="subhead" w="medium">
            {current}
          </Txt>
          <Icon name="chevronDown" size={11} color={colors.ink2} weight="semibold" />
        </Highlight>
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
        style={{ flex: 1 }}>
        {PAGES.map((p, i) => {
          const Scene = FEATURE_SCENES[p.scene];
          return (
            <View key={p.scene} style={[styles.page, { width }]} accessibilityElementsHidden={i !== page} importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'}>
              <View style={[styles.stage, { backgroundColor: hueColors(colors, p.hue).bg }]}>
                <Scene playing={i === page} width={sceneWidth} />
              </View>
              <Txt v="title1" style={{ marginTop: 28 }} accessibilityRole="header">
                {p.title}
              </Txt>
              <Txt v="callout" c={colors.ink2} style={styles.body}>
                {p.body}
              </Txt>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.dots}>
        {PAGES.map((p, i) => (
          <Dot key={p.scene} on={i === page} label={`${p.title}, ${i + 1} of ${PAGES.length}`} onPress={() => goTo(i)} />
        ))}
      </View>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button label="Get started" trailingIcon="arrowRight" onPress={() => router.push('/situations')} />
        {last ? (
          <Button label="I already have an account" variant="secondary" onPress={() => router.push({ pathname: '/auth', params: { next: 'home' } })} />
        ) : (
          <Button label="Next" variant="quiet" onPress={() => goTo(page + 1)} />
        )}
        <Txt v="caption" c={colors.ink3} center style={{ marginTop: 2 }}>
          Independent service, not a government app.
        </Txt>
      </View>
    </View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 6 },
    lang: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
    // Top-aligned with room for three lines of body, so the scene and title hold still between pages.
    page: { paddingHorizontal: GUTTER, paddingTop: 20 },
    body: { marginTop: 10, minHeight: 63 },
    stage: { borderRadius: radius.xl, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
    dots: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10 },
    dotHit: { height: 24, paddingHorizontal: 4, justifyContent: 'center' },
    dot: { height: 7, borderRadius: 4 },
    actions: { paddingHorizontal: GUTTER, paddingTop: 8, gap: 10 },
  }),
);
