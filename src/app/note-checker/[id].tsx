import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { useAction } from '@/features/data';
import { formatDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { Gradient, Pill } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Cell, Group, GroupHeader } from '@/ui/list';
import { BackButton, NavBar, Screen, useNavInset, useScrollY } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

export default function NoteChecker() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { action } = useAction(id);
  const { scrollY, onScroll } = useScrollY();
  const top = useNavInset();
  const table = action?.checker;
  const [value, setValue] = useState(table?.denominations.at(-1)?.value ?? '');
  const [date, setDate] = useState<string | null>(table?.denominations.at(-1)?.dates[0]?.label ?? null);
  if (!action || !table) return null;
  const denom = table.denominations.find((d) => d.value === value) ?? table.denominations[0];
  const hit = denom?.dates.find((d) => d.label === date);
  const [now, next] = action.phases;
  const withdrawnNote = now && next ? `Exchange at ${now.label.toLowerCase()} by ${formatDate.short(now.to)}, then ${next.label} until ${formatDate.long(next.to)}.` : `Exchange it by ${formatDate.long(action.deadline)}.`;

  return (
    <Screen>
      <NavBar scrollY={scrollY} title="Check a banknote" left={<BackButton label="Action" />} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: top, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <Txt v="t1" accessibilityRole="header">
            Check a banknote
          </Txt>
          <Txt v="co" c={colors.l2} style={{ marginTop: 4 }}>
            Pick the value, then the date printed on the note.
          </Txt>
        </View>
        <View style={styles.note} accessibilityLabel={`${denom?.value} Rwandan francs, issued ${date ?? 'date not chosen'}`}>
          <Animated.View key={denom?.gradient} entering={FadeIn.duration(350)} style={StyleSheet.absoluteFill}>
            <Gradient name={denom?.gradient ?? 'banknote'} />
          </Animated.View>
          <Txt v="fn" w="600" c="rgba(255,255,255,0.85)">
            Banki Nkuru y’u Rwanda
          </Txt>
          <Txt num c={colors.white} style={{ fontSize: 44, lineHeight: 50, fontWeight: '700', marginTop: 18 }}>
            {denom?.value}
          </Txt>
          <Txt v="fn" c="rgba(255,255,255,0.85)">
            Rwandan francs
          </Txt>
          <View style={styles.dateChip}>
            <Icon name="calendar" size={11} color={colors.l1} />
            <Txt v="fn" num>
              {date ?? 'Issue date'}
            </Txt>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          {table.denominations.map((d) => (
            <Pill key={d.value} label={`Rwf ${d.value}`} on={d.value === value} onPress={() => { setValue(d.value); setDate(null); }} />
          ))}
        </ScrollView>
        <GroupHeader>Issue date</GroupHeader>
        <Group>
          {denom?.dates.map((d) => (
            <Cell
              key={d.label}
              title={d.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: date === d.label }}
              onPress={() => {
                setDate(d.label);
                if (d.withdrawn) haptic.warning();
                else haptic.success();
              }}
              right={<Icon name="check" size={17} color={colors.tint} style={{ opacity: date === d.label ? 1 : 0 }} />}
            />
          ))}
        </Group>
        {hit && (
          <Animated.View key={`${value}-${hit.label}`} entering={ZoomIn.springify().damping(14)} style={styles.result} accessibilityLiveRegion="polite">
            <View style={[styles.resultIcon, { backgroundColor: hit.withdrawn ? colors.red : colors.green }]}>
              <Icon name={hit.withdrawn ? 'xmark' : 'check'} size={28} color={colors.white} />
            </View>
            <Txt v="t2" center style={{ marginTop: 12 }}>
              {hit.withdrawn ? 'Withdrawn' : 'Still valid'}
            </Txt>
            <Txt v="co" c={colors.l2} center style={{ marginTop: 4 }}>
              {hit.withdrawn ? withdrawnNote : 'Keep using it. Nothing to do.'}
            </Txt>
            {hit.withdrawn && <Button label="Track the exchange" variant="tinted" style={{ marginTop: 16 }} onPress={() => router.push({ pathname: '/track/[id]', params: { id: action.id } })} />}
          </Animated.View>
        )}
        <View style={styles.source}>
          <Icon name="shield" size={13} color={colors.green} />
          <Txt v="fn" c={colors.l2}>
            {table.source}
          </Txt>
        </View>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: 18, marginHorizontal: 16, height: 190, borderRadius: 18, overflow: 'hidden', padding: 18, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' },
  dateChip: { position: 'absolute', left: 18, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.95)' },
  pills: { gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  result: { marginTop: 22, marginHorizontal: 16, padding: 20, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center' },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 32, paddingTop: 10 },
  resultIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
