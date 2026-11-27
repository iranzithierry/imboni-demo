import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { SMS_CODE_LENGTH, SMS_RESEND_SECONDS } from '@/config/constants';
import { useApi } from '@/data/api';
import type { Session } from '@/data/schema';
import { useAuthParams, useFinishAuth } from '@/features/auth';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { Tag } from '@/ui/atoms';
import { Button, TextAction } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { SuccessBurst } from '@/ui/success';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors } from '@/ui/theme';

const CodeParams = z.object({ phone: z.string().regex(/^\+\d{6,15}$/), display: z.string(), demo: z.string().optional() });

export default function SmsCode() {
  const colors = useColors();
  const styles = useStyles();
  const params = useAuthParams();
  const { phone, display, demo } = CodeParams.parse(useLocalSearchParams());
  const api = useApi();
  const finish = useFinishAuth();
  const bottom = useSafeAreaInsets().bottom;
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
      // A short shake says "not this code" without another word on screen.
      shake.set(withSequence(withTiming(8, { duration: 50 }), withTiming(-8, { duration: 50 }), withTiming(5, { duration: 50 }), withTiming(0, { duration: 50 })));
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
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Once verified, the only way on is Continue; the web header ignores headerBackVisible, hence headerLeft. */}
      {session && <Stack.Screen options={{ headerBackVisible: false, headerLeft: () => null }} />}
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" bounces={false} contentContainerStyle={styles.body}>
        <Txt v="title1" accessibilityRole="header">
          Enter the code
        </Txt>
        <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>
          {'Sent to '}
          <Txt v="callout" w="semibold" num>
            {display}
          </Txt>
        </Txt>
        <Pressable onPress={() => input.current?.focus()} accessibilityLabel={`${SMS_CODE_LENGTH}-digit code, ${code.length} entered`}>
          <Animated.View style={[styles.cells, shakeStyle]}>
            {Array.from({ length: SMS_CODE_LENGTH }, (_, i) => {
              const active = i === code.length && !verifying && !session;
              return (
                <View key={i} style={[styles.cell, error ? styles.cellError : active ? styles.cellActive : null]}>
                  <Txt v="title2" num>
                    {code[i] ?? ''}
                  </Txt>
                </View>
              );
            })}
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
          <Animated.View entering={FadeIn.duration(motion.fast)} style={styles.error}>
            <Icon name="exclamation" size={14} color={colors.bad} weight="semibold" />
            <Txt v="footnote" c={colors.bad} accessibilityLiveRegion="assertive" style={{ flex: 1 }}>
              {error}
            </Txt>
          </Animated.View>
        )}
        <View style={styles.links}>
          {left > 0 ? (
            <Txt v="footnote" c={colors.ink2} num>{`Resend code in 0:${String(left).padStart(2, '0')}`}</Txt>
          ) : (
            <TextAction label="Resend code" icon="refresh" color={colors.ink} onPress={resend} />
          )}
          <TextAction label="Wrong number?" icon={null} color={colors.ink} onPress={() => router.back()} />
        </View>
        {demo && <Tag label={`Demo build: no SMS is sent. Use ${demo.slice(0, 3)} ${demo.slice(3)}.`} tone="neutral" icon="info" style={{ marginTop: 22 }} />}
      </ScrollView>

      {session && (
        <Animated.View entering={FadeIn.duration(motion.base)} style={[styles.overlay, { paddingBottom: Math.max(bottom, 16) }]} accessibilityViewIsModal>
          <Animated.View entering={FadeIn.duration(motion.base)} style={styles.popup}>
            <SuccessBurst />
            <Txt v="title2" center accessibilityRole="header">
              You’re verified
            </Txt>
            <Txt v="callout" c={colors.ink2} center style={{ marginTop: 6 }}>
              {`${display} is confirmed. Your setup is saved to your account.`}
            </Txt>
            <Button label="Continue" onPress={() => finish(params, session)} style={{ marginTop: 22, alignSelf: 'stretch' }} />
          </Animated.View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  body: { paddingHorizontal: GUTTER + 4, paddingTop: 4, paddingBottom: 16 },
  cells: { flexDirection: 'row', gap: 8, marginTop: 28 },
  cell: { flex: 1, height: 58, borderRadius: radius.sm, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  cellActive: { borderWidth: 2, borderColor: colors.ink },
  cellError: { borderWidth: 2, borderColor: colors.bad },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  links: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 50, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', paddingHorizontal: GUTTER },
  popup: { alignSelf: 'stretch', alignItems: 'center', paddingHorizontal: 22, paddingBottom: 22, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.card },
}));
