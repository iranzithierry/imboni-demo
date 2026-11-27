import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';

import { Txt } from './text';
import { createStyles, motion, radius, useColors } from './theme';

export type SegmentOption<T extends string> = { readonly value: T; readonly label: string; readonly count?: number };

type Props<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
};

const PAD = 4;

/** Tabs in a muted track: the chosen one lifts onto a card, and its count takes the accent. */
export function Segmented<T extends string>({ options, value, onChange, style, accessibilityLabel }: Props<T>) {
  const colors = useColors();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const seg = options.length ? (width - PAD * 2) / options.length : 0;
  const indicator = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(index * seg, { duration: motion.base, easing: Easing.out(Easing.cubic) }) }],
  }));

  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={[styles.track, style]}>
      {seg > 0 && <Animated.View style={[styles.indicator, { width: seg }, indicator]} />}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.count !== undefined ? `${o.label}, ${o.count}` : o.label}
            onPress={() => {
              if (on) return;
              haptic.selection();
              onChange(o.value);
            }}
            style={styles.segment}>
            <Txt v="subhead" w={on ? 'semibold' : 'medium'} c={on ? colors.ink : colors.ink2} numberOfLines={1}>
              {o.label}
            </Txt>
            {o.count !== undefined && (
              <View style={[styles.count, { backgroundColor: on ? colors.accent : colors.pressed }]}>
                <Txt v="caption" num c={on ? colors.onAccent : colors.ink2} style={{ fontSize: 11, lineHeight: 14 }}>
                  {o.count}
                </Txt>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    track: { flexDirection: 'row', height: 42, padding: PAD, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.fill },
    indicator: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.sm, borderCurve: 'continuous', backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    count: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  }),
);
