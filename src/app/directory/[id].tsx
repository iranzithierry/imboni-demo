import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { useNow } from '@/features/data';
import { formatDate, openState } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { shareText } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import { Badge, Gradient, Tile } from '@/ui/atoms';
import { Icon, type IconName } from '@/ui/icon';
import { Cell, Group, GroupHeader, INSET } from '@/ui/list';
import { BackButton, NavBar, NavButton, Screen, useNavInset, useScrollY } from '@/ui/nav';
import { PressableScale } from '@/ui/pressable';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: (() => void) | null }) {
  return (
    <PressableScale feedback="tap" disabled={!onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !onPress }} onPress={onPress ?? undefined} style={[styles.quick, !onPress && { opacity: 0.4 }]}>
      <Icon name={icon} size={22} color={colors.tint} />
      <Txt v="c1" w="600" c={colors.tint}>
        {label}
      </Txt>
    </PressableScale>
  );
}

export default function DirectoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useQuery(q.directory(useApi(), id));
  const now = useNow();
  const { scrollY, onScroll } = useScrollY();
  const top = useNavInset();
  const followKey = `dir:${id}`;
  const following = usePrefs((s) => s.follows[followKey] !== undefined);
  const setFollow = usePrefs((s) => s.setFollow);
  const e = entry.data;
  if (!e) return <Screen>{entry.isPending ? null : <ErrorScreen error={entry.error} onRetry={() => entry.refetch()} />}</Screen>;

  const state = openState(e.hours, e.timeZone, now);
  const open = (url: string) => Linking.openURL(url).catch(() => undefined);
  const coord = e.coordinate;
  const directions = coord ? () => open(Platform.OS === 'ios' ? `maps://?daddr=${coord.latitude},${coord.longitude}` : `geo:${coord.latitude},${coord.longitude}?q=${encodeURIComponent(e.name)}`) : null;

  return (
    <Screen>
      <NavBar
        scrollY={scrollY}
        title={e.name}
        left={<BackButton label="Directory" />}
        right={
          <NavButton
            label={following ? 'Following' : 'Follow'}
            onPress={() => {
              haptic.selection();
              setFollow(followKey, following ? null : 'important');
            }}
          />
        }
      />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: top + 6, paddingBottom: 40 }}>
        <View style={styles.head}>
          <View style={styles.logo}>
            <Gradient name="embassy" />
            <Txt c={colors.white} w="700" style={{ fontSize: 24 }}>
              {e.mono}
            </Txt>
          </View>
          <Txt v="t2" center style={{ marginTop: 12 }} accessibilityRole="header">
            {e.name}
          </Txt>
          <Txt v="sh" c={colors.l2}>{`${e.desk} · ${e.city}`}</Txt>
          <Badge
            label={state.open ? `Open · closes ${state.closesAt}` : state.opensAt ? `Closed · opens ${state.opensAt}` : 'Closed'}
            tone={state.open ? 'green' : 'gray'}
            icon="clock"
            style={{ marginTop: 8, alignSelf: 'center' }}
          />
        </View>
        <View style={styles.quicks}>
          <QuickAction icon="phone" label="call" onPress={e.phone ? () => open(`tel:${e.phone}`) : null} />
          <QuickAction icon="mail" label="email" onPress={e.email ? () => open(`mailto:${e.email}`) : null} />
          <QuickAction icon="location" label="directions" onPress={directions} />
          <QuickAction icon="share" label="share" onPress={() => shareText(e.name, { kind: 'directory', id: e.id }).catch(() => undefined)} />
        </View>
        <Group style={{ marginTop: 18 }}>
          <Cell>
            <Txt v="fn">{`${e.desk.toLowerCase()} phone`}</Txt>
            <Txt c={e.phone ? colors.tint : colors.l2} num>
              {e.phone ?? 'Not verified yet'}
            </Txt>
          </Cell>
          <Cell>
            <Txt v="fn">email</Txt>
            <Txt c={e.email ? colors.tint : colors.l2}>{e.email ?? 'Not verified yet'}</Txt>
          </Cell>
          <Cell>
            <Txt v="fn">address</Txt>
            <Txt>{e.street ? `${e.street}\n${e.city}, ${e.country}` : `${e.city}, ${e.country}`}</Txt>
          </Cell>
        </Group>
        <GroupHeader>{`Hours · ${e.city} time`}</GroupHeader>
        <Group>
          {e.hours.map((h) => (
            <Cell key={h.label} title={h.label} detail={`${h.open} – ${h.close}`} />
          ))}
          {e.hours.flatMap((h) => h.days).length < 7 && <Cell title="Other days" detail="Closed" />}
        </Group>
        {e.services.length > 0 && (
          <>
            <GroupHeader>Services</GroupHeader>
            <Group inset={INSET.tile}>
              {e.services.map((s) => (
                <Cell key={s.title} left={<Tile icon={s.icon} color={s.color} />} title={s.title} subtitle={s.detail} right={s.required ? <Badge label="Required" tone="red" /> : undefined} />
              ))}
            </Group>
          </>
        )}
        <GroupHeader>Office holder</GroupHeader>
        <Group>
          <Cell title={e.officeHolder.role} detail={e.officeHolder.name ?? 'Not verified yet'} />
        </Group>
        <View style={styles.foot}>
          <Txt v="fn" c={colors.l2} num>{`Verified ${formatDate.long(e.verifiedAt)}`}</Txt>
          <Txt v="fn" c={colors.tint} accessibilityRole="link" onPress={() => router.push({ pathname: '/report/[id]', params: { id: e.id, field: 'Directory entry' } })}>
            Suggest a fix
          </Txt>
        </View>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', paddingHorizontal: 20 },
  logo: { width: 88, height: 88, borderRadius: 44, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  quicks: { flexDirection: 'row', gap: 8, paddingTop: 18, paddingHorizontal: 16 },
  quick: { flex: 1, height: 62, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 4 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 32, paddingTop: 10 },
});
