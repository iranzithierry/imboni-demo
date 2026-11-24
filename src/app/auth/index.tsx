import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useApi } from '@/data/api';
import { useAuthParams, useFinishAuth } from '@/features/auth';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { Gradient } from '@/ui/atoms';
import { Button, CircleButton } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { PressableScale } from '@/ui/pressable';
import { Txt } from '@/ui/text';
import { colors, spring } from '@/ui/theme';
import { useToast } from '@/ui/toast';

const ROWS = [
  { label: 'Follow and track', guest: 'This iPhone', account: true },
  { label: 'Report mistakes', guest: null, account: true },
  { label: 'Is this true?', guest: null, account: true },
] as const;

export default function AuthSheet() {
  const params = useAuthParams();
  const finish = useFinishAuth();
  const api = useApi();
  const toast = useToast();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [compare, setCompare] = useState(false);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: withSpring(compare ? '180deg' : '0deg', spring) }] }));
  const onboarding = params.next === 'ready';

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  const withApple = async () => {
    setBusy('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      await finish(params, await api.signIn('apple', credential.identityToken));
    } catch (e) {
      // The user closing Apple's sheet is not an error.
      if (!(e instanceof Error && 'code' in e && e.code === 'ERR_REQUEST_CANCELED')) toast({ message: userMessage(toAppError(e).code), icon: 'warning', iconColor: colors.orange });
    } finally {
      setBusy(null);
    }
  };

  const withGoogle = async () => {
    setBusy('google');
    try {
      await finish(params, await api.signIn('google', null));
    } catch (e) {
      toast({ message: userMessage(toAppError(e).code), icon: 'warning', iconColor: colors.orange });
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body} bounces={false}>
      <View style={styles.close}>
        <CircleButton icon="xmark" label="Close" onPress={() => router.back()} />
      </View>
      <View style={styles.head}>
        <View style={styles.appIcon}>
          <Gradient name="institution" angle="vertical" />
          <Icon name="eye" size={34} color={colors.white} />
        </View>
        <Txt v="t2" center style={{ marginTop: 16 }} accessibilityRole="header">
          {onboarding ? 'Save your setup' : 'Sign in'}
        </Txt>
        <Txt v="co" c={colors.l2} center style={{ marginTop: 6 }}>
          Sync follows and reminders across devices and help fix mistakes.
        </Txt>
      </View>
      <View style={styles.buttons}>
        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={14}
            style={{ height: 50, opacity: busy === 'apple' ? 0.6 : 1 }}
            onPress={withApple}
          />
        ) : null}
        <PressableScale scaleTo={0.97} feedback="tap" accessibilityRole="button" onPress={withGoogle} disabled={busy !== null} style={styles.google}>
          <GoogleMark />
          <Txt v="hl">{busy === 'google' ? 'Signing in…' : 'Continue with Google'}</Txt>
        </PressableScale>
        <Button label="Continue with phone" variant="grayInk" icon="phone" onPress={() => router.push({ pathname: '/auth/phone', params: { next: params.next, id: params.id } })} />
        {onboarding && <Button label="Continue as guest" variant="plain" onPress={() => finish(params, null)} />}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: compare }}
        onPress={() => {
          haptic.selection();
          setCompare((c) => !c);
        }}
        style={styles.compareBtn}>
        <Txt v="fn" c={colors.l2}>
          Guest vs account
        </Txt>
        <Animated.View style={chevron}>
          <Icon name="chevronDown" size={13} color={colors.l2} />
        </Animated.View>
      </Pressable>
      {compare && (
        <Animated.View entering={FadeIn} layout={LinearTransition} style={styles.table}>
          <View style={styles.tr}>
            <View style={{ flex: 1 }} />
            <Txt v="fn" w="600" c={colors.l2} center style={styles.col}>
              Guest
            </Txt>
            <Txt v="fn" w="600" c={colors.l2} center style={styles.col}>
              Account
            </Txt>
          </View>
          {ROWS.map((r) => (
            <View key={r.label} style={[styles.tr, styles.trLine]}>
              <Txt v="sh" style={{ flex: 1 }}>
                {r.label}
              </Txt>
              <View style={styles.col}>{r.guest ? <Txt v="fn" c={colors.l2} center>{r.guest}</Txt> : <Icon name="minus" size={17} color={colors.l3} />}</View>
              <View style={styles.col}>
                <Icon name="check" size={17} color={colors.green} />
              </View>
            </View>
          ))}
        </Animated.View>
      )}
      <Txt v="c1" c={colors.l2} center style={{ paddingTop: 10, paddingHorizontal: 8 }}>
        By continuing you accept the Terms and Privacy Notice. Data stays in Rwanda.
      </Txt>
    </ScrollView>
  );
}

function GoogleMark() {
  return (
    <Svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <Path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.7-1.6 2.7-4 2.7-7z" fill="#4285F4" />
      <Path d="M12 21.5c2.6 0 4.7-.9 6.3-2.3l-3.1-2.4c-.8.6-1.9 1-3.2 1-2.5 0-4.6-1.7-5.3-3.9H3.5v2.5a9.5 9.5 0 0 0 8.5 5.1z" fill="#34A853" />
      <Path d="M6.7 13.9a5.7 5.7 0 0 1 0-3.7V7.7H3.5a9.5 9.5 0 0 0 0 8.6z" fill="#FBBC05" />
      <Path d="M12 6.3c1.4 0 2.6.5 3.6 1.4l2.7-2.7A9.5 9.5 0 0 0 3.5 7.7l3.2 2.5C7.4 8 9.5 6.3 12 6.3z" fill="#EA4335" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  close: { alignItems: 'flex-end', paddingTop: 14 },
  head: { alignItems: 'center', paddingTop: 8 },
  appIcon: { width: 64, height: 64, borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(10,82,233,0.3)' },
  buttons: { gap: 10, paddingTop: 26 },
  google: { height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(60,60,67,0.25)', backgroundColor: colors.white },
  compareBtn: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  table: { backgroundColor: colors.bg, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 14 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  trLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
  col: { width: 72, alignItems: 'center' },
});
