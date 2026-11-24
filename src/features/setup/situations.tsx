import { router } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import type { Situation } from '@/data/schema';
import { usePrefs } from '@/state/prefs';
import { Pill, Radio, Tile } from '@/ui/atoms';
import { Button } from '@/ui/button';
import type { IconName } from '@/ui/icon';
import { GroupFooter, GroupHeader } from '@/ui/list';
import { Dock, Screen, useDockInset, useNavInset } from '@/ui/nav';
import { PressableScale } from '@/ui/pressable';
import { Txt } from '@/ui/text';
import { colors, type Swatch } from '@/ui/theme';

import { ProgressNav } from './progress-nav';

export const SITUATIONS: readonly { id: Situation; title: string; sub: string; icon: IconName; color: Swatch }[] = [
  { id: 'driver', title: 'Driver', sub: 'Roads, fuel, licences', icon: 'car', color: 'orange' },
  { id: 'student', title: 'Student', sub: 'Exams and results', icon: 'graduation', color: 'teal' },
  { id: 'parent', title: 'Parent', sub: 'School calendar, health', icon: 'people', color: 'pink' },
  { id: 'business', title: 'Business', sub: 'Tax and rates', icon: 'briefcase', color: 'brown' },
  { id: 'abroad', title: 'Living abroad', sub: 'Embassy and ID', icon: 'plane', color: 'indigo' },
  { id: 'general', title: 'Just curious', sub: 'National notices', icon: 'newspaper', color: 'gray' },
];
const LEVELS = ['Primary', 'Secondary', 'TVET', 'University'] as const;
const SECTORS = ['Import and export', 'Retail', 'Agriculture', 'Services', 'Transport'] as const;

export const situationLabel = (s: Situation) => SITUATIONS.find((x) => x.id === s)?.title ?? s;

export function SituationsScreen({ mode }: { mode: 'onboarding' | 'edit' }) {
  const { width } = useWindowDimensions();
  const selected = usePrefs((s) => s.situations);
  const toggle = usePrefs((s) => s.toggleSituation);
  const level = usePrefs((s) => s.studentLevel);
  const sector = usePrefs((s) => s.businessSector);
  const set = usePrefs((s) => s.set);
  const top = useNavInset();
  const bottom = useDockInset();
  const card = (width - 32 - 10) / 2;
  const n = selected.length;

  return (
    <Screen>
      <ProgressNav step={1} skipTo={mode === 'onboarding' ? '/place' : undefined} mode={mode} />
      <ScrollView contentContainerStyle={{ paddingTop: top + 8, paddingBottom: bottom }}>
        <View style={styles.head}>
          <Txt v="t1" accessibilityRole="header">
            What describes you?
          </Txt>
          <Txt v="co" c={colors.l2} style={{ marginTop: 6 }}>
            Pick all that apply. We match you to the institutions that affect you.
          </Txt>
        </View>
        <View style={styles.grid}>
          {SITUATIONS.map((s) => (
            <SituationCard key={s.id} item={s} on={selected.includes(s.id)} width={card} onPress={() => toggle(s.id)} />
          ))}
        </View>
        {selected.includes('student') && (
          <Animated.View entering={FadeInUp.springify().damping(18)} layout={LinearTransition}>
            <GroupHeader>Student level</GroupHeader>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
              {LEVELS.map((l) => (
                <Pill key={l} label={l} on={level === l} onPress={() => set('studentLevel', l)} />
              ))}
            </ScrollView>
          </Animated.View>
        )}
        {selected.includes('business') && (
          <Animated.View entering={FadeInUp.springify().damping(18)} layout={LinearTransition}>
            <GroupHeader>Business sector</GroupHeader>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
              {SECTORS.map((l) => (
                <Pill key={l} label={l} on={sector === l} onPress={() => set('businessSector', l)} />
              ))}
            </ScrollView>
          </Animated.View>
        )}
        <Animated.View layout={LinearTransition} entering={FadeIn}>
          <View style={{ height: 9 }} />
          <GroupFooter>We store the situation, never documents or ID numbers.</GroupFooter>
        </Animated.View>
      </ScrollView>
      <Dock>
        <Button
          label={mode === 'edit' ? 'Done' : n ? `Continue with ${n}` : 'Continue'}
          disabled={n === 0}
          onPress={() => (mode === 'onboarding' ? router.push('/place') : router.back())}
        />
      </Dock>
    </Screen>
  );
}

function SituationCard({ item, on, width, onPress }: { item: (typeof SITUATIONS)[number]; on: boolean; width: number; onPress: () => void }) {
  const ring = useAnimatedStyle(() => ({ borderColor: withTiming(on ? colors.tint : 'transparent', { duration: 200 }) }));
  return (
    <PressableScale
      feedback="selection"
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${item.title}, ${item.sub}`}
      onPress={onPress}
      style={[styles.card, { width }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.ring, ring]} pointerEvents="none" />
      <Tile icon={item.icon} color={item.color} size="m" />
      <View style={{ marginTop: 'auto' }}>
        <Txt v="hl">{item.title}</Txt>
        <Txt v="fn" c={colors.l2}>
          {item.sub}
        </Txt>
      </View>
      <View style={styles.radio}>
        <Radio on={on} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 20, paddingHorizontal: 16 },
  card: { height: 132, borderRadius: 18, backgroundColor: colors.card, padding: 14 },
  ring: { borderRadius: 18, borderWidth: 2 },
  radio: { position: 'absolute', top: 12, right: 12 },
  pills: { gap: 8, paddingHorizontal: 16 },
});
