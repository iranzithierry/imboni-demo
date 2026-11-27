import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Action } from '@/data/schema';
import { useActions, useInstitutionLookup, usePlaceTimeZone, useToday } from '@/features/data';
import { situationLabel } from '@/features/setup/situations';
import { useSuggestedSources } from '@/features/setup/sources';
import { useTracker } from '@/features/tracking';
import { formatDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { zoneCity, type Place } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import { useSession } from '@/state/session';
import { IconTile, Tag } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Group, GroupLabel, INSET, Row } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { Dock, useDockInset } from '@/ui/nav';
import { Photo } from '@/ui/photo';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, radius, useColors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

/** The first required action that applies to this person and is still open. */
function firstRequired(actions: readonly Action[], situations: readonly string[], place: Place, today: string) {
  const open = actions.filter((a) => a.required && a.deadline >= today);
  return (place.mode === 'abroad' ? open.find((a) => a.forAbroad) : undefined) ?? open.find((a) => a.forSituations.some((s) => situations.includes(s))) ?? open[0];
}

export default function Ready() {
  const colors = useColors();
  const styles = useStyles();
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
    if (isTracked) await tracker.stop(action.id);
    else {
      const outcome = await tracker.start(action, ['Me'], 'standard', false);
      haptic.success();
      if (outcome.reminders === 'permission_denied') toast({ message: 'Tracking. Turn on notifications in Settings to get reminders.', icon: 'bell' });
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
    <View style={{ flex: 1 }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: bottom }}>
        <View style={styles.head}>
          <IconTile icon="check" tone="brand" solid size={64} />
          <Txt v="title1" style={{ marginTop: 20 }} accessibilityRole="header">
            You’re all set
          </Txt>
          <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>
            {`Imboni is watching ${watching || suggested.length} official sources for you.${action ? ' One thing already needs you.' : ''}`}
          </Txt>
        </View>

        {action && (
          <View style={styles.card}>
            {action.photo && <Photo id={action.photo} aspect={16 / 8} radius={radius.lg} />}
            <View style={styles.cardBody}>
              <View style={styles.between}>
                <Tag label="Required for you" tone="onDark" icon="exclamation" />
                <InstitutionLogo id={action.institutionId} label={lookup(action.institutionId).mono} size="s" />
              </View>
              <Txt v="title2" c={colors.white} style={{ marginTop: 16 }}>
                {action.title}
              </Txt>
              <Txt v="subhead" c={colors.nightInk2} style={{ marginTop: 6 }}>
                {`${lookup(action.institutionId).name} · due ${formatDate.long(action.deadline)}`}
              </Txt>
              <View style={styles.cardActions}>
                <Button label={busy ? 'Saving…' : isTracked ? 'Tracking' : 'Track it'} icon={isTracked ? 'check' : 'plus'} variant="light" size="md" hug onPress={toggleTrack} />
                {action.directoryId && <Button label="Where to go" variant="onDark" size="md" hug onPress={() => router.push(toHref({ kind: 'directory', id: action.directoryId ?? '' }))} />}
              </View>
            </View>
          </View>
        )}

        <GroupLabel>Your setup</GroupLabel>
        <Group inset={INSET.tile}>
          <Row left={<IconTile icon="people" tone="pink" solid />} title="Situations" detail={situations.map(situationLabel).join(', ') || 'None'} />
          <Row left={<IconTile icon="globe" tone="sky" solid />} title="Time zone" detail={city} />
          <Row left={<IconTile icon="bell" tone="brand" solid />} title="Digest" detail={digest === 'daily' ? 'Daily at 18:00' : 'Sundays at 18:00'} />
          <Row left={<IconTile icon="lock" tone="green" solid />} title="Account" detail={account ? 'Synced' : 'On this phone'} />
        </Group>
      </ScrollView>
      <Dock>
        <Button label="Open Imboni" trailingIcon="arrowRight" onPress={finish} />
      </Dock>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  head: { paddingHorizontal: GUTTER + 4, paddingTop: 8 },
  card: { marginTop: 28, marginHorizontal: GUTTER, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.night, padding: 8 },
  cardBody: { padding: 12, paddingTop: 14 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 18 },
}));
