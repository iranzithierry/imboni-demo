import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { SMS_CODE_LENGTH, SMS_RESEND_SECONDS } from '@/config/constants';
import { useApi } from '@/data/api';
import type { Session } from '@/data/schema';
import { useAuthParams, useFinishAuth } from '@/features/auth';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { BackButton, NavBar } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const CodeParams = z.object({ phone: z.string().regex(/^\+\d{6,15}$/), display: z.string(), demo: z.string().optional() });

export default function SmsCode() {
  const params = useAuthParams();
  const { phone, display, demo } = CodeParams.parse(useLocalSearchParams());
  const api = useApi();
  const finish = useFinishAuth();
  const top = useSafeAreaInsets().top;
  const input = useRef<TextInputInstance>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [left, setLeft] = useState(SMS_RESEND_SECONDS);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const verify = async (value: string) => {
    setVerifying(true);
    try {
      const s = await api.verifySmsCode(phone, value);
      haptic.success();
      input.current?.blur();
      setSession(s);
    } catch (e) {
      const err = toAppError(e);
      haptic.error();
      shake.set(withSequence(withTiming(10, { duration: 50 }), withTiming(-10, { duration: 50 }), withTiming(6, { duration: 50 }), withTiming(0, { duration: 50 })));
      setError(userMessage(err.code));
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    try {
      await api.sendSmsCode(phone);
      setLeft(SMS_RESEND_SECONDS);
      setError(null);
      haptic.success();
    } catch (e) {
      setError(userMessage(toAppError(e).code));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.white }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <NavBar background={colors.white} left={<BackButton label="Back" />} />
      <View style={{ paddingTop: top + 52, paddingHorizontal: 20 }}>
        <Txt v="t1" accessibilityRole="header">
          Enter the code
        </Txt>
        <Txt v="co" c={colors.l2} style={{ marginTop: 6 }}>
          Sent to <Txt v="co" num>{display}</Txt>
        </Txt>
        <Pressable onPress={() => input.current?.focus()} accessibilityLabel={`${SMS_CODE_LENGTH}-digit code, ${code.length} entered`}>
          <Animated.View style={[styles.cells, shakeStyle]}>
            {Array.from({ length: SMS_CODE_LENGTH }, (_, i) => (
              <View key={i} style={[styles.cell, { borderColor: error ? colors.red : i === code.length && !verifying ? colors.tint : 'transparent' }]}>
                <Txt num style={{ fontSize: 28, fontWeight: '600' }}>
                  {code[i] ?? ''}
                </Txt>
              </View>
            ))}
          </Animated.View>
        </Pressable>
        <TextInput
          ref={input}
          autoFocus
          value={code}
          onChangeText={(t) => {
            const next = t.replace(/\D/g, '').slice(0, SMS_CODE_LENGTH);
            setError(null);
            setCode(next);
            if (next.length === SMS_CODE_LENGTH) verify(next);
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={SMS_CODE_LENGTH}
          style={styles.hidden}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        {error && (
          <Animated.View entering={FadeIn} style={styles.row}>
            <Icon name="exclamation" size={13} color={colors.red} />
            <Txt v="fn" c={colors.red} accessibilityLiveRegion="assertive">
              {error}
            </Txt>
          </Animated.View>
        )}
        <View style={[styles.row, { marginTop: 14, justifyContent: 'space-between' }]}>
          {left > 0 ? (
            <Txt v="fn" c={colors.l2} num>{`Resend code in 0:${String(left).padStart(2, '0')}`}</Txt>
          ) : (
            <Pressable accessibilityRole="button" onPress={resend}>
              <Txt v="fn" w="600" c={colors.tint}>
                Resend code
              </Txt>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={() => router.back()}>
            <Txt v="fn" c={colors.tint}>
              Wrong number?
            </Txt>
          </Pressable>
        </View>
        {demo && (
          <Txt v="c1" c={colors.l2} style={{ marginTop: 22 }} num>
            {`Demo build: no SMS is sent. Use ${demo.slice(0, 3)} ${demo.slice(3)}.`}
          </Txt>
        )}
      </View>
      {session && (
        <Animated.View entering={FadeIn} style={styles.overlay} accessibilityViewIsModal>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.ok}>
            <Icon name="check" size={44} color={colors.white} />
          </Animated.View>
          <Txt v="t2">Verified</Txt>
          <Txt v="co" c={colors.l2}>
            Your setup is saved to your account.
          </Txt>
          <Button label="Continue" style={{ width: 220, alignSelf: 'center', marginTop: 10 }} onPress={() => finish(params, session)} />
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  cells: { flexDirection: 'row', gap: 8, marginTop: 28 },
  cell: { flex: 1, height: 62, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.96)', alignItems: 'center', justifyContent: 'center', gap: 14 },
  ok: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
});
