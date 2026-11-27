import { router, Stack, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { HeaderActions } from '@/ui/nav';
import { createStyles, motion, radius } from '@/ui/theme';

function Segment({ on }: { on: boolean }) {
  const styles = useStyles();
  const fill = useAnimatedStyle(() => ({ width: withTiming(on ? '100%' : '0%', { duration: motion.slow, easing: Easing.out(Easing.cubic) }) }));
  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, fill]} />
    </View>
  );
}

function Segments({ step, of }: { step: number; of: number }) {
  const styles = useStyles();
  return (
    <View style={styles.segments} accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of ${of}`} accessibilityValue={{ min: 0, max: of, now: step }}>
      {Array.from({ length: of }, (_, i) => (
        <Segment key={i} on={i < step} />
      ))}
    </View>
  );
}

/**
 * Header for the setup steps, in the native bar. During onboarding the title is the step progress with
 * Skip on the right; the same screens opened from Profile show a plain title instead.
 */
export function SetupHeader({ step, of = 4, skipTo, mode, title }: { step: number; of?: number; skipTo?: Href; mode: 'onboarding' | 'edit'; title?: string }) {
  if (mode === 'edit') return <Stack.Screen options={{ title: title ?? '' }} />;
  return (
    <>
      <Stack.Screen options={{ headerTitle: () => <Segments step={step} of={of} /> }} />
      {skipTo && <HeaderActions actions={[{ icon: 'chevronRight', text: 'Skip', label: 'Skip this step', onPress: () => router.push(skipTo) }]} />}
    </>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    segments: { width: 168, flexDirection: 'row', gap: 6 },
    segment: { flex: 1, height: 5, borderRadius: radius.xs, backgroundColor: colors.line, overflow: 'hidden' },
    segmentFill: { height: 5, borderRadius: radius.xs, backgroundColor: colors.accent },
  }),
);
