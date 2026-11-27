import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';

import { motion } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EASE = Easing.out(Easing.quad);

export type Feedback = 'tap' | 'selection' | 'none';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** How far the surface settles while held. Cards use a barely-there 0.985. */
  scaleTo?: number;
  feedback?: Feedback;
};

/** A surface that settles slightly while pressed. No bounce: it is feedback, not decoration. */
export function PressableScale({ style, children, scaleTo = 0.985, feedback = 'none', onPress, onPressIn, onPressOut, ...rest }: Props) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressed.get() ? scaleTo : 1, { duration: motion.fast, easing: EASE }) }],
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

type HighlightProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
  feedback?: Feedback;
};

/** Rows and inline controls: the background shifts while held instead of the shape moving. */
export function Highlight({ style, pressedStyle, children, feedback = 'none', onPress, ...rest }: HighlightProps) {
  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        if (feedback === 'tap') haptic.tap();
        if (feedback === 'selection') haptic.selection();
        onPress?.(e);
      }}
      style={({ pressed }) => [style, pressed && (pressedStyle ?? { opacity: 0.6 })]}>
      {children}
    </Pressable>
  );
}
