import { router } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Change, Field, Provenance } from '@/data/schema';
import { countdownLabel, formatDate, formatTime } from '@/lib/dates';
import { Tag, type TagTone } from '@/ui/atoms';
import { Icon } from '@/ui/icon';
import { Highlight } from '@/ui/pressable';
import { Txt } from '@/ui/text';
import { createStyles, radius, useColors } from '@/ui/theme';

import { provenanceLabel } from '../labels';

type ProvenanceProps = { provenance: Provenance; institution: string; source?: string; at?: string; onDark?: boolean };

/** Where an item came from and who checked it. Tapping explains the label in plain words. */
export function ProvenanceLabel({ provenance, institution, source, at, onDark }: ProvenanceProps) {
  const colors = useColors();
  const styles = useStyles();
  const p = provenanceLabel(provenance);
  const fg = onDark ? colors.nightInk2 : p.tone === 'ok' ? colors.ok : p.tone === 'warn' ? colors.warn : p.tone === 'bad' ? colors.bad : colors.ink2;
  return (
    <Highlight
      accessibilityRole="button"
      accessibilityLabel={`${p.label}. What this label means`}
      hitSlop={8}
      onPress={() => router.push({ pathname: '/label/[id]', params: { id: provenance, institution, source: source ?? '', at: at ?? '' } })}
      style={styles.provenance}>
      <Icon name={p.icon} size={14} color={fg} weight="semibold" />
      <Txt v="footnote" w="medium" c={onDark ? colors.nightInk2 : colors.ink2}>
        {p.label}
      </Txt>
    </Highlight>
  );
}

/** Days left, with urgency carried by icon, words and colour together. */
export function DeadlineChip({ daysLeft, compact, style }: { daysLeft: number; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const tone: TagTone = daysLeft < 0 ? 'neutral' : daysLeft <= 2 ? 'bad' : daysLeft <= 7 ? 'warn' : 'outline';
  const label =
    daysLeft < 0 ? `Closed ${countdownLabel(daysLeft)}` : daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Due tomorrow' : compact ? `${daysLeft} days` : `${daysLeft} days left`;
  return <Tag label={label} tone={tone} icon={daysLeft < 0 ? 'xmark' : 'clock'} style={style} />;
}

/** One changed field: the old value struck through, the new one in ink. */
export function ChangeLine({ change, style, onDark }: { change: Change; style?: StyleProp<ViewStyle>; onDark?: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.change, onDark && { backgroundColor: colors.nightRaised }, style]} accessibilityLabel={`${change.field} changed from ${change.before} to ${change.after}`}>
      <Icon name="refresh" size={14} color={onDark ? colors.white : colors.warn} weight="semibold" />
      <Txt v="footnote" c={onDark ? colors.nightInk2 : colors.ink2} style={{ flexShrink: 1 }}>
        {`${change.field}: `}
        <Txt v="footnote" c={onDark ? colors.nightInk2 : colors.ink3} strike num>
          {change.before}
        </Txt>
        <Txt v="footnote" c={onDark ? colors.nightInk2 : colors.ink3}>
          {'  →  '}
        </Txt>
        <Txt v="footnote" w="semibold" c={onDark ? colors.white : colors.ink} num>
          {change.after}
        </Txt>
      </Txt>
    </View>
  );
}

/** Up to three key fields side by side, each a small label over its value. */
export function FieldStrip({ fields, style }: { fields: readonly Field[]; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const styles = useStyles();
  if (!fields.length) return null;
  return (
    <View style={[styles.strip, style]}>
      {fields.slice(0, 3).map((f) => (
        <View key={f.label} style={styles.cell}>
          <Txt v="caption" c={colors.ink3} numberOfLines={1}>
            {f.label}
          </Txt>
          <Txt v="subhead" w="semibold" num numberOfLines={2} style={{ marginTop: 2 }}>
            {f.value}
          </Txt>
        </View>
      ))}
    </View>
  );
}

/** Label and value on one row; long-press reports that single field. */
export function FieldRow({ label, value, onReport, last }: { label: string; value: string; onReport?: () => void; last?: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Highlight
      accessibilityRole={onReport ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={onReport ? 'Long press to report this field' : undefined}
      disabled={!onReport}
      onLongPress={onReport}
      pressedStyle={{ backgroundColor: colors.pressed }}
      style={[styles.fieldRow, !last && styles.fieldDivider]}>
      <Txt v="subhead" c={colors.ink2} style={styles.fieldLabel}>
        {label}
      </Txt>
      <Txt v="subhead" w="medium" num style={styles.fieldValue}>
        {value}
      </Txt>
    </Highlight>
  );
}

/** "As of" stamp for modules whose data ages: rates, roads, offline copies. */
export function AsOf({ iso, stale, prefix = 'As of' }: { iso: string; stale?: boolean; prefix?: string }) {
  const colors = useColors();
  const styles = useStyles();
  const time = formatTime(iso);
  return (
    <View style={styles.asOf}>
      <Icon name={stale ? 'warning' : 'clock'} size={12} color={stale ? colors.warn : colors.ink3} />
      <Txt v="caption" c={stale ? colors.warn : colors.ink3} num>
        {stale ? `Saved copy from ${time} · may be out of date` : `${prefix} ${time}`}
      </Txt>
    </View>
  );
}

export const dateLabel = (ymd: string) => formatDate.long(ymd);

const useStyles = createStyles((colors) => StyleSheet.create({
  provenance: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  change: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.warnWash },
  strip: { flexDirection: 'row', gap: 16 },
  cell: { flex: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingVertical: 13, paddingHorizontal: 16 },
  fieldDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  fieldLabel: { width: 108 },
  fieldValue: { flex: 1, textAlign: 'right' },
  asOf: { flexDirection: 'row', alignItems: 'center', gap: 5 },
}));
