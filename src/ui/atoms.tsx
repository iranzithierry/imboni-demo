import type { ReactNode } from 'react';
import { Platform, StyleSheet, Switch as NativeSwitch, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';

import { Icon, type IconName } from './icon';
import { Txt } from './text';
import { createStyles, hueColors, motion, palettes, radius, solidHue, statusColors, useColors, type Hue, type Palette, type Status } from './theme';

const EASE = Easing.out(Easing.quad);

export type TagTone = Status | 'outline' | 'ink' | 'onDark' | Hue;

function tagColors(colors: Palette, tone: TagTone): { bg: string; fg: string; border?: string } {
  switch (tone) {
    case 'outline':
      return { bg: 'transparent', fg: colors.ink, border: colors.line };
    case 'ink':
      return { bg: colors.ink, fg: colors.canvas };
    case 'onDark':
      return { bg: 'rgba(255,255,255,0.14)', fg: colors.white, border: 'rgba(255,255,255,0.16)' };
    case 'brand':
      return { bg: colors.accentWash, fg: colors.accentInk };
    case 'neutral':
    case 'ok':
    case 'warn':
    case 'bad':
      return statusColors(colors, tone);
    default:
      return hueColors(colors, tone);
  }
}

/** Small label. Status tags always carry an icon so colour is never the only signal. */
export function Tag({ label, tone = 'neutral', icon, style }: { label: string; tone?: TagTone; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const styles = useStyles();
  const t = tagColors(colors, tone);
  return (
    <View style={[styles.tag, { backgroundColor: t.bg, borderColor: t.border ?? t.bg }, style]}>
      {icon && <Icon name={icon} size={11} color={t.fg} weight="semibold" />}
      <Txt v="caption" c={t.fg} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

export type TileTone = Status | 'ink' | 'onDark' | Hue;

/**
 * Rounded square holding an icon. Feature tiles take their feature's hue; `solid` fills the tile with the
 * hue and draws the glyph in white, as settings lists do.
 */
export function IconTile({ icon, tone = 'neutral', size = 36, solid, style }: { icon: IconName; tone?: TileTone; size?: number; solid?: boolean; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const styles = useStyles();
  const c =
    tone === 'ink'
      ? { bg: colors.ink, fg: colors.canvas }
      : tone === 'onDark'
        ? { bg: 'rgba(255,255,255,0.14)', fg: colors.white }
        : tone === 'neutral' || tone === 'ok' || tone === 'warn' || tone === 'bad'
          ? tone === 'neutral'
            ? { bg: colors.fill, fg: colors.ink }
            : statusColors(colors, tone)
          : hueColors(colors, tone);
  // Solid tiles mark a feature in its own hue; the light scheme's tone keeps the white glyph legible in dark mode.
  const filled = solid && tone !== 'neutral' && tone !== 'ink' && tone !== 'onDark';
  const solidBg = tone === 'ok' || tone === 'warn' || tone === 'bad' ? statusColors(palettes.light, tone).fg : tone === 'neutral' || tone === 'ink' || tone === 'onDark' ? palettes.light.ink3 : solidHue(tone);
  return (
    <View style={[styles.center, { width: size, height: size, borderRadius: size >= 48 ? radius.md : radius.sm, borderCurve: 'continuous', backgroundColor: filled ? solidBg : c.bg }, style]}>
      <Icon name={icon} size={Math.round(size * 0.5)} color={filled ? colors.white : c.fg} weight={filled ? 'semibold' : 'medium'} />
    </View>
  );
}

type CardProps = { children: ReactNode; style?: StyleProp<ViewStyle>; radiusSize?: 'lg' | 'xl'; padded?: boolean };

export function Card({ children, style, radiusSize = 'xl', padded = true }: CardProps) {
  const styles = useStyles();
  return <View style={[styles.card, { borderRadius: radius[radiusSize] }, padded && { padding: 16 }, style]}>{children}</View>;
}

export function Divider({ inset = 0, color, style }: { inset?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, marginLeft: inset, backgroundColor: color ?? colors.line }, style]} />;
}

export function Skeleton({ width, height, r = radius.xs, style }: { width: number | `${number}%`; height: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return <View style={[{ width, height, borderRadius: r, backgroundColor: colors.fill }, style]} />;
}

/** Square checkbox in the brand colour. The fill eases in: it is the state change. */
export function Checkbox({ on, size = 24, tone = 'brand' }: { on: boolean; size?: number; tone?: 'brand' | 'ok' }) {
  const colors = useColors();
  const styles = useStyles();
  const fill = tone === 'ok' ? colors.ok : colors.accent;
  const idle = colors.card;
  const edge = colors.pearl;
  const animated = useAnimatedStyle(() => ({
    backgroundColor: withTiming(on ? fill : idle, { duration: motion.fast, easing: EASE }),
    borderColor: withTiming(on ? fill : edge, { duration: motion.fast, easing: EASE }),
  }));
  return (
    <Animated.View style={[styles.center, { width: size, height: size, borderRadius: radius.sm, borderWidth: 1.5 }, animated]}>
      {on && <Icon name="check" size={size * 0.55} color={colors.white} weight="semibold" />}
    </Animated.View>
  );
}

export function Radio({ on, size = 22 }: { on: boolean; size?: number }) {
  const colors = useColors();
  const styles = useStyles();
  return <View style={[styles.center, { width: size, height: size, borderRadius: size / 2, borderWidth: on ? size * 0.3 : 1.5, borderColor: on ? colors.accent : colors.pearl, backgroundColor: colors.card }]} />;
}

export function Switch({ value, onChange, label, disabled }: { value: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  const colors = useColors();
  return (
    <NativeSwitch
      accessibilityLabel={label}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        haptic.selection();
        onChange(next);
      }}
      trackColor={{ true: colors.accent, false: Platform.OS === 'ios' ? undefined : colors.line }}
      // react-native-web otherwise paints the thumb in Material teal.
      thumbColor={Platform.OS === 'ios' ? undefined : colors.white}
      ios_backgroundColor={colors.line}
    />
  );
}

/** Thin bar for windows and progress; it eases to a new value when the value changes. */
export function Bar({ value, color, track, height = 6 }: { value: number; color?: string; track?: string; height?: number }) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(1, value));
  const animated = useAnimatedStyle(() => ({ width: withTiming(`${clamped * 100}%`, { duration: motion.slow, easing: EASE }) }));
  return (
    <View style={{ height, borderRadius: radius.xs, backgroundColor: track ?? colors.fill, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      <Animated.View style={[{ height, borderRadius: radius.xs, backgroundColor: color ?? colors.accent }, animated]} />
    </View>
  );
}

/** Unread marker in the brand colour. */
export function Dot({ color, size = 8 }: { color?: string; size?: number }) {
  const colors = useColors();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? colors.accent }} />;
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    center: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    tag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, height: 22, paddingHorizontal: 7, borderRadius: radius.xs, borderWidth: 1 },
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderCurve: 'continuous', overflow: 'hidden' },
  }),
);
