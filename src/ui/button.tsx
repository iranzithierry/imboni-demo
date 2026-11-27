import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';

import { Icon, type IconName } from './icon';
import { Highlight } from './pressable';
import { Txt } from './text';
import { createStyles, palettes, radius, useColors, type Palette } from './theme';

const EDGE = 3;
const SIZE = { lg: 52, md: 44, sm: 36 } as const;
type Size = keyof typeof SIZE;

const flat = (colors: Palette) =>
  ({
    ink: { bg: colors.ink, fg: colors.canvas, border: colors.ink },
    secondary: { bg: colors.card, fg: colors.ink, border: colors.line },
    quiet: { bg: colors.fill, fg: colors.ink, border: colors.fill },
    tinted: { bg: colors.accentWash, fg: colors.accentInk, border: colors.accentWash },
    danger: { bg: colors.card, fg: colors.bad, border: colors.line },
    light: { bg: colors.white, fg: palettes.light.ink, border: colors.white },
    onDark: { bg: 'rgba(255,255,255,0.12)', fg: colors.white, border: 'rgba(255,255,255,0.18)' },
  }) as const;
type FlatVariant = keyof ReturnType<typeof flat>;
export type ButtonVariant = 'primary' | FlatVariant;

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: Size;
  icon?: IconName;
  trailingIcon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Shrink to the label instead of filling the row. */
  hug?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({ variant = 'primary', ...props }: ButtonProps) {
  return variant === 'primary' ? <PrimaryButton {...props} /> : <FlatButton variant={variant} {...props} />;
}

function Content({ label, icon, trailingIcon, fg, loading, size }: { label: string; icon?: IconName; trailingIcon?: IconName; fg: string; loading?: boolean; size: Size }) {
  const styles = useStyles();
  if (loading) return <ActivityIndicator color={fg} />;
  return (
    <View style={styles.row}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} color={fg} weight="semibold" />}
      <Txt v={size === 'sm' ? 'subhead' : 'callout'} w="semibold" c={fg} numberOfLines={1}>
        {label}
      </Txt>
      {trailingIcon && <Icon name={trailingIcon} size={size === 'sm' ? 13 : 15} color={fg} weight="semibold" />}
    </View>
  );
}

/**
 * The one orange action on a screen. Its burnt edge sits under the face like a sticker on paper,
 * and pressing pushes the face down onto it.
 */
function PrimaryButton({ label, onPress, size = 'lg', icon, trailingIcon, disabled, loading, hug, style, accessibilityHint }: Omit<ButtonProps, 'variant'>) {
  const colors = useColors();
  const styles = useStyles();
  const h = SIZE[size];
  const down = useSharedValue(0);
  const face = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(down.get() * EDGE, { duration: 70, easing: Easing.out(Easing.quad) }) }],
  }));
  const off = disabled || loading;
  if (disabled) {
    return (
      <View accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel={label} style={[{ height: h + EDGE, paddingTop: EDGE }, hug && styles.hug, style]}>
        <View style={[styles.face, { height: h, backgroundColor: colors.fill }]}>
          <Content label={label} icon={icon} trailingIcon={trailingIcon} fg={colors.ink3} size={size} />
        </View>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: !!loading }}
      disabled={off}
      onPressIn={() => down.set(1)}
      onPressOut={() => down.set(0)}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={[{ height: h + EDGE }, hug && styles.hug, style]}>
      <View style={[styles.edge, { top: EDGE }]} />
      <Animated.View style={[styles.face, { height: h, backgroundColor: colors.accent }, face]}>
        <Content label={label} icon={icon} trailingIcon={trailingIcon} fg={colors.white} loading={loading} size={size} />
      </Animated.View>
    </Pressable>
  );
}

function FlatButton({ label, onPress, variant, size = 'lg', icon, trailingIcon, disabled, loading, hug, style, accessibilityHint }: ButtonProps & { variant: FlatVariant }) {
  const colors = useColors();
  const styles = useStyles();
  const v = flat(colors)[variant];
  const fg = disabled ? colors.ink3 : v.fg;
  return (
    <Highlight
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      feedback="tap"
      onPress={onPress}
      pressedStyle={{ opacity: 0.72 }}
      style={[styles.face, { height: SIZE[size], backgroundColor: disabled ? colors.fill : v.bg, borderColor: disabled ? colors.fill : v.border, borderWidth: 1, paddingHorizontal: size === 'sm' ? 12 : 18 }, hug && styles.hug, style]}>
      <Content label={label} icon={icon} trailingIcon={trailingIcon} fg={fg} loading={loading} size={size} />
    </Highlight>
  );
}

