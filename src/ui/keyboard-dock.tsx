import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GUTTER } from './theme';

/**
 * A footer that rides on top of the keyboard. KeyboardAvoidingView measures from the window top, so inside
 * a sheet (which starts lower) it leaves the button partly under the keyboard; the keyboard's own height is
 * exact because a sheet's bottom edge is the screen's.
 */
export function KeyboardDock({ children }: { children: ReactNode }) {
  const keyboard = useAnimatedKeyboard();
  const bottom = useSafeAreaInsets().bottom;
  const lift = useAnimatedStyle(() => ({ paddingBottom: Math.max(keyboard.height.get() + 12, bottom, 16) }));
  return <Animated.View style={[styles.dock, lift]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  dock: { paddingHorizontal: GUTTER, paddingTop: 12 },
});
