import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Situation } from '@/data/schema';
import { useInstitutions, useToday } from '@/features/data';
import { formatDate } from '@/lib/dates';
import { toHref } from '@/lib/links';
import { Gradient, Initials, Pill, Tile } from '@/ui/atoms';
import { Icon, type IconName } from '@/ui/icon';
import { Cell, Group, INSET, SectionTitle } from '@/ui/list';
import { LargeTitle, NavBar, Screen, useScrollY } from '@/ui/nav';
import { PressableScale } from '@/ui/pressable';
import { Txt } from '@/ui/text';
import { colors, type GradientName, type Swatch } from '@/ui/theme';

const SITUATIONS: { id: Exclude<Situation, 'general' | 'parent'>; label: string; icon: IconName }[] = [
  { id: 'driver', label: 'Driving', icon: 'car' },
  { id: 'student', label: 'Studying', icon: 'graduation' },
  { id: 'business', label: 'Business', icon: 'briefcase' },
  { id: 'abroad', label: 'Abroad', icon: 'plane' },
];

const SECTORS: { label: string; icon: IconName; color: Swatch; query: string; ids: string[] }[] = [
  { label: 'Finance and tax', icon: 'bank', color: 'green', query: 'tax', ids: ['bnr', 'rra', 'rdb', 'rsb'] },
  { label: 'Education', icon: 'graduation', color: 'teal', query: 'exam', ids: ['nesa', 'hec', 'reb', 'mineduc'] },
  { label: 'Health', icon: 'heart', color: 'red', query: 'health', ids: ['rbc'] },
  { label: 'Transport and roads', icon: 'car', color: 'orange', query: 'road', ids: ['rnp', 'rtda', 'cok', 'rura'] },
  { label: 'ID and civil registration', icon: 'idCard', color: 'indigo', query: 'digital id', ids: ['nida', 'dgie'] },
];

export default function Explore() {
  const top = useSafeAreaInsets().top;
  const { width } = useWindowDimensions();
  const { scrollY, onScroll } = useScrollY();
  const api = useApi();
  const today = useToday();
  const [sit, setSit] = useState<(typeof SITUATIONS)[number]['id']>('driver');
  const { data: institutions } = useInstitutions();
  const calendar = useQuery(q.calendar(api));
  const roads = useQuery(q.roads(api));
  const rates = useQuery(q.rates(api));
  const next = calendar.data?.filter((e) => e.date >= today && e.from).sort((a, b) => a.date.localeCompare(b.date))[0];
  const active = roads.data?.advisories.filter((a) => a.status !== 'upcoming').length;
  const usd = rates.data?.fx[0];

  const tools: { label: string; live: string; href: Href; icon: IconName; bg: GradientName }[] = [
    { label: 'Calendar', live: next ? `${next.title} ${formatDate.weekdayShort(next.date).split(' ')[0]}` : '', href: '/calendar', icon: 'calendar', bg: 'calendar' },
    { label: 'Roads', live: active === undefined ? '' : `${active} active`, href: '/traffic', icon: 'map', bg: 'roads' },
    { label: 'Rates', live: usd ? `${usd.code} ${Math.round(usd.value).toLocaleString('en-GB')}` : '', href: '/rates', icon: 'chart', bg: 'rates' },
    { label: 'Laws', live: 'RRA · BNR', href: toHref({ kind: 'regulation', id: 'tax-procedures' }), icon: 'doc', bg: 'law' },
    { label: 'Directory', live: 'Offices', href: toHref({ kind: 'directory', id: 'emb-be' }), icon: 'bank', bg: 'directory' },
    { label: 'Is this true?', live: 'Beta', href: '/is-this-true', icon: 'bubble', bg: 'truth' },
  ];
  const rows = (institutions ?? []).filter((i) => i.situations.includes(sit)).slice(0, 4);
  const card = (width - 32 - 10) / 2;

  return (
    <Screen>
      <NavBar scrollY={scrollY} title="Explore" />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: top, paddingBottom: 110 }}>
        <LargeTitle title="Explore" scrollY={scrollY} />
        <View style={{ paddingHorizontal: 16 }}>
          <PressableScale accessibilityRole="search" accessibilityLabel="Search notices, laws, letters, offices" onPress={() => router.push('/search')} style={styles.search}>
            <Icon name="search" size={17} color={colors.l2} />
            <Txt c={colors.l2}>Notices, laws, letters, offices</Txt>
          </PressableScale>
        </View>
        <View style={styles.tools}>
          {tools.map((t) => (
            <PressableScale key={t.label} feedback="tap" accessibilityRole="button" accessibilityLabel={`${t.label}. ${t.live}`} onPress={() => router.push(t.href)} style={[styles.tool, { width: card }]}>
              <Gradient name={t.bg} />
              <View style={styles.toolTop}>
                <Icon name={t.icon} size={26} color={colors.white} />
                <Txt v="c1" num c="rgba(255,255,255,0.85)" style={{ textAlign: 'right', maxWidth: 100 }} numberOfLines={2}>
                  {t.live}
                </Txt>
              </View>
              <Txt v="hl" c={colors.white}>
                {t.label}
              </Txt>
            </PressableScale>
          ))}
        </View>

        <SectionTitle title="By life situation" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          {SITUATIONS.map((s) => (
            <Pill key={s.id} label={s.label} icon={s.icon} on={sit === s.id} onPress={() => setSit(s.id)} />
          ))}
        </ScrollView>
        <Animated.View key={sit} entering={FadeIn} style={{ marginTop: 12 }}>
          <Group inset={INSET.avatar}>
            {rows.map((r) => (
              <Cell key={r.id} left={<Initials label={r.mono} color={r.color} />} title={r.name} subtitle={r.why} chevron onPress={() => router.push(toHref({ kind: 'institution', id: r.id }))} />
            ))}
          </Group>
        </Animated.View>

        <SectionTitle title="Sectors" />
        <Group inset={INSET.tile}>
          {SECTORS.map((s) => (
            <Cell key={s.label} left={<Tile icon={s.icon} color={s.color} />} title={s.label} detail={String(s.ids.length)} chevron onPress={() => router.push({ pathname: '/search', params: { q: s.query } })} />
          ))}
          <Cell left={<Tile icon="globe" color="purple" />} title="Embassies abroad" chevron onPress={() => router.push(toHref({ kind: 'directory', id: 'emb-be' }))} />
        </Group>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { height: 38, borderRadius: 10, backgroundColor: colors.fill, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 18, paddingHorizontal: 16 },
  tool: { height: 96, borderRadius: 18, overflow: 'hidden', paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'space-between' },
  toolTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pills: { gap: 8, paddingHorizontal: 16 },
});
