import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Language } from '@/data/schema';
import { useInstitutionLookup, useToday } from '@/features/data';
import { daysBetween, formatDate } from '@/lib/dates';
import { toHref } from '@/lib/links';
import { usePrefs } from '@/state/prefs';
import { Card, GlassBadge, Gradient, Initials, Tile } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Cell, Group, GroupHeader, INSET, SectionTitle } from '@/ui/list';
import { BackButton, Dock, NavBar, Screen, useDockInset, useNavInset, useScrollY } from '@/ui/nav';
import { Segmented } from '@/ui/segmented';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const LANGS = [
  { value: 'EN', label: 'EN' },
  { value: 'FR', label: 'FR' },
  { value: 'RW', label: 'RW' },
] as const;

export default function RegulationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reg = useQuery(q.regulation(useApi(), id));
  const inst = useInstitutionLookup();
  const today = useToday();
  const { scrollY, onScroll } = useScrollY();
  const top = useNavInset();
  const bottom = useDockInset();
  const preferred = usePrefs((s) => s.contentLanguage);
  const [lang, setLang] = useState<Language>(preferred);
  const following = usePrefs((s) => s.follows[reg.data?.institutionId ?? ''] !== undefined);
  const setFollow = usePrefs((s) => s.setFollow);
  const r = reg.data;
  if (!r) return <Screen>{reg.isPending ? null : <ErrorScreen error={reg.error} onRetry={() => reg.refetch()} />}</Screen>;

  const toForce = daysBetween(today, r.inForce);
  // Progress along published → in force → amended.
  const progress = toForce <= 0 ? 0.5 : Math.min(0.5, (daysBetween(r.published, today) / Math.max(1, daysBetween(r.published, r.inForce))) * 0.5);
  const steps = [
    { label: 'Published', date: formatDate.long(r.published), done: true },
    { label: 'In force', date: formatDate.long(r.inForce), done: toForce <= 0 },
    { label: r.status === 'repealed' ? 'Repealed' : 'Amended', date: r.status === 'repealed' ? 'Yes' : 'None yet', done: r.status === 'repealed' },
  ];

  return (
    <Screen>
      <NavBar
        scrollY={scrollY}
        left={<BackButton label={inst(r.institutionId).mono} />}
        center={
          <View style={{ width: 132 }}>
            <Segmented accessibilityLabel="Language" options={LANGS} value={lang} onChange={setLang} />
          </View>
        }
      />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: top + 10, paddingBottom: bottom }}>
        <View style={styles.hero}>
          <Gradient name="law" />
          <View style={styles.between}>
            <Tile icon="doc" color="indigo" size="m" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <GlassBadge label={r.status === 'upcoming' ? `In force in ${toForce} days` : r.status === 'in_force' ? 'In force' : 'Repealed'} icon="clock" />
          </View>
          <Txt v="fn" num c="rgba(255,255,255,0.8)" style={{ marginTop: 16 }}>
            {r.reference}
          </Txt>
          <Animated.View key={lang} entering={FadeIn}>
            <Txt v="t1" c={colors.white} style={{ marginTop: 4 }} accessibilityRole="header">
              {r.title[lang]}
            </Txt>
            {lang === 'RW' && (
              <Txt v="fn" c="rgba(255,255,255,0.85)" style={{ marginTop: 6 }}>
                Original language. Published in Kinyarwanda, English and French.
              </Txt>
            )}
          </Animated.View>
          <View style={styles.timeline}>
            <View style={styles.track} />
            <View style={[styles.track, styles.fill, { width: `${progress * 66}%` }]} />
            {steps.map((s) => (
              <View key={s.label} style={{ flex: 1 }}>
                <View style={[styles.dot, s.done ? { backgroundColor: colors.white } : { borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: colors.indigo }]} />
                <Txt v="c1" w="600" c={colors.white} style={{ marginTop: 8, opacity: s.done || s.label === 'In force' ? 1 : 0.7 }}>
                  {s.label}
                </Txt>
                <Txt v="c1" num c="rgba(255,255,255,0.8)">
                  {s.date}
                </Txt>
              </View>
            ))}
          </View>
        </View>

        {r.changes.length > 0 && (
          <>
            <SectionTitle title="What changes for you" />
            <Txt v="fn" c={colors.l2} style={{ paddingHorizontal: 20, marginTop: -4, marginBottom: 10 }}>
              {r.audience}
            </Txt>
            <Group inset={INSET.radio}>
              {r.changes.map((c, i) => (
                <Cell key={c} align="top" left={<Initials label={String(i + 1)} color="indigo" size="s" />} title={c} />
              ))}
            </Group>
          </>
        )}
        <Card style={styles.note}>
          <Icon name="info" size={20} color={colors.tint} />
          <Txt v="fn" style={{ flex: 1 }}>{`A summary, not legal advice. Check the full text or ask ${inst(r.institutionId).mono} before you act.`}</Txt>
        </Card>

        <GroupHeader>Documents</GroupHeader>
        <Group inset={INSET.tile}>
          <Cell left={<Tile icon="doc" color="red" />} title="Full text" subtitle="Official Gazette · PDF link pending" />
          {r.replacesId && <Cell left={<Tile icon="swap" color="gray" />} title="Replaces" subtitle={r.replacesTitle} chevron onPress={() => router.push(toHref({ kind: 'regulation', id: r.replacesId ?? '' }))} />}
        </Group>
        <View style={styles.reviewed}>
          <Icon name="shield" size={13} color={colors.green} />
          <Txt v="fn" c={colors.l2}>
            Reviewed · the Gazette copy wins over any post
          </Txt>
        </View>
      </Animated.ScrollView>
      <Dock row>
        <View style={{ flex: 1 }}>
          <Button label={following ? 'Following' : 'Follow'} icon={following ? 'check' : 'plus'} variant="grayInk" onPress={() => setFollow(r.institutionId, following ? null : 'important')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Share" icon="share" onPress={() => router.push({ pathname: '/share/[id]', params: { id: r.id, kind: 'regulation' } })} />
        </View>
      </Dock>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginHorizontal: 16, borderRadius: 22, overflow: 'hidden', padding: 20 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeline: { flexDirection: 'row', marginTop: 20 },
  track: { position: 'absolute', top: 6, left: 6, right: '33%', height: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  fill: { right: undefined, backgroundColor: colors.white },
  dot: { width: 14, height: 14, borderRadius: 7 },
  note: { marginTop: 12, padding: 14, flexDirection: 'row', gap: 10, backgroundColor: 'rgba(10,82,233,0.08)' },
  reviewed: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 32, paddingTop: 8 },
});
