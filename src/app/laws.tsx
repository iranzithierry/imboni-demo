import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Regulation, RegulationStatus } from '@/data/schema';
import { useInstitutionLookup, useToday } from '@/features/data';
import { regulationStatusLabel } from '@/features/labels';
import { daysBetween, formatDate } from '@/lib/dates';
import { toHref } from '@/lib/links';
import { IconTile, Skeleton, Tag } from '@/ui/atoms';
import { Chip } from '@/ui/button';
import { Group, GroupNote, INSET, Row } from '@/ui/list';
import { Photo } from '@/ui/photo';
import { EmptyState, RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { GUTTER, motion, radius, useColors } from '@/ui/theme';

type Filter = 'all' | RegulationStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'in_force', label: 'In force' },
  { value: 'amended', label: 'Amended' },
  { value: 'repealed', label: 'Repealed' },
];
// Upcoming laws first: they are the ones that still change something for people.
const ORDER: Record<RegulationStatus, number> = { upcoming: 0, amended: 1, in_force: 2, repealed: 3 };

export default function Laws() {
  const colors = useColors();
  const regulations = useQuery(q.regulations(useApi()));
  const lookup = useInstitutionLookup();
  const today = useToday();
  const [filter, setFilter] = useState<Filter>('all');
  const list = [...(regulations.data ?? [])].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.published.localeCompare(a.published));
  const shown = list.filter((r) => filter === 'all' || r.status === filter);
  const count = (f: Filter) => list.filter((r) => f === 'all' || r.status === f).length;

  const when = (r: Regulation) => {
    const days = daysBetween(today, r.inForce);
    if (r.status === 'upcoming') return days > 0 ? `In force ${formatDate.long(r.inForce)} · in ${days} days` : `In force ${formatDate.long(r.inForce)}`;
    if (r.status === 'repealed') return `Published ${formatDate.long(r.published)}`;
    return `In force since ${formatDate.long(r.inForce)}`;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Laws', headerLargeTitleEnabled: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 40 }}>
        <Photo id="parliament" aspect={2} radius={radius.lg} style={styles.banner} />
        <Txt v="callout" c={colors.ink2} style={styles.intro}>
          Laws, orders and directives from the Official Gazette, each with what changes for you and its status over time.
        </Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.filter((f) => f.value === 'all' || count(f.value) > 0).map((f) => (
            <Chip key={f.value} label={f.label} count={regulations.data ? count(f.value) : undefined} selected={filter === f.value} onPress={() => setFilter(f.value)} />
          ))}
        </ScrollView>

        {regulations.isError && !regulations.data ? (
          <RetryLine label="Laws" error={regulations.error} onRetry={() => regulations.refetch()} style={{ marginTop: 20 }} />
        ) : !regulations.data ? (
          <View style={styles.px}>
            <Skeleton width="100%" height={300} r={radius.lg} style={{ marginTop: 20 }} />
          </View>
        ) : shown.length === 0 ? (
          <EmptyState icon="law" title="Nothing with this status" body="Laws appear here as soon as the Official Gazette publishes them." />
        ) : (
          <Animated.View layout={LinearTransition.duration(motion.base)} style={{ marginTop: 20 }}>
            <Group inset={INSET.tile}>
              {shown.map((r) => {
                const status = regulationStatusLabel(r.status);
                return (
                  <Row
                    key={r.id}
                    align="top"
                    left={<IconTile icon="law" tone="indigo" />}
                    chevron
                    accessibilityLabel={`${r.instrument}, ${status.label}. ${r.title.EN}. ${when(r)}. ${lookup(r.institutionId).name}.`}
                    onPress={() => router.push(toHref({ kind: 'regulation', id: r.id }))}>
                    <Txt v="caption" c={colors.ink2}>{`${r.instrument} · ${lookup(r.institutionId).mono}`}</Txt>
                    <Txt v="callout" w="semibold" style={{ marginTop: 2 }}>
                      {r.title.EN}
                    </Txt>
                    <Txt v="footnote" c={colors.ink2} num style={{ marginTop: 2 }}>
                      {when(r)}
                    </Txt>
                    <Tag label={status.label} tone={status.tone} icon={status.icon} style={{ marginTop: 8 }} />
                  </Row>
                );
              })}
            </Group>
            <GroupNote>Summaries are not legal advice. The text in the Official Gazette settles any doubt.</GroupNote>
          </Animated.View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: GUTTER, marginTop: 4 },
  intro: { paddingHorizontal: GUTTER, paddingTop: 16 },
  px: { paddingHorizontal: GUTTER },
  chips: { gap: 8, paddingHorizontal: GUTTER, paddingTop: 18 },
});
