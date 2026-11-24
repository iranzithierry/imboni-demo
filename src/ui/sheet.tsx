import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic } from '@/lib/haptics';

import { colors, spring } from './theme';

type Props = {
  /** Visible heights in points, ascending (e.g. peek, half, full). */
  detents: readonly number[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Draggable area: grabber plus whatever header is passed. Tapping it cycles detents. */
  header: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Velocity projection like UIScrollView's deceleration (UIScrollView.DecelerationRate.normal).
const project = (velocity: number) => {
  'worklet';
  return (velocity / 1000) * 0.998 / (1 - 0.998);
};

/** Persistent in-screen sheet: content behind stays interactive (unlike a modal sheet). */
export function DetentSheet({ detents, index, onIndexChange, header, children, style }: Props) {
  const max = detents[detents.length - 1] ?? 0;
  const offsetFor = (i: number) => max - (detents[i] ?? max);
  const y = useSharedValue(offsetFor(index));
  const start = useSharedValue(0);
  const offsets = detents.map((d) => max - d);

  useEffect(() => {
    y.set(withSpring(max - (detents[index] ?? max), spring));
  }, [index, detents, max, y]);

  const settle = (next: number) => {
    if (next !== index) haptic.snap();
    onIndexChange(next);
  };

  const pan = usePanGesture({
    onBegin: () => {
      'worklet';
      start.set(y.get());
    },
    onUpdate: (e) => {
      'worklet';
      const raw = start.get() + e.translationY;
      const lo = 0;
      const hi = offsets[0] ?? 0;
      // Rubber-band past the ends.
      y.set(raw < lo ? lo + raw / 4 : raw > hi ? hi + (raw - hi) / 4 : raw);
    },
    onDeactivate: (e) => {
      'worklet';
      const target = y.get() + project(e.velocityY);
      let best = 0;
      for (let i = 1; i < offsets.length; i++) {
        if (Math.abs((offsets[i] ?? 0) - target) < Math.abs((offsets[best] ?? 0) - target)) best = i;
      }
      y.set(withSpring(offsets[best] ?? 0, { ...spring, velocity: e.velocityY }));
      scheduleOnRN(settle, best);
    },
  });

  const tap = useTapGesture({
    onDeactivate: (e) => {
      'worklet';
      if (e.canceled) return;
      scheduleOnRN(settle, (index + 1) % detents.length);
    },
  });

  const gesture = useCompetingGestures(pan, tap);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return (
    <Animated.View style={[styles.sheet, { height: max }, animated, style]}>
      <GestureDetector gesture={gesture}>
        <View>
          <View
            style={styles.grabArea}
            accessibilityRole="adjustable"
            accessibilityLabel="Sheet size"
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'increment') settle(Math.min(detents.length - 1, index + 1));
              if (e.nativeEvent.actionName === 'decrement') settle(Math.max(0, index - 1));
            }}>
            <View style={styles.grab} />
          </View>
          {header}
        </View>
      </GestureDetector>
      <View style={styles.body}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: colors.card,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderCurve: 'continuous',
    boxShadow: '0 -10px 40px rgba(0,0,0,0.12)',
  },
  grabArea: { paddingTop: 5, paddingBottom: 6, alignItems: 'center' },
  grab: { width: 36, height: 5, borderRadius: 3, backgroundColor: colors.l3 },
  body: { flex: 1 },
});
