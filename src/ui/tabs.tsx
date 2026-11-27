import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';

import type { SegmentOption } from './segmented';
import { Txt } from './text';
import { createStyles, GUTTER, motion, useColors } from './theme';

/** Feed tabs: words in a row with an accent underline that slides to the chosen one, over a full-width rule. */
export function UnderlineTabs<T extends string>({ options, value, onChange, accessibilityLabel }: { options: readonly SegmentOption<T>[]; value: T; onChange: (v: T) => void; accessibilityLabel: string }) {
  const colors = useColors();
  const styles = useStyles();
  const [frames, setFrames] = useState<Record<string, LayoutRectangle>>({});
  const f = frames[value];
  const bar = useAnimatedStyle(() => ({
    width: withTiming(f?.width ?? 0, { duration: motion.base, easing: Easing.out(Easing.cubic) }),
    transform: [{ translateX: withTiming(f?.x ?? 0, { duration: motion.base, easing: Easing.out(Easing.cubic) }) }],
  }));
  return (
    <View style={styles.wrap} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      <View style={styles.row}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.count !== undefined ? `${o.label}, ${o.count}` : o.label}
              onLayout={(e) => {
                const layout = e.nativeEvent.layout;
                setFrames((prev) => ({ ...prev, [o.value]: layout }));
              }}
              onPress={() => {
                if (on) return;
                haptic.selection();
                onChange(o.value);
              }}
              style={styles.tab}>
              <Txt v="callout" w={on ? 'semibold' : 'medium'} c={on ? colors.ink : colors.ink2}>
                {o.label}
              </Txt>
              {o.count !== undefined && o.count > 0 && (
                <Txt v="footnote" num c={on ? colors.accent : colors.ink3}>
                  {o.count}
                </Txt>
              )}
            </Pressable>
          );
        })}
      </View>
      <Animated.View style={[styles.bar, { backgroundColor: colors.accent }, bar]} />
    </View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    wrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    row: { flexDirection: 'row', gap: 22, paddingHorizontal: GUTTER },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 44 },
    // Tab frames are measured inside the padded row, so their x already includes the gutter.
    bar: { position: 'absolute', left: 0, bottom: -StyleSheet.hairlineWidth, height: 2, borderRadius: 1 },
  }),
);
