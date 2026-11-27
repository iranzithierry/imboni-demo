import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StorylineEntry } from '@/data/schema';
import { useInstitutionLookup, useStorylines, useToday } from '@/features/data';
import { useMenu } from '@/features/record/menu';
import { ChangeLine } from '@/features/record/parts';
import { formatDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { shareText } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import type { FollowLevel } from '@/state/schema';
import { IconTile } from '@/ui/atoms';
import { Button, Chip } from '@/ui/button';
import { Icon, type IconName } from '@/ui/icon';
import { InstitutionLogo } from '@/ui/logo';
import { HeaderActions, PhotoStatusBar, useHeroTitle, useScrollY } from '@/ui/nav';
import { Photo, hasPhoto } from '@/ui/photo';
import { Highlight } from '@/ui/pressable';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors, type Hue } from '@/ui/theme';

const LEVELS: { value: FollowLevel; label: string }[] = [
  { value: 'all', label: 'All updates' },
  { value: 'important', label: 'Important only' },
  { value: 'digest', label: 'Daily digest' },
  { value: 'off', label: 'Off' },
];
const KIND: Record<StorylineEntry['kind'], { icon: IconName; label: string; hue: Hue }> = {
  Notice: { icon: 'megaphone', label: 'Notice', hue: 'sky' },
  Update: { icon: 'refresh', label: 'Update', hue: 'violet' },
  Action: { icon: 'checklist', label: 'Action', hue: 'brand' },
  Law: { icon: 'law', label: 'Law', hue: 'indigo' },
  Scheduled: { icon: 'calendar', label: 'Scheduled', hue: 'sky' },
};

export default function StorylineScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useStorylines();
  const top = useSafeAreaInsets().top;
  const { width } = useWindowDimensions();
  const { scrollY, onScroll } = useScrollY();
  const today = useToday();
  const inst = useInstitutionLookup();
  const level = usePrefs((s) => s.storylines[id] ?? 'off');
  const setLevel = usePrefs((s) => s.setStorylineLevel);
  const menu = useMenu();
  const [onlyChanges, setOnlyChanges] = useState(false);
  const story = query.data?.find((s) => s.id === id);
  const photoHero = hasPhoto(story?.cover);
  const heroH = photoHero ? Math.round(Math.min(width, 480) * 0.56) + top : 0;
  const titleShown = useHeroTitle(scrollY, photoHero ? heroH - top - 40 : 60, story?.title ?? '');
  if (!story) return query.isPending ? null : <ErrorScreen error={query.error ?? new Error('not_found')} onRetry={() => query.refetch()} />;
  const entries = story.entries.filter((e) => !onlyChanges || e.isChange);
  const following = level !== 'off';
  const issuer = inst(story.institutionId);

  const chooseLevel = () =>
    menu(
      LEVELS.map((l) => ({
        label: l.value === level ? `${l.label} (current)` : l.label,
        onPress: () => {
          haptic.selection();
          setLevel(story.id, l.value);
        },
      })),
      'Alerts for this storyline',
      'Important sends changes to dates, amounts and places at once. Everything else waits for the digest.',
    );

  return (
    <>
      <PhotoStatusBar overPhoto={photoHero && !titleShown} />
      <HeaderActions actions={[{ icon: 'share', label: 'Share', onPress: () => shareText(story.title, { kind: 'storyline', id: story.id }).catch(() => undefined) }]} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentInsetAdjustmentBehavior={photoHero ? 'never' : 'automatic'} contentContainerStyle={{ paddingBottom: 48 }}>
        {photoHero && (
          <View style={{ height: heroH }}>
            <Photo id={story.cover} fill />
          </View>
        )}
        <View style={styles.head}>
          <View style={styles.inst}>
            <InstitutionLogo id={issuer.id} label={issuer.mono} size="s" />
            <Txt v="footnote" w="semibold" style={{ flex: 1 }} numberOfLines={1}>{`Storyline · ${issuer.name}`}</Txt>
          </View>
          <Txt v="title1" style={{ marginTop: 12 }} accessibilityRole="header">
            {story.title}
          </Txt>
          <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>
            {story.description}
          </Txt>
          <View style={styles.controls}>
            <Button
              label={following ? LEVELS.find((l) => l.value === level)?.label ?? 'Following' : 'Follow'}
              icon={following ? 'bell' : 'plus'}
              trailingIcon={following ? 'chevronDown' : undefined}
              variant={following ? 'secondary' : 'primary'}
              size="sm"
              hug
              onPress={following ? chooseLevel : () => setLevel(story.id, 'important')}
            />
            <Chip label="Only changes" icon="refresh" selected={onlyChanges} onPress={() => setOnlyChanges((v) => !v)} />
          </View>
        </View>

        <View style={styles.timeline}>
          {entries.map((e, i) => (
            <Animated.View key={e.id} entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)} layout={LinearTransition.duration(motion.base)}>
              <Entry entry={e} future={e.date > today} last={i === entries.length - 1} />
            </Animated.View>
          ))}
        </View>
      </Animated.ScrollView>
    </>
  );
}

function Entry({ entry, future, last }: { entry: StorylineEntry; future: boolean; last: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  const kind = KIND[future ? 'Scheduled' : entry.kind];
  const body = (
    <View style={styles.entry}>
      <View style={styles.rail}>
        {future ? (
          <View style={styles.future}>
            <Icon name="calendar" size={14} color={colors.ink2} />
          </View>
        ) : (
          <IconTile icon={kind.icon} tone={entry.isChange && entry.kind === 'Update' ? 'warn' : kind.hue} size={30} />
        )}
        {!last && <View style={styles.line} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 22 }}>
        <Txt v="caption" c={colors.ink3} num>{`${formatDate.weekdayShort(entry.date)} ${formatDate.year(entry.date)} · ${future ? 'Coming up' : kind.label}`}</Txt>
        <Txt v="callout" w="semibold" style={{ marginTop: 3 }}>
          {entry.title}
        </Txt>
        <Txt v="subhead" c={colors.ink2} style={{ marginTop: 2 }}>
          {entry.summary}
        </Txt>
        {entry.diff && <ChangeLine change={{ field: 'Changed', before: entry.diff.before, after: entry.diff.after }} style={{ marginTop: 10, alignSelf: 'flex-start' }} />}
        {entry.link && (
          <View style={styles.open}>
            <Txt v="footnote" w="semibold">
              Open
            </Txt>
            <Icon name="chevronRight" size={10} color={colors.ink} weight="semibold" />
          </View>
        )}
      </View>
    </View>
  );
  if (!entry.link) return body;
  const link = entry.link;
  return (
    <Highlight accessibilityRole="link" accessibilityLabel={`${kind.label}, ${entry.title}. ${entry.summary}`} onPress={() => router.push(toHref(link))} pressedStyle={{ opacity: 0.6 }}>
      {body}
    </Highlight>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  head: { paddingHorizontal: GUTTER, paddingTop: 18 },
  inst: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  timeline: { marginHorizontal: GUTTER, marginTop: 24, padding: 18, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  entry: { flexDirection: 'row', gap: 14 },
  rail: { width: 30, alignItems: 'center' },
  future: { width: 30, height: 30, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.pearl, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, backgroundColor: colors.line, marginTop: 6 },
  open: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
}));
