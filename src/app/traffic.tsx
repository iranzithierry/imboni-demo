import { MenuView } from '@expo/ui/community/menu';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { MapType } from 'react-native-maps';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HOME_TIME_ZONE } from '@/config/constants';
import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Advisory } from '@/data/schema';
import { ADVISORY_STYLE, AdvisoryMap, type AdvisoryMapHandle } from '@/features/map/advisory-map';
import { advisoryWhen } from '@/features/map/format';
import { useNow } from '@/features/data';
import { formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { Badge } from '@/ui/atoms';
import { CircleButton } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Screen } from '@/ui/nav';
import { Segmented } from '@/ui/segmented';
import { DetentSheet } from '@/ui/sheet';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'route', label: 'My route' },
] as const;
type Filter = (typeof FILTERS)[number]['value'];

const matches = (a: Advisory, f: Filter) => (f === 'active' ? a.status !== 'upcoming' : f === 'upcoming' ? a.status === 'upcoming' : a.onRoute);

export default function Traffic() {
  const roads = useQuery(q.roads(useApi()));
  const now = useNow();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const map = useRef<AdvisoryMapHandle>(null);
  const [filter, setFilter] = useState<Filter>('active');
  const [selected, setSelected] = useState<string | null>('kn3');
  const [detent, setDetent] = useState(1);
  const [mapType, setMapType] = useState<MapType>('standard');
  const detents = [150, Math.round(height * 0.45), Math.round(height - insets.top - 60)];

  const data = roads.data;
  if (!data) return <Screen>{roads.isPending ? null : <ErrorScreen error={roads.error} onRetry={() => roads.refetch()} />}</Screen>;
  const visible = data.advisories.filter((a) => matches(a, filter));
  const onRoute = data.advisories.filter((a) => a.onRoute).length;

  const select = (a: Advisory) => {
    haptic.selection();
    setSelected(a.id);
    map.current?.focus(a);
    if (detent === 2) setDetent(1);
  };

  return (
    <Screen statusBar="dark">
      <AdvisoryMap ref={map} roads={data} visible={visible} selectedId={selected} onSelect={select} mapType={mapType} bottomInset={detents[detent] ?? 0} />
      <View style={[styles.back, { top: insets.top + 6 }]}>
        <CircleButton icon="chevronLeft" label="Back" variant="glass" size={40} onPress={() => router.back()} />
      </View>
      <View style={[styles.controls, { top: insets.top + 6 }]}>
        <MenuView
          title="Map"
          actions={[
            { id: 'standard', title: 'Standard', image: 'map', state: mapType === 'standard' ? 'on' : 'off' },
            { id: 'hybrid', title: 'Satellite', image: 'globe.europe.africa', state: mapType === 'hybrid' ? 'on' : 'off' },
          ]}
          onPressAction={({ nativeEvent }) => setMapType(nativeEvent.event === 'hybrid' ? 'hybrid' : 'standard')}>
          <View style={styles.control} accessibilityRole="button" accessibilityLabel="Map layers">
            <Icon name="layers" size={17} color={colors.tint} />
          </View>
        </MenuView>
        <View style={styles.sep} />
        <Pressable style={styles.control} accessibilityRole="button" accessibilityLabel="My location" onPress={() => map.current?.locate()}>
          <Icon name="location" size={17} color={colors.tint} />
        </Pressable>
      </View>
      <DetentSheet
        detents={detents}
        index={detent}
        onIndexChange={setDetent}
        header={
          <View style={styles.sheetHead}>
            <View>
              <Txt v="t2" accessibilityRole="header">
                Roads
              </Txt>
              <Txt v="fn" c={colors.l2} num>{`As of ${formatTime(data.asOf)} · ${data.advisories.length} advisories`}</Txt>
            </View>
            {onRoute > 0 && <Badge label={`${onRoute} on your route`} tone="orange" icon="car" />}
          </View>
        }>
        {detent > 0 && (
          <Animated.View entering={FadeIn} style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <Segmented accessibilityLabel="Advisory filter" options={FILTERS} value={filter} onChange={setFilter} />
            </View>
            <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 20 }}>
              {visible.map((a) => {
                const s = ADVISORY_STYLE[a.status];
                const on = a.id === selected;
                return (
                  <View key={a.id} style={[styles.row, on && { backgroundColor: colors.bg }]}>
                    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => select(a)} style={styles.rowMain}>
                      <View style={[styles.dot, { backgroundColor: s.color }]}>
                        <Icon name={s.icon} size={17} color={colors.white} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt>{a.status === 'partial' ? `${a.road} · one lane` : a.status === 'closed' ? `${a.road} closed` : a.road}</Txt>
                        <Txt v="fn" c={colors.l2} num>{`${advisoryWhen(a, now, HOME_TIME_ZONE)}${a.onRoute ? ' · your route' : ''}`}</Txt>
                      </View>
                    </Pressable>
                    <CircleButton icon="chevronRight" label={`Open ${a.headline}`} onPress={() => router.push(toHref({ kind: 'advisory', id: a.id }))} />
                  </View>
                );
              })}
              {!visible.length && (
                <Txt v="co" c={colors.l2} center style={{ paddingTop: 24 }}>
                  Nothing here right now.
                </Txt>
              )}
            </ScrollView>
          </Animated.View>
        )}
      </DetentSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', left: 16, zIndex: 10 },
  controls: { position: 'absolute', right: 16, zIndex: 10, width: 44, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' },
  control: { height: 44, alignItems: 'center', justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(60,60,67,0.2)' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  dot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
