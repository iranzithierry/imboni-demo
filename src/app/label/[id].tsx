import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProvenanceSchema, type Provenance } from '@/data/schema';
import { provenanceLabel } from '@/features/labels';
import { formatDate, formatTime } from '@/lib/dates';
import { IconTile } from '@/ui/atoms';
import { IconButton } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, type Palette, radius, Status, useColors } from '@/ui/theme';

/** One line per label, so people learn the whole system from any one of them. */
const SHORT: Record<Provenance, string> = {
  official: 'Published by the institution itself.',
  institution_confirmed: 'Drafted by Imboni, confirmed by the institution.',
  reviewed: 'A coordinator checked it against the source.',
  ai_summary: 'Automatic summary, not reviewed yet.',
  conflicting: 'Two official sources disagree.',
  updated: 'Something material changed; open it to see what.',
  source_removed: 'The original was deleted and is under review.',
  withdrawn: 'No longer valid, kept for history.',
};

const toneOf = (t: string): Status => (t === 'ok' || t === 'warn' || t === 'bad' ? t : 'neutral');
const fgOf = (colors: Palette, t: Status) => (t === 'ok' ? colors.ok : t === 'warn' ? colors.warn : t === 'bad' ? colors.bad : colors.ink2);

function when(at: string) {
  if (!at) return null;
  if (at.includes('T')) return `${formatDate.long(at.slice(0, 10))}, ${formatTime(at)}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(at) ? formatDate.long(at) : null;
}

export default function LabelSheet() {
  const colors = useColors();
  const styles = useStyles();
  const params = useLocalSearchParams<{ id: string; institution?: string; source?: string; at?: string }>();
  const bottom = useSafeAreaInsets().bottom;
  const parsed = ProvenanceSchema.safeParse(params.id);
  const current = parsed.success ? parsed.data : null;
  const label = current ? provenanceLabel(current) : null;
  const tone = label ? toneOf(label.tone) : 'neutral';
  const time = when(params.at ?? '');
  const origin = [params.institution ? `From ${params.institution}` : null, params.source || null, time].filter(Boolean).join(' · ');

  return (
    <View style={[styles.sheet, { paddingBottom: Math.max(bottom, 16) + 8 }]}>
      <View style={styles.top}>
        <Txt v="headline" accessibilityRole="header" style={{ flex: 1 }}>
          About this label
        </Txt>
        <IconButton icon="xmark" label="Close" variant="quiet" size={36} onPress={() => router.back()} />
      </View>
      {label && (
        <View style={styles.head}>
          <View style={styles.title}>
            <IconTile icon={label.icon} tone={tone} size={40} />
            <Txt v="title2" style={{ flex: 1 }} accessibilityRole="header">
              {label.label}
            </Txt>
          </View>
          <Txt v="callout" style={{ marginTop: 12 }}>
            {label.meaning}
          </Txt>
          {origin.length > 0 && (
            <Txt v="footnote" c={colors.ink2} num style={{ marginTop: 8 }}>
              {origin}
            </Txt>
          )}
        </View>
      )}

      <Txt v="footnote" w="medium" c={colors.ink2} style={styles.listLabel} accessibilityRole="header">
        Every label Imboni uses
      </Txt>
      <View style={styles.list}>
        {ProvenanceSchema.options.map((p, i) => {
          const l = provenanceLabel(p);
          const t = toneOf(l.tone);
          const on = p === current;
          return (
            <View key={p} style={[styles.item, i > 0 && styles.itemDivider, on && styles.itemOn]} accessibilityLabel={`${l.label}. ${SHORT[p]}${on ? ' This item’s label.' : ''}`}>
              <Icon name={l.icon} size={15} color={fgOf(colors, t)} weight="semibold" />
              <View style={{ flex: 1 }}>
                <Txt v="subhead" w="semibold">
                  {l.label}
                </Txt>
                <Txt v="footnote" c={colors.ink2}>
                  {SHORT[p]}
                </Txt>
              </View>
            </View>
          );
        })}
      </View>
      <Txt v="caption" c={colors.ink3} style={styles.foot}>
        Labels show where an item came from and who checked it. Imboni never shows scores.
      </Txt>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  sheet: { backgroundColor: colors.canvas },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, paddingLeft: GUTTER + 4, paddingRight: GUTTER },
  head: { paddingHorizontal: GUTTER + 4, paddingTop: 14 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listLabel: { paddingHorizontal: GUTTER + 4, paddingTop: 22, paddingBottom: 8 },
  list: { marginHorizontal: GUTTER, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 9 },
  itemDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  itemOn: { backgroundColor: colors.fill },
  foot: { paddingHorizontal: GUTTER + 4, paddingTop: 10 },
}));
