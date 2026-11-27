import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Sector } from '@/data/schema';
import { useInstitutions, useToday } from '@/features/data';
import { SECTORS, SITUATIONS } from '@/features/labels';
import { daysBetween, formatDate } from '@/lib/dates';
import { toHref } from '@/lib/links';
import { usePrefs } from '@/state/prefs';
import { IconTile, Skeleton, Tag } from '@/ui/atoms';
import { TextAction } from '@/ui/button';
import { FeatureIcon, type FeatureIconName } from '@/illustrations/icons';
import { Icon } from '@/ui/icon';
import { Group, INSET, Row, SectionHeader } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { BarTitle, useColumnWidth } from '@/ui/nav';
import { Photo, hasPhoto } from '@/ui/photo';
import { Highlight, PressableScale } from '@/ui/pressable';
import { RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, featureColors, GUTTER, radius, solidHue, useColors, type Hue } from '@/ui/theme';

type Situation = keyof typeof SITUATIONS;
const SITUATION_ORDER: Situation[] = ['driver', 'business', 'parent', 'student', 'abroad'];
// Row padding + 56 pt cover + gap, so dividers start where the text does.
const STORY_INSET = 16 + 56 + 12;
const SECTOR_INSET = 16 + 44 + 12;

/** Live value for a tool: undefined while loading, null when its module failed. */
type Live = string | null | undefined;

