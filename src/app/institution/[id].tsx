import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { InstitutionDetail } from '@/data/schema';
import { useActions, useInstitutionLookup, useInstitutions, useToday } from '@/features/data';
import { DateTile } from '@/features/home/modules';
import { regulationStatusLabel, SECTORS } from '@/features/labels';
import { FeedCard } from '@/features/record/feed-card';
import { useMenu } from '@/features/record/menu';
import { DeadlineChip, FieldStrip } from '@/features/record/parts';
import { addToCalendar } from '@/lib/calendar';
import { addDays, daysBetween, formatDate } from '@/lib/dates';
import { AppError, toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { shareText } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import type { FollowLevel } from '@/state/schema';
import { IconTile, Skeleton, Tag } from '@/ui/atoms';
import { Button } from '@/ui/button';
import type { IconName } from '@/ui/icon';
import { Group, GroupNote, INSET, Row, SectionHeader } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { HeaderActions, PhotoStatusBar, useHeroTitle, useScrollY } from '@/ui/nav';
import { Photo, hasPhoto } from '@/ui/photo';
import { Segmented } from '@/ui/segmented';
import { EmptyState, ErrorScreen, RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { GUTTER, motion, radius, useColors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

type Tab = 'deadlines' | 'laws' | 'notices' | 'contacts';

const LEVELS: { value: Exclude<FollowLevel, 'off'>; label: string; note: string }[] = [
  { value: 'all', label: 'All updates', note: 'every item as it is published' },
  { value: 'important', label: 'Important only', note: 'required actions, changes and new laws' },
  { value: 'digest', label: 'Daily digest', note: 'one summary each evening' },
];
const CONTACT_ICON: Record<InstitutionDetail['contacts'][number]['kind'], IconName> = { phone: 'phone', mail: 'mail', pin: 'pin', link: 'link' };

export default function InstitutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const institutions = useInstitutions();
  if (institutions.data && !institutions.data.some((i) => i.id === id)) {
    return (
      <ErrorScreen error={new AppError('not_found')} onRetry={() => router.back()} />
    );
  }
  return <InstitutionView id={id} />;
}

function InstitutionView({ id }: { id: string }) {
  const colors = useColors();
  const inst = useInstitutionLookup()(id);
  const api = useApi();
  const detail = useQuery(q.institutionDetail(api, id));
  const feed = useQuery(q.feed(api));
  const actions = useActions();
  const { height } = useWindowDimensions();
  const top = useSafeAreaInsets().top;
  const { scrollY, onScroll } = useScrollY();
  const today = useToday();
  const toast = useToast();
  const menu = useMenu();
  const level = usePrefs((s) => s.follows[id]);
  const setFollow = usePrefs((s) => s.setFollow);
  const [tab, setTab] = useState<Tab>('deadlines');
  const withPhoto = hasPhoto(inst.cover);
  const hero = Math.round(height * 0.3);
  const following = level !== undefined && level !== 'off';
  const titleShown = useHeroTitle(scrollY, withPhoto ? hero - top - 40 : 60, inst.name);
  const sector = SECTORS[inst.sector];
  const d = detail.data;
  const upcoming = d?.deadlines.filter((x) => x.date >= today) ?? [];
  const own = (actions.data ?? []).filter((a) => a.institutionId === id && a.deadline >= today);
  const items = (feed.data ?? []).filter((f) => f.institutionId === id);

  const chooseLevel = () =>
    menu(
      [
        ...LEVELS.map((l) => ({ label: l.value === level ? `${l.label} (current)` : l.label, onPress: () => setFollow(id, l.value) })),
        ...(following ? [{ label: 'Stop following', destructive: true, onPress: () => setFollow(id, null) }] : []),
      ],
      following ? `Following ${inst.mono}` : `Follow ${inst.mono}`,
      LEVELS.map((l) => `${l.label}: ${l.note}.`).join('\n'),
    );

  const addAll = async () => {
    try {
      await addToCalendar(upcoming.map((x) => ({ title: `${inst.mono}: ${x.title}`, start: new Date(`${x.date}T00:00:00`), end: new Date(`${addDays(x.date, 1)}T00:00:00`), allDay: true, notes: `${x.rule} · ${inst.name}` })));
      haptic.success();
      toast({ message: `Added ${upcoming.length} deadlines to your calendar`, icon: 'calendarAdd' });
    } catch (e) {
      const err = toAppError(e);
      if (err.code !== 'cancelled') toast({ message: userMessage(err.code), icon: 'warning' });
    }
  };

  const openContact = (kind: keyof typeof CONTACT_ICON, value: string) => {
    if (kind === 'link') return WebBrowser.openBrowserAsync(value).catch(() => undefined);
    const url =
      kind === 'phone'
        ? `tel:${value.replace(/\s/g, '')}`
        : kind === 'mail'
          ? `mailto:${value}`
          : Platform.OS === 'ios'
            ? `maps://?q=${encodeURIComponent(value)}`
            : Platform.OS === 'android'
              ? `geo:0,0?q=${encodeURIComponent(value)}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
    return Linking.openURL(url).catch(() => undefined);
  };

  const tabs = [
    { value: 'deadlines', label: 'Deadlines', count: d ? upcoming.length : undefined },
    { value: 'laws', label: 'Laws', count: d?.laws.length },
    { value: 'notices', label: 'Notices', count: d?.notices.length },
    { value: 'contacts', label: 'Contacts' },
  ] as const;

  return (
    <>
      <PhotoStatusBar overPhoto={withPhoto && !titleShown} />
      <HeaderActions actions={[{ icon: 'share', label: `Share ${inst.name}`, onPress: () => shareText(inst.name, { kind: 'institution', id }).catch(() => undefined) }]} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentInsetAdjustmentBehavior={withPhoto ? 'never' : 'automatic'} contentContainerStyle={{ paddingBottom: 40 }}>
        {withPhoto && (
          <View style={{ height: hero }}>
            <Photo id={inst.cover} fill />
          </View>
        )}

        <View style={styles.head}>
          <View style={styles.identity}>
            <InstitutionLogo id={inst.id} label={inst.mono} size="l" />
            <View style={{ flex: 1 }}>
              <Txt v="title2" accessibilityRole="header">
                {inst.name}
              </Txt>
              <View style={styles.kind}>
                <Txt v="footnote" c={colors.ink2}>
                  {inst.kind}
                </Txt>
                <Tag label={sector.label} tone={sector.hue} icon={sector.icon} />
              </View>
            </View>
          </View>
          {inst.about !== '' && (
            <Txt v="callout" c={colors.ink2} style={{ marginTop: 14 }}>
              {inst.about}
            </Txt>
          )}
          <View style={styles.buttons}>
            <Button
              label={following ? `Following · ${LEVELS.find((l) => l.value === level)?.label ?? 'Important only'}` : 'Follow'}
              icon={following ? 'check' : 'plus'}
              trailingIcon={following ? 'chevronDown' : undefined}
              variant={following ? 'secondary' : 'primary'}
              size="md"
              hug
              accessibilityHint="Choose how much you hear from this institution"
              onPress={chooseLevel}
            />
            {inst.directoryId && <Button label="Offices" icon="building" variant="secondary" size="md" hug onPress={() => router.push(toHref({ kind: 'directory', id: inst.directoryId ?? '' }))} />}
          </View>
        </View>

        {d && (
          <FieldStrip
            fields={[
              { label: 'Deadlines ahead', value: String(upcoming.length) },
              { label: 'Laws on record', value: String(d.laws.length) },
              { label: 'Last verified', value: formatDate.short(d.verifiedAt) },
            ]}
            style={styles.strip}
          />
        )}

        <View style={styles.tabs}>
          <Segmented accessibilityLabel={`${inst.mono} sections`} options={tabs} value={tab} onChange={setTab} />
        </View>
        {detail.isError && !d ? (
          <RetryLine label={inst.mono} error={detail.error} onRetry={() => detail.refetch()} style={{ marginTop: 14 }} />
        ) : detail.isPending ? (
          <View style={styles.px}>
            <Skeleton width="100%" height={160} r={radius.lg} style={{ marginTop: 14 }} />
          </View>
        ) : !d ? (
          <EmptyState icon="doc" title="No records yet" body={`Imboni hasn’t published deadlines, laws or contacts for ${inst.name} yet. Follow it to hear when it does.`} />
        ) : (
          <Animated.View key={tab} entering={FadeIn.duration(motion.fast)} layout={LinearTransition.duration(motion.base)} style={{ marginTop: 14 }}>
            {tab === 'deadlines' &&
              (upcoming.length ? (
                <>
                  <Group inset={INSET.tile}>
                    {upcoming.map((x) => {
                      const left = daysBetween(today, x.date);
                      const link = x.link;
                      return (
                        <Row
                          key={`${x.date}-${x.title}`}
                          left={<DateTile ymd={x.date} far={left > 180} size={40} />}
                          title={x.title}
                          subtitle={x.rule}
                          right={<DeadlineChip daysLeft={left} compact />}
                          chevron={Boolean(link)}
                          accessibilityLabel={`${x.title}, ${formatDate.long(x.date)}, ${left} days left. ${x.rule}`}
                          onPress={link ? () => router.push(toHref(link)) : undefined}
                        />
                      );
                    })}
                  </Group>
                  <View style={[styles.px, { marginTop: 14 }]}>
                    <Button label={`Add ${upcoming.length} deadlines to calendar`} icon="calendarAdd" variant="secondary" size="md" onPress={addAll} />
                  </View>
                  <GroupNote>{following ? 'You get a reminder five days before each deadline.' : 'Follow to get a reminder five days before each deadline.'}</GroupNote>
                </>
              ) : (
                <GroupNote>No deadlines ahead. Recurring ones appear as soon as the next date is set.</GroupNote>
              ))}
            {tab === 'laws' &&
              (d.laws.length ? (
                <Group>
                  {d.laws.map((l) => {
                    const s = regulationStatusLabel(l.status);
                    return (
                      <Row key={l.regulationId} title={l.title} subtitle={l.meta} right={<Tag label={s.label} tone={s.tone} icon={s.icon} />} chevron accessibilityLabel={`${l.title}. ${s.label}. ${l.meta}`} onPress={() => router.push(toHref({ kind: 'regulation', id: l.regulationId }))} />
                    );
                  })}
                </Group>
              ) : (
                <GroupNote>No laws or regulations from this institution on record.</GroupNote>
              ))}
            {tab === 'notices' &&
              (d.notices.length ? (
                <Group>
                  {d.notices.map((n) => (
                    <Row key={n.id} title={n.title} subtitle={n.meta} chevron onPress={() => router.push(toHref(n.link))} />
                  ))}
                </Group>
              ) : (
                <GroupNote>No recent notices.</GroupNote>
              ))}
            {tab === 'contacts' && (
              <>
                <Group inset={INSET.tile}>
                  {d.contacts.map((c) => {
                    const value = c.value;
                    return (
                      <Row
                        key={c.title}
                        left={<IconTile icon={CONTACT_ICON[c.kind]} />}
                        title={c.title}
                        subtitle={value ? (c.kind === 'link' ? value.replace(/^https?:\/\/(www\.)?/, '') : value) : 'Not listed yet'}
                        chevron={Boolean(value)}
                        onPress={value ? () => openContact(c.kind, value) : undefined}
                      />
                    );
                  })}
                  {inst.directoryId && <Row left={<IconTile icon="building" tone="teal" />} title="Offices and opening hours" chevron onPress={() => router.push(toHref({ kind: 'directory', id: inst.directoryId ?? '' }))} />}
                </Group>
                <GroupNote>{`Contacts checked against ${inst.mono}’s official website on ${formatDate.long(d.verifiedAt)}.`}</GroupNote>
              </>
            )}
          </Animated.View>
        )}

        {own.length > 0 && (
          <>
            <SectionHeader title="Actions" caption={`Open deadlines from ${inst.mono}`} icon="checklist" />
            <Group inset={INSET.tile}>
              {own.map((a) => {
                const left = daysBetween(today, a.deadline);
                return (
                  <Row
                    key={a.id}
                    left={<IconTile icon={a.icon} tone="brand" />}
                    title={a.title}
                    subtitle={`${a.required ? 'Required' : 'Advised'} · ${a.repeats ?? formatDate.long(a.deadline)}`}
                    right={<DeadlineChip daysLeft={left} compact />}
                    accessibilityLabel={`Action, ${a.required ? 'required' : 'advised'}, ${left} days left. ${a.title}`}
                    onPress={() => router.push(toHref({ kind: 'action', id: a.id }))}
                  />
                );
              })}
            </Group>
          </>
        )}

        {items.length > 0 && (
          <>
            <SectionHeader title={`Recent from ${inst.mono}`} icon="megaphone" />
            <View style={styles.feed}>
              {items.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </View>
          </>
        )}

        <GroupNote>Imboni is independent of every institution. Names appear only to show where an item came from.</GroupNote>
      </Animated.ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: GUTTER + 4, paddingTop: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kind: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  strip: { marginHorizontal: GUTTER, marginTop: 22 },
  tabs: { paddingHorizontal: GUTTER, paddingTop: 22 },
  px: { paddingHorizontal: GUTTER },
  feed: { gap: 12, paddingHorizontal: GUTTER },
});
