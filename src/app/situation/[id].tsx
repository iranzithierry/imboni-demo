import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Institution } from '@/data/schema';
import { useActions, useInstitutionLookup, useInstitutions, useToday } from '@/features/data';
import { SITUATIONS } from '@/features/labels';
import { FeedCard } from '@/features/record/feed-card';
import { DeadlineChip } from '@/features/record/parts';
import { daysBetween, formatDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { usePrefs } from '@/state/prefs';
import { IconTile, Tag } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Group, GroupNote, INSET, Row, SectionHeader } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { PhotoStatusBar, useHeroTitle, useScrollY } from '@/ui/nav';
import { Photo, hasPhoto } from '@/ui/photo';
import { EmptyState, RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { GUTTER, useColors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

type Key = keyof typeof SITUATIONS;
const isKey = (id: string): id is Key => id in SITUATIONS;

export default function SituationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!isKey(id)) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <EmptyState icon="people" title="This situation isn’t available" body="Pick one from Explore to see the institutions and actions that come with it." action={{ label: 'Open Explore', onPress: () => router.replace('/explore') }} />
      </ScrollView>
    );
  }
  return <SituationView id={id} />;
}

function SituationView({ id }: { id: Key }) {
  const colors = useColors();
  const info = SITUATIONS[id];
  const { height } = useWindowDimensions();
  const top = useSafeAreaInsets().top;
  const { scrollY, onScroll } = useScrollY();
  const today = useToday();
  const institutions = useInstitutions();
  const actions = useActions();
  const feed = useQuery(q.feed(useApi()));
  const lookup = useInstitutionLookup();
  const follows = usePrefs((s) => s.follows);
  const setFollow = usePrefs((s) => s.setFollow);
  const toast = useToast();
  const withPhoto = hasPhoto(info.photo);
  const hero = Math.round(height * 0.34);
  const titleShown = useHeroTitle(scrollY, withPhoto ? hero - top - 40 : 60, info.short);

  const catalog = institutions.data ?? [];
  const matched = catalog.filter((i) => i.situations.includes(id));
  // National sources apply to everyone, so they follow the ones matched to the situation.
  const list: Institution[] = [...matched, ...catalog.filter((i) => i.forEveryone && !matched.includes(i))];
  const isFollowed = (i: Institution) => (follows[i.id] ?? 'off') !== 'off';
  const allFollowed = list.length > 0 && list.every(isFollowed);
  const open = (actions.data ?? []).filter((a) => a.forSituations.includes(id) && a.deadline >= today).sort((a, b) => a.deadline.localeCompare(b.deadline));
  const recent = (feed.data ?? []).filter((f) => f.audience.includes(id));

  const followAll = () => {
    const before = list.map((i) => [i.id, follows[i.id] ?? null] as const);
    for (const i of list) setFollow(i.id, allFollowed ? null : (follows[i.id] ?? 'important'));
    haptic.success();
    toast({
      message: allFollowed ? `Stopped following ${list.length} institutions` : `Following ${list.length} institutions`,
      icon: allFollowed ? 'minus' : 'check',
      action: { label: 'Undo', onPress: () => before.forEach(([inst, level]) => setFollow(inst, level === 'off' ? null : level)) },
    });
  };

  return (
    <>
      <PhotoStatusBar overPhoto={withPhoto && !titleShown} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentInsetAdjustmentBehavior={withPhoto ? 'never' : 'automatic'} contentContainerStyle={{ paddingBottom: 40 }}>
        {withPhoto && (
          <View style={{ height: hero }}>
            <Photo id={info.photo} fill />
          </View>
        )}
        <View style={styles.head}>
          <View style={styles.kind}>
            <IconTile icon={info.icon} tone={info.hue} size={28} solid />
            <Txt v="footnote" w="medium" c={colors.ink2}>
              Life situation
            </Txt>
          </View>
          <Txt v="title1" style={{ marginTop: 10 }} accessibilityRole="header">
            {info.label}
          </Txt>
          <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>
            {info.blurb}
          </Txt>
          {list.length > 0 && (
            <Button
              label={allFollowed ? `Following all ${list.length}` : `Follow all ${list.length}`}
              icon={allFollowed ? 'check' : 'plus'}
              variant={allFollowed ? 'secondary' : 'primary'}
              size="md"
              hug
              accessibilityHint={allFollowed ? 'Stops following every institution listed here' : 'Follows every institution listed here at Important level'}
              onPress={followAll}
              style={{ marginTop: 18 }}
            />
          )}
        </View>

        <SectionHeader title="Institutions" caption="Matched to this situation, then national sources" icon="bank" />
        {institutions.isError && !institutions.data ? (
          <RetryLine label="Institutions" error={institutions.error} onRetry={() => institutions.refetch()} />
        ) : (
          <Group inset={INSET.mono}>
            {list.map((i) => (
              <Row
                key={i.id}
                left={<InstitutionLogo id={i.id} label={i.mono} />}
                title={i.name}
                subtitle={i.why}
                right={isFollowed(i) ? <Tag label="Following" tone="outline" icon="check" /> : undefined}
                chevron
                accessibilityLabel={`${i.name}. ${i.why}.${isFollowed(i) ? ' Following.' : ''}`}
                onPress={() => router.push(toHref({ kind: 'institution', id: i.id }))}
              />
            ))}
          </Group>
        )}

        <SectionHeader title="Actions" caption="Open deadlines that apply to this situation" icon="checklist" />
        {actions.isError && !actions.data ? (
          <RetryLine label="Actions" error={actions.error} onRetry={() => actions.refetch()} />
        ) : open.length === 0 ? (
          <GroupNote>Nothing to do right now. New required actions for this situation reach you as they are published.</GroupNote>
        ) : (
          <Group inset={INSET.tile}>
            {open.map((a) => {
              const left = daysBetween(today, a.deadline);
              return (
                <Row
                  key={a.id}
                  left={<IconTile icon={a.icon} tone="brand" />}
                  title={a.title}
                  subtitle={`${lookup(a.institutionId).mono} · ${a.required ? 'Required' : 'Advised'} · ${formatDate.long(a.deadline)}`}
                  right={<DeadlineChip daysLeft={left} compact />}
                  accessibilityLabel={`Action, ${a.required ? 'required' : 'advised'}, ${left} days left. ${a.title}`}
                  onPress={() => router.push(toHref({ kind: 'action', id: a.id }))}
                />
              );
            })}
          </Group>
        )}

        {recent.length > 0 && (
          <>
            <SectionHeader title="Recent" caption="Notices published for this situation" icon="megaphone" />
            <View style={styles.feed}>
              {recent.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </View>
          </>
        )}
      </Animated.ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: GUTTER + 4, paddingTop: 22 },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feed: { gap: 12, paddingHorizontal: GUTTER },
});
