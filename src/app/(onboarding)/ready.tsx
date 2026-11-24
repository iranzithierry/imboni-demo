import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Action } from '@/data/schema';
import { useActions, useInstitutionLookup, usePlaceTimeZone, useToday } from '@/features/data';
import { situationLabel } from '@/features/setup/situations';
import { useSuggestedSources } from '@/features/setup/sources';
import { useTracker } from '@/features/tracking';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { zoneCity, type Place } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import { useSession } from '@/state/session';
import { GlassBadge, Gradient, Initials, Tile } from '@/ui/atoms';
import { Button, CapButton } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Cell, Group, GroupHeader, INSET } from '@/ui/list';
import { Dock, Screen, useDockInset } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

/** The first required action that applies to this person and is still open. */
function firstRequired(actions: readonly Action[], situations: readonly string[], place: Place, today: string) {
  const open = actions.filter((a) => a.required && a.deadline >= today);
  return (
    (place.mode === 'abroad' ? open.find((a) => a.forAbroad) : undefined) ??
    open.find((a) => a.forSituations.some((s) => situations.includes(s))) ??
    open[0]
  );
}

export default function Ready() {
  const top = useSafeAreaInsets().top;
  const bottom = useDockInset();
  const today = useToday();
  const city = zoneCity(usePlaceTimeZone());
  const { data: actions } = useActions();
  const lookup = useInstitutionLookup();
  const situations = usePrefs((s) => s.situations);
  const place = usePrefs((s) => s.place);
  const follows = usePrefs((s) => s.follows);
  const digest = usePrefs((s) => s.alerts.digest);
  const tracked = usePrefs((s) => s.tracked);
  const complete = usePrefs((s) => s.completeOnboarding);
  const setFollow = usePrefs((s) => s.setFollow);
  const account = useSession((s) => s.session.kind === 'account');
  const suggested = useSuggestedSources().flatMap((g) => g.institutions);
  const tracker = useTracker();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const watching = Object.values(follows).filter((l) => l !== 'off').length;
  const action = actions ? firstRequired(actions, situations, place, today) : undefined;
  const isTracked = action ? Boolean(tracked[action.id]) : false;

  const toggleTrack = async () => {
    if (!action) return;
    setBusy(true);
    if (isTracked) {
      await tracker.stop(action.id);
    } else {
      const outcome = await tracker.start(action, ['Me'], 'standard', false);
      haptic.success();
      if (outcome.reminders === 'permission_denied') toast({ message: 'Tracking. Turn on notifications in Settings to get reminders.', icon: 'bell', iconColor: colors.orange });
    }
    setBusy(false);
  };

  const finish = () => {
    // Someone who skipped every source still gets the national ones.
    if (watching === 0) for (const i of suggested) setFollow(i.id, 'important');
    haptic.success();
    complete();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: top, paddingBottom: bottom }}>
        <View style={styles.hero}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.check}>
            <Icon name="check" size={42} color={colors.white} />
          </Animated.View>
          <Txt v="lt" center style={{ marginTop: 20 }} accessibilityRole="header">
            You’re all set
          </Txt>
          <Txt v="co" c={colors.l2} center style={{ marginTop: 6 }}>
            {`Imboni is watching ${watching || suggested.length} official sources for you.${action ? ' One thing needs you already.' : ''}`}
          </Txt>
        </View>

        {action && (
          <Animated.View entering={FadeInUp.delay(150).springify().damping(18)} style={styles.card}>
            <Gradient name="brand" />
            <View style={styles.between}>
              <GlassBadge label="Required for you" icon="exclamation" />
              <Initials label={lookup(action.institutionId).mono} color="tint" size="s" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>
            <Txt v="t2" c={colors.white} style={{ marginTop: 22 }}>
              {action.title}
            </Txt>
            <Txt v="sh" c="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>
              {`${lookup(action.institutionId).name}. Due by ${new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(action.deadline))}.`}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <CapButton label={busy ? 'Saving…' : isTracked ? 'Tracking' : 'Track'} icon={isTracked ? 'check' : 'plus'} variant={isTracked ? 'solid' : 'glass'} height={36} onPress={toggleTrack} />
              {action.directoryId && <CapButton label="Where to go" variant="glass" height={36} onPress={() => router.push(toHref({ kind: 'directory', id: action.directoryId ?? '' }))} />}
            </View>
          </Animated.View>
        )}

        <GroupHeader>Your setup</GroupHeader>
        <Group inset={INSET.tile}>
          <Cell left={<Tile icon="people" color="pink" />} title="Situations" detail={situations.map(situationLabel).join(', ') || 'None'} />
          <Cell left={<Tile icon="globe" color="indigo" />} title="Time zone" detail={city} />
          <Cell left={<Tile icon="bell" color="orange" />} title="Digest" detail={digest === 'daily' ? 'Daily 18:00' : 'Sundays 18:00'} />
          <Cell left={<Tile icon="lock" color="green" />} title="Account" detail={account ? 'Synced' : 'On this iPhone'} />
        </Group>
      </ScrollView>
      <Dock>
        <Button label="Open Imboni" onPress={finish} />
      </Dock>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  check: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(52,199,89,0.35)' },
  card: { marginTop: 26, marginHorizontal: 16, borderRadius: 22, overflow: 'hidden', padding: 18 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
