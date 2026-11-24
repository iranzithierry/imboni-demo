import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';

import { spring } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Scale while held, matching the design's `.press:active`. */
  scaleTo?: number;
  feedback?: 'tap' | 'selection' | 'none';
};

export function PressableScale({ style, children, scaleTo = 0.98, feedback = 'none', onPress, onPressIn, onPressOut, ...rest }: Props) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.get() ? scaleTo : 1, spring) }],
  }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        pressed.set(1);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.set(0);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (feedback === 'tap') haptic.tap();
        if (feedback === 'selection') haptic.selection();
        onPress?.(e);
      }}
      style={[style, animated]}>
      {children}
    </AnimatedPressable>
  );
}