const iconVariants = (colors: Palette) =>
  ({
    outline: { bg: colors.card, fg: colors.ink, border: colors.line },
    plain: { bg: 'transparent', fg: colors.ink, border: 'transparent' },
    quiet: { bg: colors.fill, fg: colors.ink, border: colors.fill },
    tinted: { bg: colors.accentWash, fg: colors.accentInk, border: colors.accentWash },
    onPhoto: { bg: colors.white, fg: palettes.light.ink, border: colors.white },
    onDark: { bg: 'rgba(255,255,255,0.14)', fg: colors.white, border: 'rgba(255,255,255,0.18)' },
  }) as const;

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: keyof ReturnType<typeof iconVariants>;
  size?: number;
  selected?: boolean;
  disabled?: boolean;
};

export function IconButton({ icon, label, onPress, variant = 'outline', size = 40, selected, disabled }: IconButtonProps) {
  const colors = useColors();
  const styles = useStyles();
  const v = iconVariants(colors)[variant];
  // Plain toggles show their state with a filled glyph in the brand colour; framed ones fill with it.
  const inverted = Boolean(selected) && variant !== 'plain';
  return (
    <Highlight
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      feedback="tap"
      hitSlop={Math.max(0, (44 - size) / 2)}
      onPress={onPress}
      pressedStyle={{ opacity: 0.6 }}
      style={[styles.iconBtn, { width: size, height: size, backgroundColor: inverted ? colors.accent : v.bg, borderColor: inverted ? colors.accent : v.border, opacity: disabled ? 0.4 : 1 }]}>
      <Icon name={icon} size={Math.round(size * 0.45)} color={inverted ? colors.white : selected && variant === 'plain' ? colors.accent : v.fg} weight="semibold" filled={selected && variant === 'plain'} />
    </Highlight>
  );
}

/** Quiet text action, e.g. "See all" beside a section title. */
export function TextAction({ label, onPress, icon = 'chevronRight', color, disabled }: { label: string; onPress: () => void; icon?: IconName | null; color?: string; disabled?: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  const tint = color ?? colors.accent;
  return (
    <Highlight accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} hitSlop={10} onPress={onPress} style={[styles.textAction, disabled && { opacity: 0.4 }]}>
      <Txt v="subhead" w="medium" c={tint}>
        {label}
      </Txt>
      {icon && <Icon name={icon} size={11} color={tint} weight="semibold" />}
    </Highlight>
  );
}

type ChipProps = { label: string; selected?: boolean; onPress: () => void; icon?: IconName; count?: number };

/** Selectable filter. Selected chips take the brand tint; the change is the state, so it is instant. */
export function Chip({ label, selected, onPress, icon, count }: ChipProps) {
  const colors = useColors();
  const styles = useStyles();
  const fg = selected ? colors.accentInk : colors.ink;
  return (
    <Highlight
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      feedback="selection"
      onPress={onPress}
      pressedStyle={{ opacity: 0.7 }}
      style={[styles.chip, selected ? { backgroundColor: colors.accentWash, borderColor: colors.accent } : { backgroundColor: colors.card, borderColor: colors.line }]}>
      {icon && <Icon name={icon} size={14} color={fg} weight="semibold" />}
      <Txt v="subhead" w="medium" c={fg} numberOfLines={1}>
        {label}
      </Txt>
      {count !== undefined && (
        <Txt v="footnote" w="medium" num c={selected ? colors.accentInk : colors.ink3}>
          {count}
        </Txt>
      )}
    </Highlight>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hug: { alignSelf: 'flex-start' },
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: radius.sm, borderCurve: 'continuous', backgroundColor: colors.accentEdge },
  face: { borderRadius: radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  iconBtn: { borderRadius: radius.sm, borderCurve: 'continuous', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  textAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  chip: { height: 36, borderRadius: radius.sm, borderCurve: 'continuous', borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
}));
