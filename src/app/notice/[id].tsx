import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Language, Notice } from '@/data/schema';
import { useInstitutionLookup, useNotice, useStorylines } from '@/features/data';
import { useMenu } from '@/features/record/menu';
import { FieldRow, ProvenanceLabel } from '@/features/record/parts';
import { formatDate, formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { shareText } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import { IconTile, Tag } from '@/ui/atoms';
import { Button, IconButton } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Group, GroupLabel, INSET, Row } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { Dock, HeaderActions, PhotoStatusBar, useDockInset, useHeroTitle, useScrollY } from '@/ui/nav';
import { Photo, hasPhoto } from '@/ui/photo';
import { Highlight } from '@/ui/pressable';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, radius, useColors } from '@/ui/theme';

const LANGUAGE_NAME: Record<Language, string> = { EN: 'English', FR: 'French', RW: 'Kinyarwanda' };

export default function NoticeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notice, error, refetch, isPending } = useNotice(id);
  if (!notice) return isPending ? null : <ErrorScreen error={error ?? new Error('not_found')} onRetry={() => refetch()} />;
  return <NoticeView notice={notice} />;
}

function NoticeView({ notice }: { notice: Notice }) {
  const colors = useColors();
  const styles = useStyles();
  const top = useSafeAreaInsets().top;
  const { width } = useWindowDimensions();
  const bottom = useDockInset();
  const { scrollY, onScroll } = useScrollY();
  const inst = useInstitutionLookup()(notice.institutionId);
  const lang = usePrefs((s) => s.contentLanguage);
  const feed = useQuery(q.feed(useApi()));
  const storyline = useStorylines().data?.find((s) => s.id === notice.storylineId);
  const feedId = feed.data?.find((f) => f.link.kind === 'notice' && f.link.id === notice.id)?.id ?? notice.id;
  const saved = usePrefs((s) => s.saved.includes(feedId));
  const toggleSaved = usePrefs((s) => s.toggleSaved);
  const following = usePrefs((s) => (notice.storylineId ? (s.storylines[notice.storylineId] ?? 'off') !== 'off' : false));
  const setStorylineLevel = usePrefs((s) => s.setStorylineLevel);
  const menu = useMenu();
  const [showOriginal, setShowOriginal] = useState(false);

  const localized = lang !== 'EN' ? notice.i18n[lang] : undefined;
  const useLocal = Boolean(localized) && !showOriginal;
  const title = useLocal && localized ? localized.title : notice.title;
  const summary = useLocal && localized ? localized.summary : notice.summary;
  const photoHero = hasPhoto(notice.photo);
  const heroH = photoHero ? Math.round(Math.min(width, 480) * 0.62) + top : 0;
  const report = (field: string) => router.push({ pathname: '/report/[id]', params: { id: notice.id, field } });
  const titleShown = useHeroTitle(scrollY, photoHero ? heroH - top - 40 : 60, inst.name);
  const moreItems = [
    { label: 'Share', icon: 'share' as const, onPress: () => shareText(notice.title, { kind: 'notice', id: notice.id }).catch(() => undefined) },
    ...(notice.originalId ? [{ label: 'View original', icon: 'doc' as const, onPress: () => router.push(toHref({ kind: 'original', id: notice.originalId ?? '' })) }] : []),
    { label: 'Report a problem', icon: 'flag' as const, onPress: () => report('Whole item') },
  ];

  return (
    <View style={{ flex: 1 }}>
      <PhotoStatusBar overPhoto={photoHero && !titleShown} />
      <HeaderActions
        actions={[
          {
            icon: 'bookmark',
            label: saved ? 'Remove from saved' : 'Save',
            selected: saved,
            onPress: () => {
              haptic.selection();
              toggleSaved(feedId);
            },
          },
          { icon: 'more', label: 'More', onPress: () => menu(moreItems), menu: moreItems },
        ]}
      />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentInsetAdjustmentBehavior={photoHero ? 'never' : 'automatic'} contentContainerStyle={{ paddingBottom: bottom }}>
        {photoHero && (
          <View style={{ height: heroH }}>
            <Photo id={notice.photo} fill />
          </View>
        )}
        <View style={styles.head}>
          <View style={styles.inst}>
            <InstitutionLogo id={inst.id} label={inst.mono} size="s" />
            <Highlight accessibilityRole="link" onPress={() => router.push(toHref({ kind: 'institution', id: inst.id }))} style={{ flex: 1 }}>
              <Txt v="footnote" w="semibold" numberOfLines={1}>
                {inst.name}
              </Txt>
            </Highlight>
            <ProvenanceLabel provenance={notice.provenance} institution={inst.name} source={notice.source.label} at={notice.publishedAt} />
          </View>
          <View style={styles.tags}>
            <Tag label="Notice" tone="sky" icon="megaphone" />
            {notice.topics.map((t) => (
              <Tag key={t} label={t} />
            ))}
          </View>
          <Txt v="title1" style={{ marginTop: 12 }} accessibilityRole="header">
            {title}
          </Txt>
          <Txt v="footnote" c={colors.ink3} num style={{ marginTop: 8 }}>
            {`${formatDate.long(notice.publishedAt.slice(0, 10))}, ${formatTime(notice.publishedAt)} · ${notice.source.label}`}
          </Txt>
          {(localized || notice.originalLanguage !== 'EN') && (
            <Highlight accessibilityRole="button" onPress={() => setShowOriginal((o) => !o)} disabled={!localized} style={styles.translate}>
              <Icon name="translate" size={14} color={colors.ink2} />
              <Txt v="footnote" c={colors.ink2} style={{ flex: 1 }}>
                {localized ? (useLocal ? `Shown in ${LANGUAGE_NAME[lang]}. ` : 'Shown in English. ') : `Published in ${LANGUAGE_NAME[notice.originalLanguage]}; shown in English, AI translation. `}
                {localized && (
                  <Txt v="footnote" w="semibold">
                    {useLocal ? 'Show English' : `Show ${LANGUAGE_NAME[lang]}`}
                  </Txt>
                )}
              </Txt>
            </Highlight>
          )}
          <Txt v="body" style={{ marginTop: 16 }}>
            {summary}
          </Txt>
        </View>

        {notice.fields.length > 0 && (
          <>
            <GroupLabel>Key facts · long-press one to report it</GroupLabel>
            <View style={styles.fields}>
              {notice.fields.map((f, i) => (
                <FieldRow key={f.label} label={f.label} value={f.value} onReport={() => report(f.label)} last={i === notice.fields.length - 1} />
              ))}
            </View>
          </>
        )}

        <View style={styles.body}>
          {notice.body.map((p) => (
            <Txt key={p.slice(0, 24)} v="body" c={colors.ink}>
              {p}
            </Txt>
          ))}
        </View>

        {storyline && (
          <Highlight accessibilityRole="button" onPress={() => router.push(toHref({ kind: 'storyline', id: storyline.id }))} pressedStyle={{ opacity: 0.8 }} style={styles.story}>
            {hasPhoto(storyline.cover) ? <Photo id={storyline.cover} aspect={1} radius={radius.md} style={{ width: 56 }} /> : <IconTile icon="list" size={56} />}
            <View style={{ flex: 1 }}>
              <Txt v="caption" c={colors.ink2}>
                Part of a storyline
              </Txt>
              <Txt v="callout" w="semibold">
                {storyline.title}
              </Txt>
              <Txt v="footnote" c={colors.ink2} numberOfLines={1}>{`${storyline.entries.length} updates · ${storyline.latest}`}</Txt>
            </View>
            <Icon name="chevronRight" size={13} color={colors.pearl} weight="semibold" />
          </Highlight>
        )}

        <GroupLabel>Source</GroupLabel>
        <Group inset={INSET.tile}>
          {notice.originalId && <Row left={<IconTile icon="doc" />} title="View original" subtitle="The post and letter, with each fact highlighted" chevron onPress={() => router.push(toHref({ kind: 'original', id: notice.originalId ?? '' }))} />}
          <Row
            left={<IconTile icon="external" />}
            title={notice.source.label}
            subtitle={notice.source.url ? 'Opens the official source' : 'Official account'}
            chevron={Boolean(notice.source.url)}
            onPress={notice.source.url ? () => WebBrowser.openBrowserAsync(notice.source.url ?? '').catch(() => undefined) : undefined}
          />
          <Row left={<IconTile icon="flag" />} title="Report a problem" subtitle="A date, place, translation or summary" chevron onPress={() => report('Whole item')} />
        </Group>
      </Animated.ScrollView>
      <Dock row>
        <IconButton icon="share" label="Share" size={52} onPress={() => shareText(notice.title, { kind: 'notice', id: notice.id }).catch(() => undefined)} />
        <View style={{ flex: 1 }}>
          {notice.storylineId ? (
            <Button
              label={following ? 'Following storyline' : 'Follow storyline'}
              icon={following ? 'check' : 'plus'}
              variant={following ? 'secondary' : 'primary'}
              onPress={() => {
                haptic.selection();
                setStorylineLevel(notice.storylineId ?? '', following ? 'off' : 'important');
              }}
            />
          ) : (
            <Button label={saved ? 'Saved' : 'Save for later'} icon="bookmark" variant="secondary" onPress={() => toggleSaved(feedId)} />
          )}
        </View>
      </Dock>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  head: { paddingHorizontal: GUTTER, paddingTop: 16 },
  inst: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 },
  translate: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10, borderRadius: radius.sm, backgroundColor: colors.fill },
  fields: { marginHorizontal: GUTTER, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, overflow: 'hidden' },
  body: { paddingHorizontal: GUTTER, paddingTop: 24, gap: 14 },
  story: { marginHorizontal: GUTTER, marginTop: 24, padding: 10, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 12 },
}));
