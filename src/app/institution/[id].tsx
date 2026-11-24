import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { useInstitutionLookup, useToday } from '@/features/data';
import { addToCalendar } from '@/lib/calendar';
import { addDays, formatDate } from '@/lib/dates';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { shareText } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import { Badge, DateBadge, Gradient, Tile } from '@/ui/atoms';
import { Button, CapButton, CircleButton } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Cell, Group, GroupFooter, INSET } from '@/ui/list';
import { BackButton, NavBar, NavButton, Screen, useNavInset, useScrollY } from '@/ui/nav';
import { Segmented } from '@/ui/segmented';
import { RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors, type Tone } from '@/ui/theme';
import { useToast } from '@/ui/toast';

const TABS = [
  { value: 'deadlines', label: 'Deadlines' },
  { value: 'laws', label: 'Laws' },
  { value: 'notices', label: 'Notices' },
  { value: 'contact', label: 'Contact' },
] as const;
type Tab = (typeof TABS)[number]['value'];
const STATUS: Record<'upcoming' | 'in_force' | 'repealed', { label: string; tone: Tone }> = {
  upcoming: { label: 'Upcoming', tone: 'orange' },
  in_force: { label: 'In force', tone: 'green' },
  repealed: { label: 'Repealed', tone: 'gray' },
};

export default function InstitutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inst = useInstitutionLookup()(id);
  const detail = useQuery(q.institutionDetail(useApi(), id));
  const { scrollY, onScroll } = useScrollY();
  const top = useNavInset();
  const today = useToday();
  const toast = useToast();
  const level = usePrefs((s) => s.follows[id]);
  const setFollow = usePrefs((s) => s.setFollow);
  const [tab, setTab] = useState<Tab>('deadlines');
  const following = level !== undefined && level !== 'off';
  const d = detail.data;
  const upcoming = d?.deadlines.filter((x) => x.date >= today) ?? [];

  const addAll = async () => {
    try {
      await addToCalendar(upcoming.map((x) => ({ title: `${inst.mono}: ${x.title}`, start: new Date(`${x.date}T00:00:00`), end: new Date(`${addDays(x.date, 1)}T00:00:00`), allDay: true, notes: x.rule })));
      haptic.success();
      toast({ message: `Added ${upcoming.length} deadlines to your calendar`, icon: 'calendar', iconColor: colors.red });
    } catch (e) {
      toast({ message: userMessage(toAppError(e).code), icon: 'warning', iconColor: colors.orange });
    }
  };
  const footer: Record<Tab, string> = {
    deadlines: following ? 'Reminder 5 days before each deadline.' : 'Follow to get reminders before each deadline.',
    laws: 'Full alerts for laws.',
    notices: 'Notices go to your daily digest.',
    contact: d ? `Verified ${formatDate.long(d.verifiedAt)}.` : '',
  };

  return (
    <Screen>
      <NavBar scrollY={scrollY} title={inst.mono} left={<BackButton label="Back" />} right={<NavButton label="Share" icon="share" onPress={() => shareText(inst.name, { kind: 'institution', id }).catch(() => undefined)} />} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: top + 6, paddingBottom: 40 }}>
        <View style={styles.head}>
          <View style={styles.logo}>
            <Gradient name={d?.gradient ?? 'institution'} />
            <Txt c={colors.white} w="700" style={{ fontSize: 26 }}>
              {inst.mono}
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="t2" accessibilityRole="header">
              {inst.name}
            </Txt>
            <Txt v="fn" c={colors.l2}>
              {inst.kind}
            </Txt>
            <View style={styles.row}>
              <CapButton label={following ? 'Following' : 'Follow'} icon={following ? 'check' : 'plus'} variant={following ? 'tinted' : 'solid'} onPress={() => setFollow(id, following ? null : 'important')} />
              <CircleButton icon="bell" label="Alert levels" variant="tinted" onPress={() => router.push('/alert-levels')} />
            </View>
          </View>
        </View>
        {d && (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Txt v="c1" c={colors.l2}>DEADLINES</Txt>
              <Txt v="t3" num>{upcoming.length}</Txt>
              <Txt v="c1" c={colors.l2}>{upcoming[0] ? `next ${formatDate.short(upcoming[0].date)}` : 'none ahead'}</Txt>
            </View>
            <View style={[styles.stat, styles.statMid]}>
              <Txt v="c1" c={colors.l2}>LAWS</Txt>
              <Txt v="t3" num>{d.laws.length}</Txt>
              <Txt v="c1" c={colors.l2}>{`${d.laws.filter((l) => l.status === 'upcoming').length} upcoming`}</Txt>
            </View>
            <View style={styles.stat}>
              <Txt v="c1" c={colors.l2}>SOURCE</Txt>
              <Icon name="shield" size={22} color={colors.green} />
              <Txt v="c1" c={colors.l2}>Verified</Txt>
            </View>
          </View>
        )}
        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          <Segmented accessibilityLabel="Institution sections" options={TABS} value={tab} onChange={setTab} />
        </View>
        {detail.isError && !d ? (
          <RetryLine label={inst.mono} error={detail.error} onRetry={() => detail.refetch()} style={{ marginTop: 14 }} />
        ) : (
          <Animated.View key={tab} entering={FadeIn} style={{ marginTop: 14 }}>
            {tab === 'deadlines' && (
              <>
                <Group inset={INSET.avatar}>
                  {upcoming.length ? upcoming.map((x) => <Cell key={`${x.date}-${x.title}`} left={<DateBadge month={formatDate.monthTag(x.date)} day={formatDate.day(x.date)} />} title={x.title} subtitle={x.rule} />) : <Cell title="No deadlines published" tone="muted" />}
                </Group>
                {upcoming.length > 0 && (
                  <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
                    <Button label="Add all to Calendar" icon="calendar" variant="tinted" onPress={addAll} />
                  </View>
                )}
              </>
            )}
            {tab === 'laws' && (
              <Group>
                {(d?.laws ?? []).map((l) => (
                  <Cell key={l.regulationId} title={l.title} subtitle={l.meta} right={<Badge label={STATUS[l.status].label} tone={STATUS[l.status].tone} />} chevron onPress={() => router.push(toHref({ kind: 'regulation', id: l.regulationId }))} />
                ))}
                {!d?.laws.length && <Cell title="No laws on record" tone="muted" />}
              </Group>
            )}
            {tab === 'notices' && (
              <Group>
                {(d?.notices ?? []).map((n) => <Cell key={n.id} title={n.title} subtitle={n.meta} />)}
                {!d?.notices.length && <Cell title="No recent notices" tone="muted" />}
              </Group>
            )}
            {tab === 'contact' && (
              <Group inset={INSET.tile}>
                {(d?.contacts ?? []).map((c) => (
                  <Cell key={c.title} left={<Tile icon={c.kind === 'phone' ? 'phone' : c.kind === 'mail' ? 'mail' : 'pin'} color={c.kind === 'phone' ? 'green' : c.kind === 'mail' ? 'tint' : 'red'} />} title={c.title} subtitle={c.value ?? 'Not verified yet'} />
                ))}
                {inst.directoryId && <Cell left={<Tile icon="bank" color="indigo" />} title="Directory entry" chevron onPress={() => router.push(toHref({ kind: 'directory', id: inst.directoryId ?? '' }))} />}
              </Group>
            )}
          </Animated.View>
        )}
        <GroupFooter>{footer[tab]}</GroupFooter>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20 },
  logo: { width: 96, height: 96, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  stats: { flexDirection: 'row', marginTop: 20, marginHorizontal: 20, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.sep },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statMid: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderColor: colors.sep },
});
