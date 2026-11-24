import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { colors, spring } from '@/ui/theme';
import { BackButton, NavBar, NavButton } from '@/ui/nav';

/** Onboarding nav: back, step progress, skip. In edit mode it becomes a plain back bar. */
export function ProgressNav({ step, of = 4, skipTo, mode, backLabel }: { step: number; of?: number; skipTo?: Href; mode: 'onboarding' | 'edit'; backLabel?: string }) {
  const fill = useAnimatedStyle(() => ({ width: withSpring(`${(step / of) * 100}%`, spring) }));
  if (mode === 'edit') return <NavBar background={colors.bg} left={<BackButton label={backLabel ?? 'Me'} />} />;
  return (
    <NavBar
      background={colors.bg}
      left={<BackButton />}
      center={
        <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: of, now: step }}>
          <Animated.View style={[styles.fill, fill]} />
        </View>
      }
      right={skipTo ? <NavButton label="Skip" onPress={() => router.push(skipTo)} /> : <View style={{ width: 52 }} />}
    />
  );
}

const styles = StyleSheet.create({
  track: { width: 150, height: 4, borderRadius: 2, backgroundColor: 'rgba(120,120,128,0.2)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: colors.tint },
});
