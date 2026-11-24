import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HOME_TIME_ZONE } from '@/config/constants';
import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { useNow } from '@/features/data';
import { provenanceLabel } from '@/features/labels';
import { ADVISORY_STYLE, AdvisoryMap } from '@/features/map/advisory-map';
import { advisoryWhen } from '@/features/map/format';
import { formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { shareText } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import { Badge, Card, Tile } from '@/ui/atoms';
import { CircleButton } from '@/ui/button';
import { Icon, type IconName } from '@/ui/icon';
import { Cell, Group, GroupHeader, INSET } from '@/ui/list';
import { PressableScale } from '@/ui/pressable';
import { Screen, useScrollY } from '@/ui/nav';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const MAP_H = 320;

function Action({ icon, label, onPress, on }: { icon: IconName; label: string; onPress: () => void; on?: boolean }) {
  return (
    <PressableScale feedback="tap" accessibilityRole="button" accessibilityState={on === undefined ? undefined : { selected: on }} onPress={onPress} style={[styles.action, on && { backgroundColor: colors.tint }]}>
      <Icon name={icon} size={17} color={on ? colors.white : colors.tint} />
      <Txt v="c1" w="600" c={on ? colors.white : colors.tint}>
        {label}
      </Txt>
    </PressableScale>
  );
}

export default function AdvisoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const roads = useQuery(q.roads(useApi()));
  const now = useNow();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { scrollY, onScroll } = useScrollY();
  const alerting = usePrefs((s) => s.advisoryAlerts[id] ?? false);
  const set = usePrefs((s) => s.set);
  const all = usePrefs((s) => s.advisoryAlerts);
  // Map parallax: it drifts up slower than the sheet that slides over it.
  const mapStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(scrollY.get(), [-100, 0, MAP_H], [40, 0, -MAP_H / 3]) }] }));
  const a = roads.data?.advisories.find((x) => x.id === id);
  if (!roads.data || !a) return <Screen>{roads.isPending ? null : <ErrorScreen error={roads.error ?? new Error('not_found')} onRetry={() => roads.refetch()} />}</Screen>;
  const s = ADVISORY_STYLE[a.status];
  const prov = provenanceLabel(a.provenance);
  const directions = () => {
    const { latitude, longitude } = a.marker;
    Linking.openURL(Platform.OS === 'ios' ? `maps://?daddr=${latitude},${longitude}` : `geo:${latitude},${longitude}?q=${encodeURIComponent(a.road)}`).catch(() => undefined);
  };

  return (
    <Screen>
      <Animated.View style={[styles.map, { width }, mapStyle]} pointerEvents="none">
        <AdvisoryMap roads={roads.data} visible={[a]} selectedId={a.id} interactive={false} />
      </Animated.View>
      <View style={[styles.back, { top: insets.top + 6 }]}>
        <CircleButton icon="chevronLeft" label="Back" variant="glass" size={40} onPress={() => router.back()} />
      </View>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: MAP_H - 20, paddingBottom: insets.bottom + 40 }}>
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={styles.between}>
              <Badge label={a.status === 'closed' ? 'Closed' : a.status === 'partial' ? 'One lane' : 'Upcoming'} tone={a.status === 'closed' ? 'red' : a.status === 'partial' ? 'orange' : 'gray'} icon={s.icon} />
              <Txt v="fn" c={colors.l2} num>{`As of ${formatTime(a.asOf)}`}</Txt>
            </View>
            <Txt v="t2" style={{ marginTop: 8 }} accessibilityRole="header">
              {a.headline}
            </Txt>
            <Txt v="sh" c={colors.l2}>{`${a.issuer} · road advisory`}</Txt>
            <Txt v="t1" num style={{ marginTop: 10 }}>
              {advisoryWhen(a, now, HOME_TIME_ZONE)}
            </Txt>
          </View>
          <View style={styles.actions}>
            <Action icon="bell" label={alerting ? 'Alerting' : 'Alert me'} on={alerting} onPress={() => { haptic.selection(); set('advisoryAlerts', { ...all, [a.id]: !alerting }); }} />
            <Action icon="location" label="Directions" onPress={directions} />
            <Action icon="share" label="Share" onPress={() => shareText(a.headline, { kind: 'advisory', id: a.id }).catch(() => undefined)} />
          </View>
          {a.onRoute && a.routeOverlap && (
            <Card style={styles.route}>
              <Tile icon="car" color="orange" size="m" />
              <View style={{ flex: 1 }}>
                <Txt v="hl">On your route</Txt>
                <Txt v="fn" c={colors.l2} num>
                  {a.routeOverlap}
                </Txt>
              </View>
            </Card>
          )}
          {a.steps.length > 0 && (
            <>
              <GroupHeader>Diversion</GroupHeader>
              <Group inset={INSET.tile}>
                {a.steps.map((st) => (
                  <Cell key={st.title} left={<Tile icon={st.icon} color="tint" />} title={st.title} subtitle={st.detail} />
                ))}
              </Group>
            </>
          )}
          <GroupHeader>Source</GroupHeader>
          <Group inset={INSET.tile}>
            <Cell left={<Tile icon={prov.icon} color={prov.tone === 'green' ? 'green' : 'gray'} />} title={prov.label} subtitle={a.sourceLabel} />
          </Group>
        </View>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { position: 'absolute', top: 0, left: 0, height: MAP_H + 60 },
  back: { position: 'absolute', left: 16, zIndex: 10 },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 14, borderTopRightRadius: 14, minHeight: 700, boxShadow: '0 -6px 24px rgba(0,0,0,0.1)' },
  grab: { width: 36, height: 5, borderRadius: 3, backgroundColor: colors.l3, alignSelf: 'center', marginTop: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  action: { flex: 1, height: 56, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 3 },
  route: { marginTop: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
