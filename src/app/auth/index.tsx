import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useApi } from '@/data/api';
import { useAuthParams, useFinishAuth } from '@/features/auth';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { BrandMark } from '@/ui/brand';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { closeAction, HeaderActions } from '@/ui/nav';
import { Highlight } from '@/ui/pressable';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors, useScheme } from '@/ui/theme';
import { useToast } from '@/ui/toast';

const ROWS = [
  { label: 'Follow and track', guest: 'This phone', account: true },
  { label: 'Report mistakes', guest: null, account: true },
  { label: 'Is this true?', guest: null, account: true },
] as const;

export default function AuthSheet() {
  const colors = useColors();
  const scheme = useScheme();
  const styles = useStyles();
  const params = useAuthParams();
  const finish = useFinishAuth();
  const api = useApi();
  const toast = useToast();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [compare, setCompare] = useState(false);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(compare ? '180deg' : '0deg', { duration: motion.base, easing: Easing.out(Easing.quad) }) }] }));
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
      if (!(e instanceof Error && 'code' in e && e.code === 'ERR_REQUEST_CANCELED')) toast({ message: userMessage(toAppError(e).code), icon: 'warning' });
    } finally {
      setBusy(null);
    }
  };

  const withGoogle = async () => {
    setBusy('google');
    try {
      await finish(params, await api.signIn('google', null));
    } catch (e) {
      toast({ message: userMessage(toAppError(e).code), icon: 'warning' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.screen}>
      <HeaderActions actions={[closeAction]} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.body} bounces={false}>
        <BrandMark size={56} />
        <Txt v="title1" style={{ marginTop: 18 }} accessibilityRole="header">
          {onboarding ? 'Save your setup' : 'Sign in'}
        </Txt>
        <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>
          Sync follows and reminders across devices, and help fix mistakes in notices.
        </Txt>

        <View style={styles.buttons}>
          <Button label="Continue with phone" icon="phone" onPress={() => router.push({ pathname: '/auth/phone', params: { next: params.next, id: params.id } })} />
          {appleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              // The native button only reads its style when it mounts, so a theme change remounts it.
              key={scheme}
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={scheme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.sm}
              style={{ height: 52, opacity: busy === 'apple' ? 0.6 : 1 }}
              onPress={withApple}
            />
          ) : null}
          <Highlight accessibilityRole="button" accessibilityLabel="Continue with Google" accessibilityState={{ busy: busy === 'google', disabled: busy !== null }} feedback="tap" disabled={busy !== null} onPress={withGoogle} pressedStyle={{ opacity: 0.72 }} style={styles.google}>
            <GoogleMark />
            <Txt v="callout" w="semibold">
              {busy === 'google' ? 'Signing in…' : 'Continue with Google'}
            </Txt>
          </Highlight>
          {onboarding && (
            <Highlight accessibilityRole="button" onPress={() => finish(params, null)} style={styles.guest}>
              <Txt v="subhead" w="semibold" center>
                Continue as guest
              </Txt>
            </Highlight>
          )}
        </View>

        <Highlight
          accessibilityRole="button"
          accessibilityState={{ expanded: compare }}
          onPress={() => {
            haptic.selection();
            setCompare((c) => !c);
          }}
          style={styles.compareBtn}>
          <Txt v="footnote" w="medium" c={colors.ink2}>
            Guest or account?
          </Txt>
          <Animated.View style={chevron}>
            <Icon name="chevronDown" size={11} color={colors.ink2} weight="semibold" />
          </Animated.View>
        </Highlight>
        {compare && (
          <Animated.View entering={FadeIn.duration(motion.base)} layout={LinearTransition.duration(motion.base)} style={styles.table}>
            <View style={styles.tr}>
              <View style={{ flex: 1 }} />
              <Txt v="caption" c={colors.ink2} center style={styles.col}>
                Guest
              </Txt>
              <Txt v="caption" c={colors.ink2} center style={styles.col}>
                Account
              </Txt>
            </View>
            {ROWS.map((r) => (
              <View key={r.label} style={[styles.tr, styles.trLine]} accessibilityLabel={`${r.label}: guest ${r.guest ?? 'no'}, account yes`}>
                <Txt v="subhead" style={{ flex: 1 }}>
                  {r.label}
                </Txt>
                <View style={styles.col}>
                  {r.guest ? (
                    <Txt v="caption" c={colors.ink2} center>
                      {r.guest}
                    </Txt>
                  ) : (
                    <Icon name="minus" size={15} color={colors.ink3} />
                  )}
                </View>
                <View style={styles.col}>
                  <Icon name="check" size={15} color={colors.ok} weight="semibold" />
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        <Txt v="caption" c={colors.ink3} style={{ marginTop: 18 }}>
          By continuing you accept the Terms and Privacy Notice. Personal data stays in Rwanda.
        </Txt>
      </ScrollView>
    </View>
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

const useStyles = createStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  body: { paddingHorizontal: GUTTER + 4, paddingTop: 4, paddingBottom: 40 },
  buttons: { gap: 10, paddingTop: 28 },
  google: { height: 52, borderRadius: radius.sm, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  guest: { height: 44, alignItems: 'center', justifyContent: 'center' },
  compareBtn: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  table: { borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingVertical: 4, paddingHorizontal: 14 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  trLine: { borderTopWidth: 1, borderTopColor: colors.line },
  col: { width: 76, alignItems: 'center' },
}));
