import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { useInstitutionLookup, useNow } from '@/features/data';
import { ProvenanceLabel } from '@/features/record/parts';
import { formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { usePrefs } from '@/state/prefs';
import { IconTile, Tag } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Group, GroupLabel, INSET, Row } from '@/ui/list';
import { Dock, useDockInset, useHeroTitle, useScrollY } from '@/ui/nav';
import { Photo } from '@/ui/photo';
import { EmptyState, ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, radius, useColors } from '@/ui/theme';

export default function AlertDetail() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bottom = useDockInset();
  const { scrollY, onScroll } = useScrollY();
  const alerts = useQuery(q.safetyAlerts(useApi()));
  const lookup = useInstitutionLookup();
  const now = useNow().getTime();
  const dismissed = usePrefs((s) => s.dismissedAlerts);
  const set = usePrefs((s) => s.set);
  const alert = alerts.data?.find((a) => a.id === id);
  const expired = alert ? new Date(alert.until).getTime() <= now : false;
  const minutesLeft = alert ? Math.max(0, Math.round((new Date(alert.until).getTime() - now) / 60_000)) : 0;
  useHeroTitle(scrollY, 60, alert?.title ?? '');

  if (!alert) {
    if (!alerts.data) return alerts.isError ? <ErrorScreen error={alerts.error} onRetry={() => alerts.refetch()} /> : null;
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <EmptyState icon="checkCircle" title="This alert has ended" body="Alerts expire on their own. Nothing is active for your area right now." action={{ label: 'Back to Home', onPress: () => router.replace('/home') }} />
      </ScrollView>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: 8, paddingBottom: bottom }}>
        <View style={styles.head}>
          <View style={styles.sev}>
            <IconTile icon="rain" tone="bad" size={44} />
            <View style={{ flex: 1 }}>
              <Txt v="callout" w="semibold" c={colors.bad}>
                {alert.severity === 'warning' ? 'Warning' : 'Watch'}
              </Txt>
              <Txt v="footnote" c={colors.ink2}>{`${lookup(alert.issuerId).name} · issued ${formatTime(alert.issuedAt)}`}</Txt>
            </View>
            {expired ? <Tag label="Expired" icon="clock" /> : <Tag label={`Until ${formatTime(alert.until)}`} icon="clock" tone="bad" />}
          </View>
          <Txt v="title1" style={{ marginTop: 18 }} accessibilityRole="header">
            {alert.title}
          </Txt>
          <Txt v="body" c={colors.ink2} style={{ marginTop: 8 }}>
            {`${alert.area}. ${alert.advice}.`}
          </Txt>
        </View>
        {alert.photo && (
          <View style={styles.photo}>
            <Photo id={alert.photo} aspect={16 / 9} radius={radius.lg} />
          </View>
        )}
        <GroupLabel>What to do</GroupLabel>
        <View style={styles.steps}>
          {alert.steps.map((s, i) => (
            <View key={s} style={[styles.step, i > 0 && styles.stepLine]}>
              <View style={styles.num}>
                <Txt v="footnote" w="medium" num>
                  {i + 1}
                </Txt>
              </View>
              <Txt v="callout" style={{ flex: 1 }}>
                {s}
              </Txt>
            </View>
          ))}
        </View>
        <GroupLabel>About this alert</GroupLabel>
        <Group inset={INSET.tile}>
          <Row left={<IconTile icon="clock" />} title={expired ? 'Expired' : `Expires in ${minutesLeft >= 60 ? `${Math.floor(minutesLeft / 60)} h ${minutesLeft % 60} min` : `${minutesLeft} min`}`} subtitle="Alerts end on their own; Imboni removes it then" />
          <Row left={<IconTile icon="pin" />} title={alert.area} subtitle="Matched to the place in your profile" />
          <Row left={<IconTile icon="bank" tone="teal" />} title={lookup(alert.issuerId).name} subtitle={alert.source} chevron onPress={() => router.push(toHref({ kind: 'institution', id: alert.issuerId }))} />
        </Group>
        <View style={styles.provenance}>
          <ProvenanceLabel provenance="official" institution={lookup(alert.issuerId).name} source={alert.source} at={alert.issuedAt} />
        </View>
      </Animated.ScrollView>
      <Dock>
        <Button
          label={dismissed.includes(alert.id) ? 'Hidden from Home' : 'Hide from Home'}
          variant="secondary"
          disabled={dismissed.includes(alert.id)}
          onPress={() => {
            haptic.tap();
            set('dismissedAlerts', [...dismissed, alert.id]);
            router.back();
          }}
        />
      </Dock>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  head: { paddingHorizontal: GUTTER, paddingTop: 12 },
  sev: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: { paddingHorizontal: GUTTER, paddingTop: 20 },
  steps: { marginHorizontal: GUTTER, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  stepLine: { borderTopWidth: 1, borderTopColor: colors.line },
  num: { width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  provenance: { paddingHorizontal: GUTTER + 4, paddingTop: 12 },
}));
