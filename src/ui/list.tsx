import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';

import { Divider } from './atoms';
import { Icon, type IconName } from './icon';
import { Highlight } from './pressable';
import { Txt } from './text';
import { createStyles, GUTTER, radius, useColors } from './theme';

/** A bordered panel of rows with dividers between them. */
/** A full-width hairline between sections of a page that has no cards. */
export function Rule({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }, style]} />;
}

/** Rows with dividers. `plain` drops the card so the rows sit straight on the page, as in a feed. */
export function Group({ children, inset = 16, style, flush, plain }: { children: ReactNode; inset?: number; style?: StyleProp<ViewStyle>; flush?: boolean; plain?: boolean }) {
  const styles = useStyles();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[plain ? styles.plain : styles.group, flush && styles.flush, style]}>
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 && <Divider inset={inset} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/** Divider insets that line up with each kind of leading element. */
export const INSET = { plain: 16, tile: 64, mono: 68, check: 56 } as const;

type RowProps = {
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
  tone?: 'default' | 'muted' | 'danger';
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: { checked?: boolean; selected?: boolean; expanded?: boolean; disabled?: boolean };
  accessibilityLabel?: string;
  padY?: number;
};

export function Row({ children, left, title, subtitle, detail, right, chevron, onPress, onLongPress, align = 'center', tone = 'default', accessibilityRole, accessibilityState, accessibilityLabel, padY = 13 }: RowProps) {
  const colors = useColors();
  const styles = useStyles();
  const body = (
    <>
      {left}
      <View style={styles.grow}>
        {title !== undefined && (
          <Txt v="callout" w="medium" c={tone === 'danger' ? colors.bad : tone === 'muted' ? colors.ink2 : colors.ink} numberOfLines={2}>
            {title}
          </Txt>
        )}
        {subtitle !== undefined && (
          <Txt v="footnote" c={colors.ink2} num style={{ marginTop: 1 }}>
            {subtitle}
          </Txt>
        )}
        {children}
      </View>
      {detail !== undefined && (
        <Txt v="subhead" c={colors.ink2} numberOfLines={1} num style={styles.detail}>
          {detail}
        </Txt>
      )}
      {right}
      {chevron && <Icon name="chevronRight" size={13} color={colors.pearl} weight="semibold" />}
    </>
  );
  const rowStyle = [styles.row, { alignItems: align === 'top' ? 'flex-start' : 'center', paddingVertical: padY } as const];
  if (!onPress && !onLongPress) return <View style={rowStyle}>{body}</View>;
  return (
    <Highlight
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={
        onLongPress &&
        (() => {
          haptic.threshold();
          onLongPress();
        })
      }
      pressedStyle={{ backgroundColor: colors.pressed }}
      style={rowStyle}>
      {body}
    </Highlight>
  );
}

/** Section title. Every section icon has the same muted tile, so sections read apart without competing colours. */
export function SectionHeader({ title, caption, accessory, icon, top = 32, compact, style }: { title: string; caption?: string; accessory?: ReactNode; icon?: IconName; top?: number; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const styles = useStyles();
  if (compact) {
    return (
      <View style={[styles.section, { paddingTop: 14, paddingBottom: 6 }, style]}>
        <Txt v="headline" accessibilityRole="header" style={styles.grow}>
          {title}
        </Txt>
        {accessory}
      </View>
    );
  }
  return (
    <View style={[styles.section, { paddingTop: top }, style]}>
      {icon && (
        <View style={[styles.sectionIcon, { backgroundColor: colors.fill }]}>
          <Icon name={icon} size={16} color={colors.ink} weight="semibold" />
        </View>
      )}
      <View style={styles.grow}>
        <Txt v="title3" accessibilityRole="header">
          {title}
        </Txt>
        {caption && (
          <Txt v="footnote" c={colors.ink2} num style={{ marginTop: 1 }}>
            {caption}
          </Txt>
        )}
      </View>
      {accessory}
    </View>
  );
}

/** Small sentence-case label above a group in settings-style screens. */
export function GroupLabel({ children, top = 24 }: { children: string; top?: number }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Txt v="footnote" w="medium" c={colors.ink2} accessibilityRole="header" style={[styles.label, { paddingTop: top }]}>
      {children}
    </Txt>
  );
}

export function GroupNote({ children }: { children: ReactNode }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Txt v="footnote" c={colors.ink3} style={styles.note}>
      {children}
    </Txt>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  group: { marginHorizontal: GUTTER, backgroundColor: colors.card, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  flush: { marginHorizontal: 0 },
  plain: { paddingHorizontal: GUTTER - 16 },
  row: { flexDirection: 'row', gap: 12, minHeight: 52, paddingHorizontal: 16 },
  grow: { flex: 1, minWidth: 0 },
  detail: { maxWidth: '45%' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 12 },
  sectionIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  label: { paddingHorizontal: GUTTER + 4, paddingBottom: 8 },
  note: { paddingHorizontal: GUTTER + 4, paddingTop: 8 },
}));
