import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { useAction } from '@/features/data';
import { formatDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { Radio, IconTile } from '@/ui/atoms';
import { Button, Chip } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Group, GroupLabel, Row } from '@/ui/list';
import { useHeroTitle, useScrollY } from '@/ui/nav';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors } from '@/ui/theme';

export default function NoteChecker() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { action, error, refetch, isPending } = useAction(id);
  const { scrollY, onScroll } = useScrollY();
  const table = action?.checker;
  const [value, setValue] = useState(table?.denominations.at(-1)?.value ?? '');
  const [date, setDate] = useState<string | null>(null);
  useHeroTitle(scrollY, 40, 'Check a banknote');
  if (!action || !table) return isPending ? null : <ErrorScreen error={error ?? new Error('not_found')} onRetry={() => refetch()} />;
  const denom = table.denominations.find((d) => d.value === value) ?? table.denominations[0];
  const hit = denom?.dates.find((d) => d.label === date);
  const [now, next] = action.phases;
  const withdrawnNote = now && next ? `Exchange it at ${now.label.toLowerCase()} by ${formatDate.long(now.to)}, then only at BNR until ${formatDate.long(next.to)}. It’s free.` : `Exchange it by ${formatDate.long(action.deadline)}.`;

  return (
    <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={styles.head}>
        <Txt v="title1" accessibilityRole="header">
          Check a banknote
        </Txt>
        <Txt v="callout" c={colors.ink2} style={{ marginTop: 6 }}>
          BNR withdrew specific issue dates, not whole values. Pick the value, then the date printed on your note.
        </Txt>
      </View>

      <View style={styles.note} accessibilityLabel={`${denom?.value} Rwandan francs${date ? `, issued ${date}` : ''}`}>
        <View style={styles.noteFrame}>
          <View style={styles.noteTop}>
            <Txt v="caption" c={colors.ink2}>
              Banki Nkuru y’u Rwanda
            </Txt>
            <View style={styles.seal}>
              <Icon name="bank" size={16} color={colors.violet} />
            </View>
          </View>
          <Txt v="display" num style={{ marginTop: 8 }}>
            {denom?.value}
          </Txt>
          <Txt v="footnote" c={colors.ink2}>
            Rwandan francs
          </Txt>
          <View style={styles.dateChip}>
            <Icon name="calendar" size={12} color={colors.ink} />
            <Txt v="footnote" w="semibold" num>
              {date ?? 'Issue date'}
            </Txt>
          </View>
        </View>
      </View>

      <GroupLabel>Value</GroupLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {table.denominations.map((d) => (
          <Chip
            key={d.value}
            label={`Rwf ${d.value}`}
            selected={d.value === value}
            onPress={() => {
              setValue(d.value);
              setDate(null);
            }}
          />
        ))}
      </ScrollView>

      <GroupLabel>Issue date printed on the note</GroupLabel>
      <Group>
        {denom?.dates.map((d) => (
          <Row
            key={d.label}
            title={d.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: date === d.label }}
            onPress={() => {
              setDate(d.label);
              if (d.withdrawn) haptic.warning();
              else haptic.success();
            }}
            right={<Radio on={date === d.label} />}
          />
        ))}
      </Group>

      {hit && (
        <Animated.View key={`${value}-${hit.label}`} entering={FadeIn.duration(motion.base)} layout={LinearTransition.duration(motion.base)} style={[styles.result, { backgroundColor: hit.withdrawn ? colors.badWash : colors.okWash }]} accessibilityLiveRegion="polite">
          <View style={styles.resultHead}>
            <IconTile icon={hit.withdrawn ? 'xmark' : 'check'} tone={hit.withdrawn ? 'bad' : 'ok'} size={40} style={{ backgroundColor: colors.card }} />
            <Txt v="title2" c={hit.withdrawn ? colors.bad : colors.ok}>
              {hit.withdrawn ? 'Withdrawn' : 'Still valid'}
            </Txt>
          </View>
          <Txt v="callout" style={{ marginTop: 10 }}>
            {hit.withdrawn ? withdrawnNote : 'Keep using it. Nothing to do for this note.'}
          </Txt>
          {hit.withdrawn && (
            <View style={{ marginTop: 16 }}>
              <Button label="Track the exchange" icon="plus" size="md" onPress={() => router.push({ pathname: '/track/[id]', params: { id: action.id } })} />
            </View>
          )}
        </Animated.View>
      )}
      <View style={styles.source}>
        <Icon name="shield" size={14} color={colors.ok} />
        <Txt v="footnote" c={colors.ink2} style={{ flex: 1 }}>
          {table.source}
        </Txt>
      </View>
    </Animated.ScrollView>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  head: { paddingHorizontal: GUTTER, paddingTop: 12 },
  note: { marginHorizontal: GUTTER, marginTop: 20, padding: 8, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  noteFrame: { padding: 16, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.violet, borderStyle: 'dashed', backgroundColor: colors.violetWash, minHeight: 176 },
  noteTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seal: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  dateChip: { position: 'absolute', right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 10, borderRadius: radius.sm, backgroundColor: colors.card },
  chips: { gap: 8, paddingHorizontal: GUTTER },
  result: { marginHorizontal: GUTTER, marginTop: 16, padding: 18, borderRadius: radius.xl, borderCurve: 'continuous' },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: GUTTER + 4, paddingTop: 14 },
}));
