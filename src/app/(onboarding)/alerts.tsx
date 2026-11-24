import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { usePlaceTimeZone } from '@/features/data';
import { ProgressNav } from '@/features/setup/progress-nav';
import { requestNotifications } from '@/lib/notifications';
import { zoneCity } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import { Badge, Switch, Tile } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Cell, Group, GroupFooter, GroupHeader, INSET } from '@/ui/list';
import { Dock, Screen, useDockInset, useNavInset } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { colors, type Tone } from '@/ui/theme';

const PREVIEWS: { from: string; tag: string; tone: Tone; body: string; dim?: boolean }[] = [
  { from: 'Meteo Rwanda', tag: 'Critical', tone: 'red', body: 'Heavy rain in Kigali until 18:00' },
  { from: 'BNR · Deadline moved', tag: 'High', tone: 'orange', body: '1 Nov → 30 Nov 2026' },
  { from: 'Your day in 6 items', tag: 'Digest 18:00', tone: 'gray', body: 'MINEDUC, NIDA, Embassy and 3 more', dim: true },
];

export default function Alerts() {
  const alerts = usePrefs((s) => s.alerts);
  const set = usePrefs((s) => s.set);
  const city = zoneCity(usePlaceTimeZone());
  const [asking, setAsking] = useState(false);
  const top = useNavInset();
  const bottom = useDockInset(2);

  const enable = async () => {
    setAsking(true);
    // The priming screen explains first; this triggers the one-time iOS system prompt.
    await requestNotifications().catch(() => false);
    setAsking(false);
    router.push('/save');
  };

  return (
    <Screen>
      <ProgressNav step={4} mode="onboarding" />
      <ScrollView contentContainerStyle={{ paddingTop: top + 8, paddingBottom: bottom }}>
        <View style={{ paddingHorizontal: 20 }}>
          <Txt v="t1" accessibilityRole="header">
            Alerts that respect your day
          </Txt>
          <Txt v="co" c={colors.l2} style={{ marginTop: 6 }}>
            Urgent things reach you now. Everything else waits for one daily summary.
          </Txt>
        </View>
        <View style={styles.previews} accessibilityLabel="Example notifications">
          {PREVIEWS.map((p, i) => (
            <Animated.View key={p.from} entering={FadeInUp.delay(100 + i * 120).springify().damping(18)} style={[styles.preview, p.dim && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}>
              <View style={styles.appIcon}>
                <Icon name="eye" size={17} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.between}>
                  <Txt v="fn" w="600">
                    {p.from}
                  </Txt>
                  <Badge label={p.tag} tone={p.tone} style={{ height: 18 }} />
                </View>
                <Txt v="fn" numberOfLines={1}>
                  {p.body}
                </Txt>
              </View>
            </Animated.View>
          ))}
        </View>
        <GroupHeader>Your settings</GroupHeader>
        <Group inset={INSET.tile}>
          <Cell left={<Tile icon="moon" color="indigo" />} title="Quiet hours" detail={`${alerts.quietStart} – ${alerts.quietEnd}`} />
          <Cell
            left={<Tile icon="warning" color="red" />}
            title="Critical in quiet hours"
            right={<Switch label="Critical alerts in quiet hours" value={alerts.criticalInQuiet} onChange={(v) => set('alerts', { ...alerts, criticalInQuiet: v })} />}
          />
          <Cell left={<Tile icon="bell" color="orange" />} title="Daily limit" detail={String(alerts.dailyLimit)} />
        </Group>
        <GroupFooter>{`Times follow ${city}. Critical alerts never count toward the limit.`}</GroupFooter>
      </ScrollView>
      <Dock>
        <Button label="Turn on notifications" loading={asking} onPress={enable} />
        <Button label="Not now" variant="plain" onPress={() => router.push('/save')} />
      </Dock>
    </Screen>
  );
}

const styles = StyleSheet.create({
  previews: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
  preview: { backgroundColor: colors.card, borderRadius: 20, paddingVertical: 11, paddingHorizontal: 13, flexDirection: 'row', gap: 10, alignItems: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.06)' },
  appIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
