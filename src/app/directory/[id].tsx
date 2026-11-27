import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { DirectoryEntry } from '@/data/schema';
import { useInstitutionLookup, useNow } from '@/features/data';
import { formatDate, isoWeekday, openState, ymdIn } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { zoneCity } from '@/lib/places';
import { shareText } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import { IconTile, Tag } from '@/ui/atoms';
import { Button, TextAction } from '@/ui/button';
import { Icon, type IconName } from '@/ui/icon';
import { Group, GroupLabel, INSET, Row } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { HeaderActions, PhotoStatusBar, useHeroTitle, useScrollY } from '@/ui/nav';
import { Photo, hasPhoto } from '@/ui/photo';
import { Highlight } from '@/ui/pressable';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, radius, useColors } from '@/ui/theme';

export default function DirectoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useQuery(q.directory(useApi(), id));
  if (!entry.data) {
    return entry.isPending ? null : <ErrorScreen error={entry.error} onRetry={() => entry.refetch()} />;
  }
  return <DirectoryView e={entry.data} />;
}

function Quick({ icon, label, onPress }: { icon: IconName; label: string; onPress: (() => void) | null }) {
  const colors = useColors();
  const styles = useStyles();
  const fg = onPress ? colors.ink : colors.ink3;
  return (
    <Highlight
      accessibilityRole="button"
      accessibilityLabel={onPress ? label : `${label}, not listed yet`}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      feedback="tap"
      onPress={onPress ?? undefined}
      pressedStyle={{ backgroundColor: colors.pressed }}
      style={styles.quick}>
      <Icon name={icon} size={20} color={fg} />
      <Txt v="footnote" w="medium" c={fg}>
        {label}
      </Txt>
    </Highlight>
  );
}

