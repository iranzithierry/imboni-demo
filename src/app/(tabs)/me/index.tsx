import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScrollView, Share, StyleSheet, View } from 'react-native';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { queryClient, queryPersister } from '@/data/query-client';
import type { Language } from '@/data/schema';
import { useMenu } from '@/features/record/menu';
import { situationLabel } from '@/features/setup/situations';
import { reportError, toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { cancelReminders } from '@/lib/notifications';
import { placeLabel } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import { PrefsSchema, type ThemePref } from '@/state/schema';
import { useSession } from '@/state/session';
import { IconTile, Switch } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Group, GroupLabel, GroupNote, INSET, Row } from '@/ui/list';
import { PressableScale } from '@/ui/pressable';
import { BarTitle } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, palettes, radius, useColors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

const LANGUAGE_NAME: Record<Language, string> = { EN: 'English', FR: 'Français', RW: 'Kinyarwanda' };
const METHOD = { phone: 'phone', apple: 'Apple', google: 'Google' } as const;
const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Automatic' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function Profile() {
  const colors = useColors();
  const styles = useStyles();
  const api = useApi();
  const toast = useToast();
  const menu = useMenu();
  const session = useSession((s) => s.session);
  const signOut = useSession((s) => s.signOut);
  const prefs = usePrefs();
  const storylines = useQuery(q.storylines(api));
  const followedInstitutions = Object.values(prefs.follows).filter((l) => l !== 'off').length;
  const followedStorylines = (storylines.data ?? []).filter((s) => prefs.storylines[s.id] && prefs.storylines[s.id] !== 'off').length;
  const openReports = prefs.reports.filter((r) => r.status !== 'resolved').length;
  const rateAlerts = Object.values(prefs.rateAlerts).filter(Boolean).length;
  const account = session.kind === 'account' ? session : null;
  const situations = prefs.situations.length > 2 ? `${prefs.situations.length} selected` : prefs.situations.map(situationLabel).join(', ') || 'None';

  const wipeDevice = async () => {
    await cancelReminders(Object.values(prefs.tracked).flatMap((t) => t.notificationIds));
    queryClient.clear();
    prefs.reset();
    await signOut();
  };

  const exportData = async () => {
    // Only the person's own settings and tracking; no session token.
    const data = PrefsSchema.parse(usePrefs.getState());
    await Share.share({ title: 'My Imboni data', message: JSON.stringify({ exportedAt: new Date().toISOString(), account: account ? { userId: account.userId, method: account.method } : null, data }, null, 2) });
  };

  const confirmDelete = () =>
    menu(
      [
        {
          label: account ? 'Delete account' : 'Erase',
          destructive: true,
          onPress: async () => {
            try {
              if (account) await api.deleteAccount(account);
              await wipeDevice();
              haptic.success();
            } catch (e) {
              const err = toAppError(e);
              reportError(err, 'delete-account');
              toast({ message: userMessage(err.code), icon: 'warning' });
            }
          },
        },
      ],
      account ? 'Delete your account?' : 'Erase Imboni from this phone?',
      account ? 'Follows, tracked actions and reports are erased within 30 days. Published records stay.' : 'Your setup, tracked actions and reminders on this device are removed.',
    );

  const chooseLanguage = () =>
    menu(
      (Object.keys(LANGUAGE_NAME) as Language[]).map((l) => ({ label: l === prefs.contentLanguage ? `${LANGUAGE_NAME[l]} (current)` : LANGUAGE_NAME[l], onPress: () => prefs.setLanguage(l) })),
      'Content language',
      'Notices show in this language. The original is always one tap away.',
    );

  return (
    <>
      <BarTitle title="Profile" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Txt v="title1" c={colors.onAccent}>
              {account ? (account.displayName[0] ?? 'Y') : 'G'}
            </Txt>
          </View>
          <Txt v="title2" style={{ marginTop: 12 }}>
            {account ? account.displayName : 'Guest'}
          </Txt>
          <Txt v="subhead" c={colors.ink2} style={{ marginTop: 2 }}>
            {account ? `Signed in with ${METHOD[account.method]} · synced` : 'Saved on this phone only'}
          </Txt>
          <View style={styles.stats}>
            {[
              { n: Object.keys(prefs.tracked).length, label: 'Tracking', go: () => router.navigate('/tracking') },
              { n: followedInstitutions, label: 'Following', go: () => router.push('/settings/sources') },
              { n: prefs.saved.length, label: 'Saved', go: () => router.push('/saved') },
            ].map((x) => (
              <PressableScale key={x.label} accessibilityRole="button" accessibilityLabel={`${x.label}, ${x.n}`} onPress={x.go} style={styles.stat}>
                <Txt v="title3" num>
                  {x.n}
                </Txt>
                <Txt v="caption" c={colors.ink2}>
                  {x.label}
                </Txt>
              </PressableScale>
            ))}
          </View>
        </View>

        {!account && (
          <View style={styles.signIn}>
            <View style={{ flex: 1 }}>
              <Txt v="headline">Keep your setup everywhere</Txt>
              <Txt v="footnote" c={colors.ink2} style={{ marginTop: 2 }}>
                Sign in to sync follows and reminders, and to report mistakes.
              </Txt>
            </View>
            <Button label="Sign in" size="sm" hug onPress={() => router.push({ pathname: '/auth', params: { next: 'me' } })} />
          </View>
        )}

        <GroupLabel>Your Imboni</GroupLabel>
        <Group inset={INSET.tile}>
          <Row left={<IconTile icon="people" />} title="Life situations" detail={situations} chevron onPress={() => router.push('/settings/situations')} />
          <Row left={<IconTile icon="pin" />} title="Place" detail={placeLabel(prefs.place)} chevron onPress={() => router.push('/settings/place')} />
          <Row left={<IconTile icon="bank" />} title="Institutions" detail={String(followedInstitutions)} chevron onPress={() => router.push('/settings/sources')} />
          <Row left={<IconTile icon="list" />} title="Storylines" detail={String(followedStorylines)} chevron onPress={() => router.navigate('/tracking')} />
          <Row left={<IconTile icon="flag" />} title="My reports" detail={openReports ? `${openReports} open` : 'None open'} chevron onPress={() => router.push('/reports')} />
        </Group>

        <GroupLabel>Notifications</GroupLabel>
        <Group inset={INSET.tile}>
          <Row left={<IconTile icon="bell" />} title="Alerts and quiet hours" detail={`${prefs.alerts.quietStart}–${prefs.alerts.quietEnd}`} chevron onPress={() => router.push('/alert-levels')} />
          <Row left={<IconTile icon="chart" />} title="Rate alerts" detail={String(rateAlerts)} chevron onPress={() => router.push('/rates')} />
          <Row left={<IconTile icon="car" />} title="Saved routes" detail="1" chevron onPress={() => router.push('/traffic')} />
        </Group>

        <GroupLabel>Appearance</GroupLabel>
        <View style={styles.themes} accessibilityRole="radiogroup">
          {THEMES.map((t) => (
            <PressableScale
              key={t.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: prefs.theme === t.value }}
              accessibilityLabel={t.value === 'system' ? 'Automatic, follows your phone' : t.label}
              onPress={() => {
                haptic.selection();
                prefs.set('theme', t.value);
              }}
              style={styles.theme}>
              <ThemePreview value={t.value} on={prefs.theme === t.value} />
              <Txt v="footnote" w={prefs.theme === t.value ? 'semibold' : 'medium'} c={prefs.theme === t.value ? colors.ink : colors.ink2} style={{ marginTop: 8 }}>
                {t.label}
              </Txt>
            </PressableScale>
          ))}
        </View>
        <Group inset={INSET.tile} style={{ marginTop: 10 }}>
          <Row left={<IconTile icon="translate" />} title="Content language" detail={LANGUAGE_NAME[prefs.contentLanguage]} chevron onPress={chooseLanguage} />
        </Group>

        <GroupLabel>Data and storage</GroupLabel>
        <Group inset={INSET.tile}>
          <Row
            left={<IconTile icon="download" />}
            title="Offline copies"
            subtitle="Tracked and viewed items stay readable offline"
            right={
              <Switch
                label="Offline copies"
                value={prefs.offlineCopies}
                onChange={(v) => {
                  prefs.set('offlineCopies', v);
                  if (!v) Promise.resolve(queryPersister.removeClient()).catch(() => undefined);
                }}
              />
            }
          />
          <Row left={<IconTile icon="leaf" />} title="Low-data mode" subtitle="Photos load on tap" right={<Switch label="Low-data mode" value={prefs.lowData} onChange={(v) => prefs.set('lowData', v)} />} />
          <Row left={<IconTile icon="share" />} title="Download my data" chevron onPress={() => exportData().catch(() => undefined)} />
        </Group>

        <GroupLabel>About</GroupLabel>
        <Group inset={INSET.tile}>
          <Row left={<IconTile icon="photo" />} title="Photo credits" chevron onPress={() => router.push('/credits')} />
        </Group>

        <Group inset={INSET.tile} style={{ marginTop: 28 }}>
          {account && (
            <Row
              left={<IconTile icon="undo" />}
              title="Sign out"
              onPress={async () => {
                await signOut();
                haptic.success();
              }}
            />
          )}
          <Row left={<IconTile icon="trash" tone="red" />} title={account ? 'Delete account' : 'Erase this phone’s data'} tone="danger" onPress={confirmDelete} />
        </Group>
        <GroupNote>Imboni is independent, not a government app. Every item links to its official source.</GroupNote>
      </ScrollView>
    </>
  );
}

