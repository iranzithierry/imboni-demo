import { useId, type ReactNode } from 'react';
import { Platform, StyleSheet, Switch as NativeSwitch, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { haptic } from '@/lib/haptics';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable';
import { Txt } from './text';
import { colors, gradients, radius, spring, swatch, tones, type GradientName, type Swatch, type Tone } from './theme';

const TILE = {
  s: { box: 30, r: radius.tile, icon: 19 },
  m: { box: 38, r: radius.tileL, icon: 22 },
  xl: { box: 60, r: radius.tileXL, icon: 34 },
} as const;

export function Tile({ icon, color, size = 's', style }: { icon: IconName; color: Swatch; size?: keyof typeof TILE; style?: StyleProp<ViewStyle> }) {
  const t = TILE[size];
  return (
    <View style={[styles.center, { width: t.box, height: t.box, borderRadius: t.r, backgroundColor: swatch[color] }, style]}>
      <Icon name={icon} size={t.icon} color={colors.white} />
    </View>
  );
}

const INI = { s: { box: 30, font: 10 }, m: { box: 38, font: 12 }, l: { box: 64, font: 20 } } as const;

export function Initials({ label, color, size = 'm', style }: { label: string; color: Swatch; size?: keyof typeof INI; style?: StyleProp<ViewStyle> }) {
  const s = INI[size];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.center, { width: s.box, height: s.box, borderRadius: s.box / 2, backgroundColor: swatch[color] }, style]}>
      <Txt v="c1" c={colors.white} w="700" style={{ fontSize: s.font, letterSpacing: 0.3 }}>
        {label}
      </Txt>
    </View>
  );
}

export function Badge({ label, tone = 'gray', icon, style }: { label: string; tone?: Tone; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      {icon && <Icon name={icon} size={11} color={t.fg} />}
      <Txt v="c1" c={t.fg} w="600" numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

/** Badge on a coloured hero surface. */
export function GlassBadge({ label, icon }: { label: string; icon?: IconName }) {
  return (
    <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
      {icon && <Icon name={icon} size={11} color={colors.white} />}
      <Txt v="c1" c={colors.white} w="600">
        {label}
      </Txt>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function DateBadge({ month, day }: { month: string; day: string }) {
  return (
    <View style={styles.date} accessibilityLabel={`${day} ${month}`}>
      <View style={styles.dateHead}>
        <Txt v="c2" c={colors.white} w="600" center style={{ lineHeight: 14 }}>
          {month}
        </Txt>
      </View>
      <Txt num center style={{ fontSize: 19, lineHeight: 27, fontWeight: '600' }}>
        {day}
      </Txt>
    </View>
  );
}

export function Radio({ on, color = colors.tint, size = 22 }: { on: boolean; color?: string; size?: number }) {
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(on ? 1 : 0.92, spring) }],
    backgroundColor: withTiming(on ? color : 'transparent', { duration: 200 }),
    borderColor: withTiming(on ? color : colors.l3, { duration: 200 }),
  }));
  return (
    <Animated.View style={[styles.center, { width: size, height: size, borderRadius: size / 2, borderWidth: 1.5 }, animated]}>
      {on && <Icon name="check" size={size * 0.55} color={colors.white} />}
    </Animated.View>
  );
}

export function Switch({ value, onChange, label, activeColor = colors.green }: { value: boolean; onChange: (next: boolean) => void; label: string; activeColor?: string }) {
  return (
    <NativeSwitch
      accessibilityLabel={label}
      value={value}
      onValueChange={(next) => {
        haptic.selection();
        onChange(next);
      }}
      trackColor={{ true: activeColor, false: Platform.OS === 'ios' ? undefined : colors.fill }}
      ios_backgroundColor="rgba(120,120,128,0.16)"
    />
  );
}

export function Pill({ label, on, onPress, icon, filled }: { label: string; on: boolean; onPress: () => void; icon?: IconName; filled?: boolean }) {
  const fg = on ? colors.white : colors.l1;
  return (
    <PressableScale
      scaleTo={0.95}
      feedback="selection"
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.pill, { backgroundColor: on ? colors.l1 : filled ? colors.fill : colors.card }]}>
      {icon && <Icon name={icon} size={13} color={fg} />}
      <Txt v="sh" c={fg} w="500">
        {label}
      </Txt>
    </PressableScale>
  );
}

/** Two-stop linear gradient fill; place as the first child of a clipped container. */
export function Gradient({ name, angle = 'diagonal' }: { name: GradientName; angle?: 'diagonal' | 'vertical' }) {
  const id = useId();
  const [from, to] = gradients[name];
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={angle === 'diagonal' ? '1' : '0'} y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

export function Hairline({ inset = 0, color = colors.sep }: { inset?: number; color?: string }) {
  return <View style={{ height: StyleSheet.hairlineWidth, marginLeft: inset, backgroundColor: color }} />;
}

export function Skeleton({ width, height, radius: r = 6 }: { width: number | `${number}%`; height: number; radius?: number }) {
  return <View style={{ width, height, borderRadius: r, backgroundColor: colors.track }} />;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 11 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, marginHorizontal: 16, overflow: 'hidden' },
  date: { width: 40, height: 42, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.15)' },
  dateHead: { height: 14, backgroundColor: colors.red, justifyContent: 'center' },
  pill: { height: 34, paddingHorizontal: 14, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