function DirectoryView({ e }: { e: DirectoryEntry }) {
  const colors = useColors();
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const top = useSafeAreaInsets().top;
  const { scrollY, onScroll } = useScrollY();
  const now = useNow();
  const inst = useInstitutionLookup()(e.institutionId);
  const following = usePrefs((s) => (s.follows[e.institutionId] ?? 'off') !== 'off');
  const setFollow = usePrefs((s) => s.setFollow);
  const withPhoto = hasPhoto(e.photo);
  const hero = Math.round(height * 0.28);
  const titleShown = useHeroTitle(scrollY, withPhoto ? hero - top - 40 : 60, e.name);

  const state = openState(e.hours, e.timeZone, now);
  const city = zoneCity(e.timeZone);
  const weekday = isoWeekday(ymdIn(now, e.timeZone));
  const covered = new Set(e.hours.flatMap((h) => h.days));
  const open = (url: string) => Linking.openURL(url).catch(() => undefined);
  const coord = e.coordinate;
  const directions = coord
    ? () =>
        open(
          Platform.OS === 'ios'
            ? `maps://?daddr=${coord.latitude},${coord.longitude}`
            : Platform.OS === 'android'
              ? `geo:${coord.latitude},${coord.longitude}?q=${encodeURIComponent(e.name)}`
              : `https://www.google.com/maps/dir/?api=1&destination=${coord.latitude},${coord.longitude}`,
        )
    : null;
  const address = e.street ? `${e.street}, ${e.country}` : `${e.city}, ${e.country}`;
  const status = e.hours.length === 0 ? { icon: 'clock' as const, fg: colors.ink2, text: 'Hours not listed yet' } : state.open ? { icon: 'checkCircle' as const, fg: colors.ok, text: `Open now · closes ${state.closesAt}` } : { icon: 'clock' as const, fg: colors.ink2, text: state.opensAt ? `Closed · opens ${state.opensAt}` : 'Closed' };

  return (
    <>
      <PhotoStatusBar overPhoto={withPhoto && !titleShown} />
      <HeaderActions actions={[{ icon: 'share', label: `Share ${e.name}`, onPress: () => shareText(e.name, { kind: 'directory', id: e.id }).catch(() => undefined) }]} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentInsetAdjustmentBehavior={withPhoto ? 'never' : 'automatic'} contentContainerStyle={{ paddingBottom: 40 }}>
        {withPhoto && (
          <View style={{ height: hero }}>
            <Photo id={e.photo} fill />
          </View>
        )}

        <View style={styles.head}>
          <View style={styles.identity}>
            <InstitutionLogo id={e.institutionId} label={e.mono} size="l" />
            <View style={{ flex: 1 }}>
              <Txt v="title2" accessibilityRole="header">
                {e.name}
              </Txt>
              <Txt v="footnote" c={colors.ink2} style={{ marginTop: 2 }}>{`${e.desk} · ${e.city}`}</Txt>
            </View>
          </View>
          <View style={styles.status} accessibilityLabel={`${status.text}, ${city} time`}>
            <Icon name={status.icon} size={15} color={status.fg} weight="semibold" />
            <Txt v="subhead" w="semibold" c={status.fg} num>
              {status.text}
            </Txt>
            <Txt v="subhead" c={colors.ink3}>{`· ${city} time`}</Txt>
          </View>
        </View>

        <View style={styles.quicks}>
          <Quick icon="phone" label="Call" onPress={e.phone ? () => open(`tel:${e.phone?.replace(/\s/g, '')}`) : null} />
          <Quick icon="mail" label="Email" onPress={e.email ? () => open(`mailto:${e.email}`) : null} />
          <Quick icon="location" label="Directions" onPress={directions} />
          <Quick icon="share" label="Share" onPress={() => shareText(e.name, { kind: 'directory', id: e.id }).catch(() => undefined)} />
        </View>

        <GroupLabel>Contact</GroupLabel>
        <Group inset={INSET.tile}>
          <Row left={<IconTile icon="phone" />} title="Phone" subtitle={e.phone ?? 'Not listed yet'} chevron={Boolean(e.phone)} onPress={e.phone ? () => open(`tel:${e.phone?.replace(/\s/g, '')}`) : undefined} />
          <Row left={<IconTile icon="mail" />} title="Email" subtitle={e.email ?? 'Not listed yet'} chevron={Boolean(e.email)} onPress={e.email ? () => open(`mailto:${e.email}`) : undefined} />
          <Row left={<IconTile icon="pin" />} title="Address" subtitle={address} chevron={Boolean(directions)} onPress={directions ?? undefined} />
        </Group>

        <GroupLabel>{`Hours · ${city} time`}</GroupLabel>
        <Group>
          {e.hours.map((h) => (
            <Row key={h.label} title={h.label} detail={`${h.open}–${h.close}`} right={h.days.includes(weekday) ? <Tag label="Today" tone="teal" /> : undefined} />
          ))}
          {covered.size < 7 && <Row title="Other days" detail="Closed" tone="muted" right={covered.has(weekday) ? undefined : <Tag label="Today" tone="teal" />} />}
        </Group>

        {e.services.length > 0 && (
          <>
            <GroupLabel>Services</GroupLabel>
            <Group inset={INSET.tile}>
              {e.services.map((s) => (
                <Row key={s.title} left={<IconTile icon={s.icon} />} title={s.title} subtitle={s.detail} right={s.required ? <Tag label="Required" tone="red" /> : undefined} />
              ))}
            </Group>
          </>
        )}

        <GroupLabel>Office holder</GroupLabel>
        <Group>
          <Row title={e.officeHolder.role} detail={e.officeHolder.name ?? 'Not verified yet'} />
        </Group>

        <View style={styles.follow}>
          <Button
            label={following ? `Following ${inst.mono}` : `Follow ${inst.name}`}
            icon={following ? 'check' : 'plus'}
            variant={following ? 'secondary' : 'primary'}
            size="md"
            onPress={() => {
              haptic.selection();
              setFollow(e.institutionId, following ? null : 'important');
            }}
          />
          <Button label={`About ${inst.mono}`} variant="secondary" size="md" onPress={() => router.push(toHref({ kind: 'institution', id: e.institutionId }))} />
        </View>

        <View style={styles.foot}>
          <Txt v="footnote" c={colors.ink3} num style={{ flex: 1 }}>{`Last verified ${formatDate.long(e.verifiedAt)}`}</Txt>
          <TextAction label="Suggest a fix" icon={null} onPress={() => router.push({ pathname: '/report/[id]', params: { id: e.id, field: 'Directory entry' } })} />
        </View>
      </Animated.ScrollView>
    </>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  head: { paddingHorizontal: GUTTER + 4, paddingTop: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' },
  quicks: { flexDirection: 'row', gap: 8, paddingTop: 18, paddingHorizontal: GUTTER },
  quick: { flex: 1, height: 68, borderRadius: radius.md, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 5 },
  follow: { gap: 10, paddingHorizontal: GUTTER, paddingTop: 24 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER + 4, paddingTop: 14 },
}));