export default function Explore() {
  const colors = useColors();
  const styles = useStyles();
  const [toolsWidth, setToolsWidth] = useState(useColumnWidth() - GUTTER * 2);
  const api = useApi();
  const today = useToday();
  const institutions = useInstitutions();
  const calendar = useQuery(q.calendar(api));
  const roads = useQuery(q.roads(api));
  const rates = useQuery(q.rates(api));
  const regulations = useQuery(q.regulations(api));
  const storylines = useQuery(q.storylines(api));
  const follows = usePrefs((s) => s.follows);
  const followedStorylines = usePrefs((s) => s.storylines);

  const next = calendar.data?.filter((e) => e.date >= today && e.state !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date))[0];
  const active = roads.data?.advisories.filter((a) => a.status !== 'upcoming') ?? [];
  const onRoute = roads.data?.advisories.filter((a) => a.onRoute).length ?? 0;
  const usd = rates.data?.fx[0];
  const upcomingLaws = regulations.data?.filter((r) => r.status === 'upcoming').length ?? 0;
  const live = <T,>(query: { data: T | undefined; isError: boolean }, text: (d: T) => string): Live => (query.data !== undefined ? text(query.data) : query.isError ? null : undefined);

  const tools: { label: string; art: FeatureIconName; hue: Hue; href: Href; live: Live }[] = [
    { label: 'Calendar', art: 'calendar', hue: 'sky', href: '/calendar', live: live(calendar, () => (next ? `${next.title} · ${daysBetween(today, next.date) === 0 ? 'today' : formatDate.weekdayShort(next.date)}` : 'Nothing scheduled')) },
    { label: 'Roads', art: 'roads', hue: 'amber', href: '/traffic', live: live(roads, () => `${active.length} active${onRoute ? ` · ${onRoute} on your route` : ''}`) },
    { label: 'Rates', art: 'rates', hue: 'green', href: '/rates', live: live(rates, () => (usd ? `USD ${usd.value.toLocaleString('en-GB', { maximumFractionDigits: 0 })} today` : 'BNR reference rates')) },
    { label: 'Laws', art: 'laws', hue: 'indigo', href: '/laws' as Href, live: live(regulations, (list) => `${upcomingLaws} upcoming · ${list.length} on record`) },
    { label: 'Directory', art: 'directory', hue: 'teal', href: '/institutions' as Href, live: live(institutions, (list) => `${list.length} institutions`) },
    { label: 'Note checker', art: 'notes', hue: 'violet', href: { pathname: '/note-checker/[id]', params: { id: 'banknotes' } }, live: 'Withdrawn or still valid' },
  ];
  const card = Math.floor((toolsWidth - 10) / 2);

  const catalog = institutions.data ?? [];
  const isFollowed = (id: string) => (follows[id] ?? 'off') !== 'off';
  const top = [...catalog].sort((a, b) => Number(isFollowed(b.id)) - Number(isFollowed(a.id))).slice(0, 5);
  const sectorCounts = (Object.keys(SECTORS) as Sector[]).map((s) => ({ sector: s, count: catalog.filter((i) => i.sector === s).length })).filter((s) => s.count > 0);

  return (
    <>
      <BarTitle title="Explore" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.px}>
          <Highlight accessibilityRole="search" accessibilityLabel="Search notices, laws, letters and offices" onPress={() => router.push('/search')} pressedStyle={{ backgroundColor: colors.pressed }} style={styles.search}>
            <Icon name="search" size={17} color={colors.ink2} />
            <Txt v="callout" c={colors.ink2} style={{ flex: 1 }}>
              Notices, laws, letters, offices
            </Txt>
          </Highlight>
        </View>

        <SectionHeader title="Tools" icon="sliders" top={24} />
        <View style={styles.tools} onLayout={(e) => setToolsWidth(e.nativeEvent.layout.width - GUTTER * 2)}>
          {tools.map((t) => (
            <ToolCard key={t.label} width={card} {...t} onPress={() => router.push(t.href)} />
          ))}
          <PressableScale accessibilityRole="button" accessibilityLabel="Is this true? Check a forwarded message against official records" onPress={() => router.push('/is-this-true')} style={[styles.tool, styles.truth]}>
            <View style={styles.truthArt}>
              <FeatureIcon name="truth" size={48} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="headline">Is this true?</Txt>
              <Txt v="footnote" c={colors.ink2}>
                Paste a forwarded message. Imboni compares it with official records and never calls anything false without an official source.
              </Txt>
            </View>
            <Icon name="chevronRight" size={13} color={colors.ink3} weight="semibold" />
          </PressableScale>
        </View>

        <SectionHeader title="Life situations" icon="people" caption="Who you are, mapped to the institutions that affect you" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.situations}>
          {SITUATION_ORDER.map((id) => {
            const s = SITUATIONS[id];
            const count = catalog.filter((i) => i.situations.includes(id)).length;
            return (
              <PressableScale key={id} accessibilityRole="button" accessibilityLabel={`${s.label}. ${count} institutions`} onPress={() => router.push({ pathname: '/situation/[id]', params: { id } } as Href)} style={styles.situation}>
                <View>
                  <Photo id={s.photo} aspect={3 / 4} radius={radius.lg} />
                  <View style={[styles.situationBadge, { backgroundColor: solidHue(s.hue) }]}>
                    <Icon name={s.icon} size={15} color={colors.white} weight="semibold" />
                  </View>
                </View>
                <Txt v="callout" w="medium" numberOfLines={1} style={{ marginTop: 10 }}>
                  {s.short}
                </Txt>
                <Txt v="footnote" c={colors.ink2} numberOfLines={1} num>
                  {institutions.data ? `${count} institutions` : ' '}
                </Txt>
              </PressableScale>
            );
          })}
        </ScrollView>

        <SectionHeader title="Storylines" icon="list" caption="Threads of related notices, with only what changed" />
        {storylines.isError && !storylines.data ? (
          <RetryLine label="Storylines" error={storylines.error} onRetry={() => storylines.refetch()} />
        ) : !storylines.data ? (
          <View style={styles.px}>
            <Skeleton width="100%" height={140} r={radius.lg} />
          </View>
        ) : (
          <Group inset={STORY_INSET}>
            {storylines.data.map((s) => {
              const following = (followedStorylines[s.id] ?? 'off') !== 'off';
              return (
                <Row
                  key={s.id}
                  left={hasPhoto(s.cover) ? <Photo id={s.cover} aspect={1} radius={radius.md} style={styles.thumb} /> : <IconTile icon={s.icon} size={56} tone="violet" />}
                  title={s.title}
                  subtitle={s.latest}
                  right={following ? <Tag label="Following" tone="outline" icon="check" /> : undefined}
                  chevron
                  accessibilityLabel={`Storyline, ${s.title}. Latest: ${s.latest}.${following ? ' Following.' : ''}`}
                  onPress={() => router.push(toHref({ kind: 'storyline', id: s.id }))}
                />
              );
            })}
          </Group>
        )}

        <SectionHeader title="Sectors" icon="layers" />
        {institutions.isError && !institutions.data ? (
          <RetryLine label="Institutions" error={institutions.error} onRetry={() => institutions.refetch()} />
        ) : (
          <Group inset={SECTOR_INSET}>
            {sectorCounts.map(({ sector, count }) => (
              <Row
                key={sector}
                left={
                  <View style={[styles.sectorArt, { backgroundColor: featureColors(colors, SECTORS[sector].hue).bg }]}>
                    <FeatureIcon name={SECTORS[sector].art} size={34} />
                  </View>
                }
                title={SECTORS[sector].label}
                detail={String(count)}
                chevron
                accessibilityLabel={`${SECTORS[sector].label}, ${count} institutions`}
                onPress={() => router.push({ pathname: '/institutions', params: { sector } } as Href)}
              />
            ))}
          </Group>
        )}

        <SectionHeader title="Institutions" icon="bank" accessory={<TextAction label="All" onPress={() => router.push('/institutions' as Href)} />} />
        {institutions.data && (
          <Group inset={INSET.mono}>
            {top.map((i) => (
              <Row
                key={i.id}
                left={<InstitutionLogo id={i.id} label={i.mono} />}
                title={i.name}
                subtitle={i.why}
                right={isFollowed(i.id) ? <Tag label="Following" tone="outline" icon="check" /> : undefined}
                chevron
                accessibilityLabel={`${i.name}. ${i.why}.${isFollowed(i.id) ? ' Following.' : ''}`}
                onPress={() => router.push(toHref({ kind: 'institution', id: i.id }))}
              />
            ))}
            <Row left={<IconTile icon="building" size={40} tone="green" />} title="All institutions" detail={String(catalog.length)} chevron onPress={() => router.push('/institutions' as Href)} />
          </Group>
        )}
      </ScrollView>
    </>
  );
}

