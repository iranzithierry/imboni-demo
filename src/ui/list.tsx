import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';

import { Hairline } from './atoms';
import { Icon } from './icon';
import { Txt } from './text';
import { colors, radius } from './theme';

/** Inset group (`.group`). Draws hairlines between rows, indented like iOS. */
export function Group({ children, inset = 16, style }: { children: ReactNode; inset?: number; style?: StyleProp<ViewStyle> }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.group, style]}>
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 && <Hairline inset={inset} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

export const INSET = { plain: 16, tile: 60, avatar: 68, radio: 52 } as const;

type CellProps = {
  children?: ReactNode;
  left?: ReactNode;
  title?: string;
  subtitle?: string;
  detail?: string;
  right?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  align?: 'center' | 'top';
  tone?: 'default' | 'tint' | 'destructive' | 'muted';
  background?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: { checked?: boolean; selected?: boolean; expanded?: boolean; disabled?: boolean };
  accessibilityLabel?: string;
  padY?: number;
};

const TONE = { default: colors.l1, tint: colors.tint, destructive: colors.red, muted: colors.l2 } as const;

export function Cell({ children, left, title, subtitle, detail, right, chevron, onPress, onLongPress, align = 'center', tone = 'default', background = colors.card, accessibilityRole, accessibilityState, accessibilityLabel, padY = 11 }: CellProps) {
  const body = (
    <>
      {left}
      <View style={styles.grow}>
        {title !== undefined && (
          <Txt c={TONE[tone]} numberOfLines={2}>
            {title}
          </Txt>
        )}
        {subtitle !== undefined && (
          <Txt v="fn" c={colors.l2} num>
            {subtitle}
          </Txt>
        )}
        {children}
      </View>
      {detail !== undefined && (
        <Txt c={colors.l2} numberOfLines={1} num>
          {detail}
        </Txt>
      )}
      {right}
      {chevron && <Icon name="chevronRight" size={13} color={colors.l3} />}
    </>
  );
  const rowStyle = [styles.cell, { alignItems: align === 'top' ? 'flex-start' : 'center', paddingVertical: padY } as const];
  if (!onPress && !onLongPress) {
    return <View style={[rowStyle, { backgroundColor: background }]}>{body}</View>;
  }
  return (
    <Pressable
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress && (() => {
        haptic.threshold();
        onLongPress();
      })}
      style={({ pressed }) => [rowStyle, { backgroundColor: pressed ? colors.pressed : background }]}>
      {body}
    </Pressable>
  );
}

/** Uppercase group header (`.ghdr`). */
export function GroupHeader({ children, top = 22 }: { children: string; top?: number }) {
  return (
    <Txt v="fn" c={colors.l2} accessibilityRole="header" style={[styles.ghdr, { paddingTop: top }]}>
      {children.toUpperCase()}
    </Txt>
  );
}

export function GroupFooter({ children }: { children: ReactNode }) {
  return (
    <Txt v="fn" c={colors.l2} style={styles.gfoot}>
      {children}
    </Txt>
  );
}

/** Bold section title with optional trailing accessory (`.ghdr2`). */
export function SectionTitle({ title, accessory, color = colors.l1 }: { title: string; accessory?: ReactNode; color?: string }) {
  return (
    <View style={styles.ghdr2}>
      <Txt v="t2" c={color} accessibilityRole="header">
        {title}
      </Txt>
      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginHorizontal: 16, backgroundColor: colors.card, borderRadius: radius.group, overflow: 'hidden' },
  cell: { flexDirection: 'row', gap: 14, minHeight: 44, paddingHorizontal: 16 },
  grow: { flex: 1, minWidth: 0 },
  ghdr: { paddingHorizontal: 32, paddingBottom: 7, letterSpacing: 0.26 },
  gfoot: { paddingHorizontal: 32, paddingTop: 7 },
  ghdr2: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 22, paddingHorizontal: 20, paddingBottom: 8 },
});
