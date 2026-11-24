import { useActionSheet } from '@expo/react-native-action-sheet';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { queryClient, queryPersister } from '@/data/query-client';
import { PrefsSchema } from '@/state/schema';
import { cancelReminders } from '@/lib/notifications';
import { reportError, toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { placeLabel } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import { useSession } from '@/state/session';
import { Switch, Tile } from '@/ui/atoms';
import { Cell, Group, GroupHeader, INSET } from '@/ui/list';
import { LargeTitle, NavBar, Screen, useScrollY } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

const LANGUAGE_NAME = { EN: 'English', FR: 'Français', RW: 'Kinyarwanda' } as const;

export default function Me() {
  const top = useSafeAreaInsets().top;
  const { scrollY, onScroll } = useScrollY();
  const api = useApi();
  const toast = useToast();
  const { showActionSheetWithOptions } = useActionSheet();
  const session = useSession((s) => s.session);
  const signOut = useSession((s) => s.signOut);
  const prefs = usePrefs();
  const storylines = useQuery(q.storylines(api));
  const followedInstitutions = Object.values(prefs.follows).filter((l) => l !== 'off').length;
  const followedStorylines = (storylines.data ?? []).filter((s) => prefs.storylines[s.id] && prefs.storylines[s.id] !== 'off').length;
  const openReports = prefs.reports.filter((r) => r.status !== 'resolved').length;
  const account = session.kind === 'account' ? session : null;

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

  const confirmDelete = () => {
    showActionSheetWithOptions(
      {
        title: account ? 'Delete your account?' : 'Erase Imboni from this iPhone?',
        message: account ? 'Follows, tracked actions and reports are erased within 30 days. Published records stay.' : 'Your setup, tracked actions and reminders on this device are removed.',
        options: [account ? 'Delete Account' : 'Erase', 'Cancel'],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      async (index) => {
        if (index !== 0) return;
        try {
          if (account) await api.deleteAccount(account);
          await wipeDevice();
          haptic.success();
        } catch (e) {
          const err = toAppError(e);
          reportError(err, 'delete-account');
          toast({ message: userMessage(err.code), icon: 'warning', iconColor: colors.orange, aboveTabBar: true });
        }
      },
    );
  };

  return (
    <Screen>
      <NavBar scrollY={scrollY} title="Me" />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: top, paddingBottom: 110 }}>
        <LargeTitle title="Me" scrollY={scrollY} />
        <Group style={{ marginTop: 12 }}>
          <Cell
            padY={12}
            left={
              <View style={styles.avatar}>
                <Txt v="t2" c={colors.white}>
                  {account ? (account.displayName[0] ?? 'Y') : 'G'}
                </Txt>
              </View>
            }
            chevron={!account}
            onPress={account ? undefined : () => router.push({ pathname: '/auth', params: { next: 'me' } })}>
            <Txt v="t3">{account ? account.displayName : 'Guest'}</Txt>
            <Txt v="fn" c={colors.l2}>
              {account ? `Signed in with ${account.method === 'phone' ? 'phone' : account.method === 'apple' ? 'Apple' : 'Google'}` : 'Sign in to sync, report mistakes and check messages'}
            </Txt>
          </Cell>
        </Group>
        <Group style={{ marginTop: 22 }} inset={INSET.tile}>
          <Cell left={<Tile icon={account ? 'refresh' : 'lock'} color={account ? 'green' : 'gray'} />} title={account ? 'Synced' : 'Saved on this iPhone only'} detail={account ? 'just now' : undefined} />
        </Group>

        <GroupHeader>Profile</GroupHeader>
        <Group inset={INSET.tile}>
          <Cell left={<Tile icon="people" color="pink" />} title="Life situations" detail={String(prefs.situations.length)} chevron onPress={() => router.push('/settings/situations')} />
          <Cell left={<Tile icon="pin" color="orange" />} title="Place" detail={placeLabel(prefs.place)} chevron onPress={() => router.push('/settings/place')} />
          <Cell left={<Tile icon="globe" color="tint" />} title="Content language" detail={LANGUAGE_NAME[prefs.contentLanguage]} />
        </Group>

        <GroupHeader>Following</GroupHeader>
        <Group inset={INSET.tile}>
          <Cell left={<Tile icon="bank" color="indigo" />} title="Institutions" detail={String(followedInstitutions)} chevron onPress={() => router.push('/settings/sources')} />
          <Cell left={<Tile icon="list" color="purple" />} title="Storylines" detail={String(followedStorylines)} chevron onPress={() => router.navigate('/tracking')} />
          <Cell left={<Tile icon="car" color="orange" />} title="Saved routes" detail="1" chevron onPress={() => router.push('/traffic')} />
          <Cell left={<Tile icon="chart" color="green" />} title="Rate alerts" detail={String(Object.values(prefs.rateAlerts).filter(Boolean).length)} chevron onPress={() => router.push('/rates')} />
          <Cell left={<Tile icon="bell" color="red" />} title="Alerts and quiet hours" chevron onPress={() => router.push('/alert-levels')} />
        </Group>

        <GroupHeader>Yours</GroupHeader>
        <Group inset={INSET.tile}>
          <Cell left={<Tile icon="bookmark" color="yellow" />} title="Saved items" detail={String(prefs.saved.length)} />
          <Cell left={<Tile icon="flag" color="gray" />} title="My reports" detail={openReports ? `${openReports} open` : 'None'} />
        </Group>

        <GroupHeader>Data</GroupHeader>
        <Group inset={INSET.tile}>
          <Cell left={<Tile icon="download" color="teal" />} title="Offline copies" subtitle="Last loaded items stay readable" right={
              <Switch
                label="Offline copies"
                value={prefs.offlineCopies}
                onChange={(v) => {
                  prefs.set('offlineCopies', v);
                  if (!v) Promise.resolve(queryPersister.removeClient()).catch(() => undefined);
                }}
              />
            } />
          <Cell left={<Tile icon="leaf" color="mint" />} title="Low-data mode" subtitle="Images load on tap" right={<Switch label="Low-data mode" value={prefs.lowData} onChange={(v) => prefs.set('lowData', v)} />} />
        </Group>

        <Group style={{ marginTop: 22 }}>
          <Cell title="Download my data" tone="tint" onPress={() => exportData().catch(() => undefined)} />
          {account && (
            <Cell
              title="Sign out"
              tone="tint"
              onPress={async () => {
                await signOut();
                haptic.success();
              }}
            />
          )}
          <Cell title={account ? 'Delete account' : 'Erase this iPhone’s data'} tone="destructive" onPress={confirmDelete} />
        </Group>
        <Txt v="fn" c={colors.l2} center style={{ paddingTop: 18, paddingHorizontal: 32 }}>
          Imboni is independent, not a government app.
        </Txt>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.indigo, alignItems: 'center', justifyContent: 'center' },
});
