import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import type { Situation } from '@/data/schema';
import { SITUATION_ART } from '@/illustrations/static/situations';
import { usePrefs } from '@/state/prefs';
import { Checkbox } from '@/ui/atoms';
import { Button, Chip } from '@/ui/button';
import { GroupLabel, GroupNote } from '@/ui/list';
import { Dock, useColumnWidth, useDockInset } from '@/ui/nav';
import { PressableScale } from '@/ui/pressable';
import { Txt } from '@/ui/text';
import { createStyles, featureColors, GUTTER, motion, radius, useColors, type Hue } from '@/ui/theme';

import { SetupHeader } from './progress-nav';

/** "Just curious" leads: most people start there, and it asks nothing of them. */
export const SITUATIONS: readonly { id: Situation; title: string; sub: string; hue: Hue }[] = [
  { id: 'general', title: 'Just curious', sub: 'National notices and big changes', hue: 'brand' },
  { id: 'driver', title: 'Driver', sub: 'Roads, fuel, licences', hue: 'amber' },
  { id: 'student', title: 'Student', sub: 'Exams, results, scholarships', hue: 'indigo' },
  { id: 'parent', title: 'Parent', sub: 'School calendar and fees', hue: 'pink' },
  { id: 'business', title: 'Business owner', sub: 'Tax deadlines and rates', hue: 'green' },
  { id: 'abroad', title: 'Living abroad', sub: 'Embassy and digital ID', hue: 'sky' },
];
const LEVELS = ['Primary', 'Secondary', 'TVET', 'University'] as const;
const SECTORS = ['Import and export', 'Retail', 'Agriculture', 'Services', 'Transport'] as const;

export const situationLabel = (s: Situation) => SITUATIONS.find((x) => x.id === s)?.title ?? s;

export function SituationsScreen({ mode }: { mode: 'onboarding' | 'edit' }) {
  const colors = useColors();
  const styles = useStyles();
  const [gridWidth, setGridWidth] = useState(useColumnWidth() - GUTTER * 2);
  const selected = usePrefs((s) => s.situations);
  const toggle = usePrefs((s) => s.toggleSituation);
  const level = usePrefs((s) => s.studentLevel);
  const sector = usePrefs((s) => s.businessSector);
  const set = usePrefs((s) => s.set);
  const bottom = useDockInset();
  // Measured, so a desktop browser's scrollbar or the web column edge never pushes a card to its own row.
  const card = Math.floor((gridWidth - 12) / 2);
  const n = selected.length;

  return (
    <View style={{ flex: 1 }}>
      <SetupHeader step={1} skipTo={mode === 'onboarding' ? '/place' : undefined} mode={mode} title="Life situations" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: bottom }}>
        <View style={styles.head}>
          <Txt v="title1" accessibilityRole="header">
            What describes you?
          </Txt>
          <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>
            Pick all that apply. Imboni matches you to the institutions that affect your life, so you don’t need to know the org chart.
          </Txt>
        </View>
        <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width - GUTTER * 2)}>
          {SITUATIONS.map((s) => (
            <SituationCard key={s.id} item={s} on={selected.includes(s.id)} width={card} onPress={() => toggle(s.id)} />
          ))}
        </View>
        {selected.includes('student') && (
          <Animated.View entering={FadeIn.duration(motion.base)} layout={LinearTransition.duration(motion.base)}>
            <GroupLabel>Student level</GroupLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {LEVELS.map((l) => (
                <Chip key={l} label={l} selected={level === l} onPress={() => set('studentLevel', level === l ? null : l)} />
              ))}
            </ScrollView>
          </Animated.View>
        )}
        {selected.includes('business') && (
          <Animated.View entering={FadeIn.duration(motion.base)} layout={LinearTransition.duration(motion.base)}>
            <GroupLabel>Business sector</GroupLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {SECTORS.map((l) => (
                <Chip key={l} label={l} selected={sector === l} onPress={() => set('businessSector', sector === l ? null : l)} />
              ))}
            </ScrollView>
          </Animated.View>
        )}
        <Animated.View layout={LinearTransition.duration(motion.base)}>
          <GroupNote>Imboni stores the situation only. Never documents, names or ID numbers.</GroupNote>
        </Animated.View>
      </ScrollView>
      <Dock>
        <Button label={mode === 'edit' ? 'Done' : n ? `Continue with ${n}` : 'Pick at least one'} disabled={n === 0} onPress={() => (mode === 'onboarding' ? router.push('/place') : router.back())} />
      </Dock>
    </View>
  );
}

function SituationCard({ item, on, width, onPress }: { item: (typeof SITUATIONS)[number]; on: boolean; width: number; onPress: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  const Art = SITUATION_ART[item.id];
  const ring = useAnimatedStyle(() => ({ borderColor: withTiming(on ? colors.accent : colors.line, { duration: motion.fast, easing: Easing.out(Easing.quad) }) }));
  return (
    <PressableScale feedback="selection" accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${item.title}, ${item.sub}`} onPress={onPress} style={{ width }}>
      <Animated.View style={[styles.card, ring]}>
        <View style={[styles.art, { backgroundColor: featureColors(colors, item.hue).bg }]}>
          <Art width={width - 28} />
        </View>
        <View style={styles.check}>
          <Checkbox on={on} size={24} />
        </View>
        <View style={styles.cardText}>
          <Txt v="callout" w="medium" numberOfLines={1}>
            {item.title}
          </Txt>
          <Txt v="footnote" c={colors.ink2} numberOfLines={2}>
            {item.sub}
          </Txt>
        </View>
      </Animated.View>
    </PressableScale>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    head: { paddingHorizontal: GUTTER + 4, paddingTop: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 12, paddingTop: 22, paddingHorizontal: GUTTER },
    // Cards stretch to the tallest one in their row, so a two-line subtitle never leaves a short neighbour.
    card: { flex: 1, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 2, backgroundColor: colors.card, padding: 4 },
    art: { borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, overflow: 'hidden' },
    check: { position: 'absolute', top: 12, right: 12 },
    cardText: { paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8 },
    chips: { gap: 8, paddingHorizontal: GUTTER },
  }),
);