/** A tiny screen in each scheme, so the choice is seen rather than read. Automatic shows both halves. */
function ThemePreview({ value, on }: { value: ThemePref; on: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  const half = (scheme: 'light' | 'dark') => {
    const p = palettes[scheme];
    return (
      <View style={[styles.previewHalf, { backgroundColor: p.canvas }]}>
        <View style={[styles.previewBar, { backgroundColor: p.accent }]} />
        <View style={[styles.previewLine, { backgroundColor: p.card, width: '80%' }]} />
        <View style={[styles.previewLine, { backgroundColor: p.card, width: '60%' }]} />
      </View>
    );
  };
  return (
    <View style={[styles.preview, { borderColor: on ? colors.accent : colors.line, borderWidth: on ? 2 : 1 }]}>
      {value === 'dark' ? half('dark') : half('light')}
      {value === 'system' && <View style={styles.previewSplit}>{half('dark')}</View>}
    </View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    head: { alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 4 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    stats: { flexDirection: 'row', gap: 8, marginTop: 18, alignSelf: 'stretch' },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
    signIn: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: GUTTER, marginTop: 16, padding: 14, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.fill },
    themes: { flexDirection: 'row', gap: 10, marginHorizontal: GUTTER, padding: 14, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
    theme: { flex: 1, alignItems: 'center' },
    preview: { width: '100%', aspectRatio: 0.9, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden', flexDirection: 'row' },
    previewHalf: { flex: 1, padding: 8, gap: 5 },
    previewSplit: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', overflow: 'hidden' },
    previewBar: { height: 8, width: '50%', borderRadius: 3 },
    previewLine: { height: 14, borderRadius: 4 },
  }),
);
