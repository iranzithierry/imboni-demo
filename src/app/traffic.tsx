import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { MapType } from 'react-native-maps';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HOME_TIME_ZONE } from '@/config/constants';
import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Advisory } from '@/data/schema';
import { useNow } from '@/features/data';
import { advisoryStatusLabel } from '@/features/labels';
import { AdvisoryMap, type AdvisoryMapHandle } from '@/features/map/advisory-map';
import { advisoryWhen } from '@/features/map/format';
import { useMenu } from '@/features/record/menu';
import { AsOf } from '@/features/record/parts';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { IconTile, Tag } from '@/ui/atoms';
import { IconButton } from '@/ui/button';
import { HeaderActions } from '@/ui/nav';
import { Highlight } from '@/ui/pressable';
import { Segmented } from '@/ui/segmented';
import { DetentSheet } from '@/ui/sheet';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, useColors } from '@/ui/theme';

type Filter = 'active' | 'upcoming' | 'route';
// "Now" covers what is happening or starts within a day and a half; anything later is upcoming.
const SOON_MS = 36 * 3_600_000;
const matches = (a: Advisory, f: Filter) => {
  const from = new Date(a.window.from).getTime();
  const to = new Date(a.window.to).getTime();
  const now = Date.now();
  if (f === 'route') return a.onRoute && to > now;
  return f === 'active' ? from <= now + SOON_MS && to > now : from > now + SOON_MS;
};

export default function Traffic() {
  const colors = useColors();
  const styles = useStyles();
  const roads = useQuery(q.roads(useApi()));
  const now = useNow();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const menu = useMenu();
  const map = useRef<AdvisoryMapHandle>(null);
  const [filter, setFilter] = useState<Filter>('active');
  const [selected, setSelected] = useState<string | null>('kn3');
  const [detent, setDetent] = useState(1);
  const [mapType, setMapType] = useState<MapType>('standard');
  const detents = [132, Math.round(height * 0.46), Math.round(height - insets.top - 64)];

  const data = roads.data;
  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: 'Roads' }} />
        {!roads.isPending && <ErrorScreen error={roads.error} onRetry={() => roads.refetch()} />}
      </>
    );
  }
  const count = (f: Filter) => data.advisories.filter((a) => matches(a, f)).length;
  const visible = data.advisories.filter((a) => matches(a, filter));
  const onRoute = data.advisories.filter((a) => a.onRoute).length;
  const stale = now.getTime() - new Date(data.asOf).getTime() > 60 * 60_000;
  const mapStyles = [
    { label: mapType === 'standard' ? 'Standard (current)' : 'Standard', onPress: () => setMapType('standard') },
    { label: mapType === 'hybrid' ? 'Satellite (current)' : 'Satellite', onPress: () => setMapType('hybrid') },
  ];

  const select = (a: Advisory) => {
    haptic.selection();
    setSelected(a.id);
    map.current?.focus(a);
    if (detent === 2) setDetent(1);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* The sheet carries the "Roads" heading; over the map the bar keeps only its buttons. The title still names the back menu. */}
      <Stack.Screen options={{ title: 'Roads', headerTitle: Platform.OS === 'ios' ? '' : 'Roads' }} />
      <HeaderActions
        actions={[
          { icon: 'layers', label: 'Map style', onPress: () => menu(mapStyles), menu: mapStyles },
          { icon: 'location', label: 'My location', onPress: () => map.current?.locate() },
        ]}
      />
      <AdvisoryMap ref={map} roads={data} visible={visible} selectedId={selected} onSelect={select} mapType={mapType} bottomInset={detents[detent] ?? 0} />
      <DetentSheet
        detents={detents}
        index={detent}
        onIndexChange={setDetent}
        header={
          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}>
              <Txt v="title2" accessibilityRole="header">
                Roads
              </Txt>
              <View style={{ marginTop: 4 }}>
                <AsOf iso={data.asOf} stale={stale} />
              </View>
            </View>
            {onRoute > 0 && <Tag label={`${onRoute} on your route`} tone="bad" icon="car" />}
          </View>
        }>
        {detent > 0 && (
          <Animated.View entering={FadeIn.duration(motion.fast)} style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: GUTTER, paddingTop: 10 }}>
              <Segmented
                accessibilityLabel="Advisory filter"
                options={[
                  { value: 'active', label: 'Now', count: count('active') },
                  { value: 'upcoming', label: 'Upcoming', count: count('upcoming') },
                  { value: 'route', label: 'My route', count: count('route') },
                ]}
                value={filter}
                onChange={setFilter}
              />
            </View>
            <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 20 }}>
              {visible.map((a) => {
                const l = advisoryStatusLabel(a.status);
                const on = a.id === selected;
                return (
                  <View key={a.id} style={[styles.row, on && styles.rowOn]}>
                    <Highlight accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${l.label}. ${a.headline}. ${advisoryWhen(a, now, HOME_TIME_ZONE)}`} onPress={() => select(a)} style={styles.rowMain}>
                      <IconTile icon={l.icon} tone={l.tone === 'bad' ? 'bad' : l.tone === 'warn' ? 'warn' : 'neutral'} size={40} />
                      <View style={{ flex: 1 }}>
                        <Txt v="callout" w="semibold" numberOfLines={1}>
                          {a.headline}
                        </Txt>
                        <Txt v="footnote" c={colors.ink2} num numberOfLines={1}>{`${l.label} · ${advisoryWhen(a, now, HOME_TIME_ZONE)}${a.onRoute ? ' · your route' : ''}`}</Txt>
                      </View>
                    </Highlight>
                    <IconButton icon="chevronRight" label={`Open ${a.headline}`} variant="plain" size={36} onPress={() => router.push(toHref({ kind: 'advisory', id: a.id }))} />
                  </View>
                );
              })}
              {!visible.length && (
                <Txt v="subhead" c={colors.ink2} center style={{ paddingTop: 24, paddingHorizontal: GUTTER }}>
                  {filter === 'route' ? 'Nothing on your route. You’ll get a push the evening before anything is.' : 'Nothing here right now.'}
                </Txt>
              )}
            </ScrollView>
          </Animated.View>
        )}
      </DetentSheet>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: GUTTER, paddingRight: 12, paddingVertical: 8 },
  rowOn: { backgroundColor: colors.canvas },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
}));