function ToolCard({ label, art, hue, live, width, onPress }: { label: string; art: FeatureIconName; hue: Hue; live: Live; width: number; onPress: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  const tint = featureColors(colors, hue);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={live ? `${label}. ${live}` : label} onPress={onPress} style={[styles.tool, { width, backgroundColor: tint.bg }]}>
      <FeatureIcon name={art} size={52} />
      <View style={{ marginTop: 'auto' }}>
        <Txt v="headline">{label}</Txt>
        {live === undefined ? (
          <Skeleton width={90} height={12} style={{ marginTop: 5 }} />
        ) : (
          <Txt v="footnote" c={colors.ink2} numberOfLines={1} num>
            {live ?? 'Open to retry'}
          </Txt>
        )}
      </View>
    </PressableScale>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    px: { paddingHorizontal: GUTTER },
    search: { height: 44, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.fill, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginTop: 4 },
    tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: GUTTER },
    tool: { height: 136, padding: 12, paddingTop: 10, borderRadius: radius.lg, borderCurve: 'continuous' },
    truthArt: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    sectorArt: { width: 44, height: 44, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
    truth: { width: '100%', height: undefined, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.fill, paddingVertical: 16 },
    situations: { gap: 12, paddingHorizontal: GUTTER },
    situation: { width: 140 },
    situationBadge: { position: 'absolute', left: 10, bottom: 10, width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    thumb: { width: 56 },
  }),
);
