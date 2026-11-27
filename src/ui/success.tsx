import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { haptic } from '@/lib/haptics';

import { useColors } from './theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const SIZE = 132;
const CHECK = 'M44 68 L60 84 L90 52';
const CHECK_LENGTH = 70;
const DOTS = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2);

function Dot({ angle, progress, color }: { angle: number; progress: { get: () => number }; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    const r = 30 + p * 36;
    return { opacity: p < 0.05 ? 0 : 1 - p, transform: [{ translateX: Math.cos(angle) * r }, { translateY: Math.sin(angle) * r }, { scale: 1 - p * 0.5 }] };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

/**
 * The moment a number is confirmed: a disc eases in, the tick draws itself and a ring of dots bursts out.
 * Tapping it plays it again. With reduced motion it shows the finished tick.
 */
export function SuccessBurst() {
  const colors = useColors();
  const reduced = useReducedMotion();
  const disc = useSharedValue(reduced ? 1 : 0);
  const tick = useSharedValue(reduced ? 1 : 0);
  const burst = useSharedValue(reduced ? 1 : 0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduced) return;
    disc.set(0);
    tick.set(0);
    burst.set(0);
    disc.set(withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
    tick.set(withDelay(220, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) })));
    burst.set(withDelay(200, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) })));
  }, [run, reduced, disc, tick, burst]);

  const discStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.3 + disc.get() * 0.7 }], opacity: Math.min(1, disc.get() * 2) }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - tick.get()) }));

  return (
    <Pressable
      accessibilityRole="image"
      accessibilityLabel="Verified"
      onPress={() => {
        haptic.success();
        setRun((n) => n + 1);
      }}
      style={styles.stage}>
      {DOTS.map((a, i) => (
        <Dot key={a} angle={a} progress={burst} color={i % 2 ? colors.accent : colors.ok} />
      ))}
      <Animated.View style={[styles.disc, { backgroundColor: colors.ok }, discStyle]}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 132 132" style={StyleSheet.absoluteFill}>
          <AnimatedPath d={CHECK} stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={CHECK_LENGTH} animatedProps={tickProps} />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: { width: SIZE + 48, height: SIZE + 48, alignItems: 'center', justifyContent: 'center' },
  disc: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  dot: { position: 'absolute', width: 9, height: 9, borderRadius: 5 },
});
