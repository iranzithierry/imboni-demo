import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HOME_TIME_ZONE } from '@/config/constants';
import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { useNow } from '@/features/data';
import { advisoryStatusLabel } from '@/features/labels';
import { AdvisoryMap } from '@/features/map/advisory-map';
import { advisoryWhen } from '@/features/map/format';
import { AsOf, ProvenanceLabel } from '@/features/record/parts';
import { haptic } from '@/lib/haptics';
import { shareText } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import { IconTile, Tag } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Group, GroupLabel, INSET, Row } from '@/ui/list';
import { HeaderActions, useHeroTitle, useScrollY } from '@/ui/nav';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, radius, useColors } from '@/ui/theme';

const MAP_H = 300;

export default function AdvisoryScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const roads = useQuery(q.roads(useApi()));
  const now = useNow();
  const top = useSafeAreaInsets().top;
  const { scrollY, onScroll } = useScrollY();
  const alerting = usePrefs((s) => s.advisoryAlerts[id] ?? false);
  const all = usePrefs((s) => s.advisoryAlerts);
  const set = usePrefs((s) => s.set);
  const a = roads.data?.advisories.find((x) => x.id === id);
  useHeroTitle(scrollY, MAP_H - top - 40, a?.road ?? '');
  if (!roads.data || !a) return roads.isPending ? null : <ErrorScreen error={roads.error ?? new Error('not_found')} onRetry={() => roads.refetch()} />;
  const label = advisoryStatusLabel(a.status);
  const stale = now.getTime() - new Date(a.asOf).getTime() > 60 * 60_000;
  const directions = () => {
    const { latitude, longitude } = a.marker;
    Linking.openURL(Platform.OS === 'ios' ? `maps://?daddr=${latitude},${longitude}` : Platform.OS === 'android' ? `geo:${latitude},${longitude}?q=${encodeURIComponent(a.road)}` : `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`).catch(() => undefined);
  };

  return (
    <>
      <HeaderActions actions={[{ icon: 'share', label: 'Share', onPress: () => shareText(a.headline, { kind: 'advisory', id: a.id }).catch(() => undefined) }]} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ height: MAP_H }} pointerEvents="none">
          <AdvisoryMap roads={roads.data} visible={[a]} selectedId={a.id} interactive={false} />
        </View>
        <View style={styles.head}>
          <View style={styles.between}>
            <Tag label={label.label} tone={label.tone} icon={label.icon} />
            <AsOf iso={a.asOf} stale={stale} />
          </View>
          <Txt v="title1" style={{ marginTop: 14 }} accessibilityRole="header">
            {a.headline}
          </Txt>
          <Txt v="subhead" c={colors.ink2} style={{ marginTop: 6 }}>{`${a.issuer} · ${a.area} · ${a.reason}`}</Txt>
          <View style={styles.when}>
            <IconTile icon="clock" size={40} tone="amber" />
            <View style={{ flex: 1 }}>
              <Txt v="caption" c={colors.ink3}>
                When
              </Txt>
              <Txt v="title3" num>
                {advisoryWhen(a, now, HOME_TIME_ZONE)}
              </Txt>
            </View>
          </View>
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button
                label={alerting ? 'Alerting you' : 'Alert me'}
                icon={alerting ? 'check' : 'bell'}
                variant={alerting ? 'tinted' : 'secondary'}
                size="md"
                onPress={() => {
                  haptic.selection();
                  set('advisoryAlerts', { ...all, [a.id]: !alerting });
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Directions" icon="location" variant="secondary" size="md" onPress={directions} />
            </View>
          </View>
        </View>

        {a.onRoute && a.routeOverlap && (
          <View style={styles.route}>
            <IconTile icon="car" tone="warn" size={40} />
            <View style={{ flex: 1 }}>
              <Txt v="callout" w="semibold">{`On your route: ${roads.data.route.label}`}</Txt>
              <Txt v="footnote" c={colors.ink2} num>
                {a.routeOverlap}
              </Txt>
            </View>
          </View>
        )}

        {a.steps.length > 0 && (
          <>
            <GroupLabel>Signed diversion</GroupLabel>
            <Group inset={INSET.tile}>
              {a.steps.map((st) => (
                <Row key={st.title} left={<IconTile icon={st.icon} tone="amber" />} title={st.title} subtitle={st.detail} />
              ))}
            </Group>
          </>
        )}

        <GroupLabel>Source</GroupLabel>
        <Group>
          <Row title={a.sourceLabel} subtitle="Hours and the closed stretch are checked against the post" />
        </Group>
        <View style={styles.provenance}>
          <ProvenanceLabel provenance={a.provenance} institution={a.issuer} source={a.sourceLabel} at={a.asOf} />
        </View>
      </Animated.ScrollView>
    </>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  head: { paddingHorizontal: GUTTER, paddingTop: 20 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  when: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, padding: 14, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: GUTTER, marginTop: 12, padding: 14, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.warnWash },
  provenance: { paddingHorizontal: GUTTER + 4, paddingTop: 12 },
}));
