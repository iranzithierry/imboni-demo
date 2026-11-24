import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable';
import { Txt } from './text';
import { colors, radius } from './theme';

const VARIANTS = {
  fill: { bg: colors.tint, fg: colors.white },
  tinted: { bg: 'rgba(10,82,233,0.12)', fg: colors.tint },
  gray: { bg: colors.fill, fg: colors.tint },
  grayInk: { bg: colors.fill, fg: colors.l1 },
  white: { bg: colors.white, fg: colors.l1 },
  black: { bg: colors.l1, fg: colors.white },
  plain: { bg: 'transparent', fg: colors.tint },
  plainLight: { bg: 'transparent', fg: colors.white },
  red: { bg: 'rgba(255,59,48,0.12)', fg: colors.red },
} as const;
export type ButtonVariant = keyof typeof VARIANTS;

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  /** Square icon button; `label` becomes the accessibility label. */
  iconOnly?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({ label, onPress, variant = 'fill', icon, disabled, loading, compact, iconOnly, style, accessibilityHint }: ButtonProps) {
  const v = VARIANTS[variant];
  const off = disabled || loading;
  const bg = disabled ? colors.fill : v.bg;
  const fg = disabled ? colors.l3 : v.fg;
  return (
    <PressableScale
      scaleTo={0.97}
      feedback="tap"
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      disabled={off}
      onPress={onPress}
      style={[styles.btn, { backgroundColor: bg, height: variant.startsWith('plain') ? 44 : compact ? 44 : 50 }, iconOnly && styles.square, style]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} size={iconOnly ? 20 : 17} color={fg} />}
          {!iconOnly && (
            <Txt v="hl" c={fg} style={compact && { fontSize: 15 }} numberOfLines={1}>
              {label}
            </Txt>
          )}
        </View>
      )}
    </PressableScale>
  );
}

const CAP = {
  tinted: { bg: 'rgba(10,82,233,0.12)', fg: colors.tint },
  solid: { bg: colors.tint, fg: colors.white },
  gray: { bg: colors.fill, fg: colors.l1 },
  glass: { bg: 'rgba(255,255,255,0.2)', fg: colors.white },
  dark: { bg: colors.black, fg: colors.white },
} as const;

type CapProps = {
  label: string;
  onPress?: () => void;
  variant?: keyof typeof CAP;
  icon?: IconName;
  trailingIcon?: IconName;
  height?: number;
  accessibilityState?: { selected?: boolean; expanded?: boolean };
};

/** Capsule button (`.cap-btn`). Without onPress it renders as a static chip. */
export function CapButton({ label, onPress, variant = 'tinted', icon, trailingIcon, height = 30, accessibilityState }: CapProps) {
  const v = CAP[variant];
  const content = (
    <>
      {icon && <Icon name={icon} size={13} color={v.fg} />}
      <Txt v="sh" c={v.fg} w="600" numberOfLines={1}>
        {label}
      </Txt>
      {trailingIcon && <Icon name={trailingIcon} size={13} color={v.fg} />}
    </>
  );
  const style = [styles.cap, { backgroundColor: v.bg, height, borderRadius: height / 2 }];
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <PressableScale scaleTo={0.95} feedback="tap" accessibilityRole="button" accessibilityState={accessibilityState} onPress={onPress} style={style}>
      {content}
    </PressableScale>
  );
}

type CircleProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: 'fill' | 'glass' | 'card' | 'tinted';
  size?: number;
};

export function CircleButton({ icon, label, onPress, variant = 'fill', size = 30 }: CircleProps) {
  const bg = { fill: colors.fill, glass: 'rgba(255,255,255,0.78)', card: colors.card, tinted: 'rgba(10,82,233,0.12)' }[variant];
  const fg = { fill: colors.l2, glass: colors.l1, card: colors.l1, tinted: colors.tint }[variant];
  return (
    <PressableScale
      scaleTo={0.92}
      feedback="tap"
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={Math.max(0, (44 - size) / 2)}
      onPress={onPress}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Icon name={icon} size={size * 0.47} color={fg} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.btn, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, alignSelf: 'stretch' },
  square: { width: 50, paddingHorizontal: 0, alignSelf: 'auto' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cap: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 14 },
  circle: { alignItems: 'center', justifyContent: 'center' },
});
