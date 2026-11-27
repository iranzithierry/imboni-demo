import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Language, Regulation } from '@/data/schema';
import { useInstitutionLookup, useToday } from '@/features/data';
import { regulationStatusLabel } from '@/features/labels';
import { useMenu } from '@/features/record/menu';
import { FieldStrip, ProvenanceLabel } from '@/features/record/parts';
import { daysBetween, formatDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { copyLink } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import { Card, IconTile, Tag } from '@/ui/atoms';
import { Button, TextAction } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Group, GroupLabel, GroupNote, INSET, Row, SectionHeader } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { Dock, HeaderActions, useDockInset, useHeroTitle, useScrollY } from '@/ui/nav';
import { Highlight } from '@/ui/pressable';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

const LANGUAGE_NAME: Record<Language, string> = { EN: 'English', FR: 'French', RW: 'Kinyarwanda' };
// The Gazette publishes all three versions; Kinyarwanda is the one the others are checked against.
const ORIGINAL: Language = 'RW';

export default function RegulationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reg = useQuery(q.regulation(useApi(), id));
  if (!reg.data) {
    return reg.isPending ? null : <ErrorScreen error={reg.error} onRetry={() => reg.refetch()} />;
  }
  return <RegulationView r={reg.data} />;
}

function RegulationView({ r }: { r: Regulation }) {
  const colors = useColors();
  const styles = useStyles();
  const api = useApi();
  const bottom = useDockInset();
  const { scrollY, onScroll } = useScrollY();
  const today = useToday();
  const inst = useInstitutionLookup()(r.institutionId);
  const all = useQuery(q.regulations(api));
  const storylines = useQuery({ ...q.storylines(api), enabled: Boolean(r.storylineId) });
  const preferred = usePrefs((s) => s.contentLanguage);
  const [lang, setLang] = useState<Language>(preferred);
  const followingStory = usePrefs((s) => (r.storylineId ? (s.storylines[r.storylineId] ?? 'off') !== 'off' : false));
  const followingInst = usePrefs((s) => (s.follows[r.institutionId] ?? 'off') !== 'off');
  const setStorylineLevel = usePrefs((s) => s.setStorylineLevel);
  const setFollow = usePrefs((s) => s.setFollow);
  const menu = useMenu();
  const toast = useToast();

  const status = regulationStatusLabel(r.status);
  const toForce = daysBetween(today, r.inForce);
  const replacedBy = all.data?.find((x) => x.replacesId === r.id);
  const storyline = storylines.data?.find((s) => s.id === r.storylineId);
  const showingOriginal = lang === ORIGINAL;
  const translatedTo: Language = preferred === ORIGINAL ? 'EN' : preferred;
  const following = r.storylineId ? followingStory : followingInst;
  useHeroTitle(scrollY, 70, r.title[lang]);

  const toggleFollow = () => {
    haptic.selection();
    if (r.storylineId) setStorylineLevel(r.storylineId, followingStory ? 'off' : 'important');
    else setFollow(r.institutionId, followingInst ? null : 'important');
  };
  const report = (field: string) => router.push({ pathname: '/report/[id]', params: { id: r.id, field } });
  const moreItems = [
    { label: 'Copy link', icon: 'link' as const, onPress: () => copyLink({ kind: 'regulation', id: r.id }).then(() => toast({ message: 'Link copied', icon: 'link' })).catch(() => undefined) },
    { label: 'Report the whole item', icon: 'flag' as const, onPress: () => report('Whole item') },
    { label: 'Report the in-force date', icon: 'calendar' as const, onPress: () => report('In force date') },
    { label: 'Report a translation', icon: 'translate' as const, onPress: () => report('Translation') },
  ];

  return (
    <View style={{ flex: 1 }}>
      <HeaderActions
        actions={[
          { icon: 'share', label: 'Share', onPress: () => router.push({ pathname: '/share/[id]', params: { id: r.id, kind: 'regulation' } }) },
          { icon: 'more', label: 'More', onPress: () => menu(moreItems, r.title.EN), menu: moreItems },
        ]}
      />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: 8, paddingBottom: bottom }}>
        <View style={styles.head}>
          <Highlight accessibilityRole="link" accessibilityLabel={`From ${inst.name}`} onPress={() => router.push(toHref({ kind: 'institution', id: r.institutionId }))} style={styles.from}>
            <InstitutionLogo id={inst.id} label={inst.mono} size="s" />
            <Txt v="footnote" w="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {inst.name}
            </Txt>
          </Highlight>
          <View style={styles.tags}>
            <Tag label={r.instrument} tone="indigo" icon="law" />
            <Tag label={status.label} tone={status.tone} icon={status.icon} />
          </View>
          <Animated.View key={lang} entering={FadeIn.duration(motion.base)}>
            <Txt v="title1" style={{ marginTop: 14 }} accessibilityRole="header">
              {r.title[lang]}
            </Txt>
          </Animated.View>
          <View style={styles.language}>
            <Icon name="translate" size={14} color={colors.ink2} />
            <Txt v="footnote" c={colors.ink2} style={{ flex: 1 }}>
              {showingOriginal ? 'Original, as published in the Official Gazette' : `Reviewed translation into ${LANGUAGE_NAME[lang]}`}
            </Txt>
            <TextAction label={showingOriginal ? `Show ${LANGUAGE_NAME[translatedTo]}` : 'Show original'} icon={null} color={colors.ink} onPress={() => setLang(showingOriginal ? translatedTo : ORIGINAL)} />
          </View>
          <Txt v="footnote" c={colors.ink3} num style={{ marginTop: 6 }}>
            {r.reference}
          </Txt>
          <Txt v="callout" c={colors.ink2} style={{ marginTop: 16 }}>
            {r.summary}
          </Txt>
        </View>

        <FieldStrip
          fields={[
            { label: 'Published', value: formatDate.long(r.published) },
            { label: 'In force', value: formatDate.long(r.inForce) },
            r.status === 'upcoming' && toForce > 0 ? { label: 'Starts in', value: `${toForce} days` } : { label: 'Status', value: status.label },
          ]}
          style={styles.strip}
        />

        {r.changes.length > 0 && (
          <>
            <SectionHeader title="What changes for you" caption={r.audience} icon="law" />
            <Group inset={INSET.check}>
              {r.changes.map((c, i) => (
                <Row key={c} align="top" left={<View style={styles.number}><Txt v="footnote" w="medium" num>{String(i + 1)}</Txt></View>}>
                  <Txt v="callout">{c}</Txt>
                </Row>
              ))}
            </Group>
          </>
        )}

        <Card radiusSize="lg" style={styles.note}>
          <Icon name="info" size={18} color={colors.ink} />
          <Txt v="footnote" c={colors.ink2} style={{ flex: 1 }}>{`A summary, not legal advice. Check the full text in the Official Gazette or ask ${inst.mono} before you act.`}</Txt>
        </Card>

        <GroupLabel>Status over time</GroupLabel>
        <Group inset={INSET.tile}>
          <Row left={<IconTile icon="check" tone="ok" />} title="Published in the Official Gazette" subtitle={formatDate.long(r.published)} />
          <Row
            left={<IconTile icon={toForce > 0 ? 'clock' : 'check'} tone={toForce > 0 ? 'warn' : 'ok'} />}
            title={toForce > 0 ? 'Comes into force' : 'In force'}
            subtitle={toForce > 0 ? `${formatDate.long(r.inForce)} · in ${toForce} days` : `Since ${formatDate.long(r.inForce)}`}
          />
          {r.status === 'amended' && <Row left={<IconTile icon="refresh" tone="warn" />} title="Amended" subtitle={r.storylineId ? 'See the storyline for each change' : 'A later instrument changed part of it'} chevron={Boolean(r.storylineId)} onPress={r.storylineId ? () => router.push(toHref({ kind: 'storyline', id: r.storylineId ?? '' })) : undefined} />}
          {r.status === 'repealed' && <Row left={<IconTile icon="xmark" />} title="Repealed" subtitle="Kept for history" />}
        </Group>

        {(r.replacesId || replacedBy || r.storylineId) && (
          <>
            <GroupLabel>Related</GroupLabel>
            <Group inset={INSET.tile}>
              {r.replacesId && <Row left={<IconTile icon="law" tone="indigo" />} title="Replaces" subtitle={r.replacesTitle} chevron onPress={() => router.push(toHref({ kind: 'regulation', id: r.replacesId ?? '' }))} />}
              {replacedBy && <Row left={<IconTile icon="law" tone="indigo" />} title="Replaced by" subtitle={`${replacedBy.title.EN} · from ${formatDate.long(replacedBy.inForce)}`} chevron onPress={() => router.push(toHref({ kind: 'regulation', id: replacedBy.id }))} />}
              {r.storylineId && <Row left={<IconTile icon="list" tone="violet" />} title={storyline ? `Storyline: ${storyline.title}` : 'Storyline'} subtitle={storyline?.latest} chevron onPress={() => router.push(toHref({ kind: 'storyline', id: r.storylineId ?? '' }))} />}
            </Group>
          </>
        )}

        <View style={styles.provenance}>
          <ProvenanceLabel provenance="reviewed" institution={inst.name} source="Official Gazette" at={r.published} />
        </View>
        <GroupNote>Laws always go to a coordinator before they appear here. The Gazette copy wins over any post.</GroupNote>
      </Animated.ScrollView>
      <Dock>
        <Button
          label={r.storylineId ? (following ? 'Following updates to this law' : 'Follow updates to this law') : following ? `Following ${inst.mono}` : `Follow ${inst.mono}`}
          icon={following ? 'check' : 'plus'}
          variant={following ? 'secondary' : 'primary'}
          accessibilityHint={r.storylineId ? 'Tells you when this law changes status or is amended' : `Follows ${inst.name}`}
          onPress={toggleFollow}
        />
      </Dock>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  head: { paddingHorizontal: GUTTER + 4 },
  from: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  language: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  strip: { marginHorizontal: GUTTER, marginTop: 20 },
  number: { width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  note: { marginHorizontal: GUTTER, marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, backgroundColor: colors.canvas },
  provenance: { paddingHorizontal: GUTTER + 4, paddingTop: 20 },
}));
