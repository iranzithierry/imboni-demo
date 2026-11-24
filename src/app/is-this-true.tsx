import { useMutation } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/data/api';
import type { ClaimCheck } from '@/data/schema';
import { useInstitutionLookup } from '@/features/data';
import { formatTime } from '@/lib/dates';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { shareText } from '@/lib/share';
import { useSession } from '@/state/session';
import { Initials, Tile } from '@/ui/atoms';
import { Button, CapButton, CircleButton } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { BackButton, NavBar, NavButton, Screen, useNavInset } from '@/ui/nav';
import { EmptyState } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const EXAMPLE = 'BNR is taking old notes so everyone is forced to go cashless. After January cash won’t be accepted anywhere. Share!';

type Turn = { id: number; text: string; at: string; result: ClaimCheck | null; error: string | null };

const VERDICT = {
  conflicts: { title: 'Conflicts with an official notice', color: colors.orangeText, bg: 'rgba(255,149,0,0.14)', tile: 'orange' as const, icon: 'warning' as const },
  matches: { title: 'Matches an official notice', color: colors.greenText, bg: 'rgba(52,199,89,0.14)', tile: 'green' as const, icon: 'checkCircle' as const },
  no_source: { title: 'No official source yet', color: colors.l2, bg: colors.fill, tile: 'gray' as const, icon: 'info' as const },
};

function TypingDot({ delay }: { delay: number }) {
  const o = useSharedValue(0.3);
  useEffect(() => {
    o.set(withDelay(delay, withRepeat(withTiming(1, { duration: 600 }), -1, true)));
  }, [o, delay]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[styles.typingDot, style]} />;
}

function Verdict({ result }: { result: ClaimCheck }) {
  const v = VERDICT[result.verdict];
  const inst = useInstitutionLookup();
  const [why, setWhy] = useState(false);
  const source = result.source;
  return (
    <Animated.View entering={FadeInUp.springify().damping(18)} style={{ paddingTop: 14 }}>
      <View style={styles.result}>
        <View style={[styles.resultHead, { backgroundColor: v.bg }]}>
          <Tile icon={v.icon} color={v.tile} />
          <View style={{ flex: 1 }}>
            <Txt v="hl" c={v.color}>
              {v.title}
            </Txt>
            <Txt v="c1" c={colors.l2}>{`${result.claimsChecked} of ${result.claimsTotal} claims checked`}</Txt>
          </View>
        </View>
        <View style={{ padding: 14 }}>
          {result.claim && (
            <>
              <Txt v="c1" w="600" c={colors.l2}>
                CLAIM
              </Txt>
              <Txt v="sh">{result.claim}</Txt>
            </>
          )}
          {result.record && (
            <>
              <Txt v="c1" w="600" c={colors.l2} style={{ marginTop: 10 }}>
                OFFICIAL RECORD
              </Txt>
              <Txt v="sh">{result.record}</Txt>
            </>
          )}
          {result.unverified.map((u) => (
            <View key={u} style={styles.unverified}>
              <Icon name="info" size={17} color={colors.l2} />
              <Txt v="fn" c={colors.l2} style={{ flex: 1 }}>
                {u}
              </Txt>
            </View>
          ))}
          {why && (
            <Animated.View entering={FadeIn}>
              <Txt v="fn" c={colors.l2} style={{ marginTop: 10 }}>
                {result.why}
              </Txt>
            </Animated.View>
          )}
        </View>
        {source && (
          <Pressable accessibilityRole="link" onPress={() => router.push(toHref(source.link))} style={({ pressed }) => [styles.sourceRow, pressed && { backgroundColor: colors.pressed }]}>
            <Initials label={inst(source.institutionId).mono} color={inst(source.institutionId).color} size="s" />
            <View style={{ flex: 1 }}>
              <Txt v="sh" w="600" numberOfLines={1}>
                {source.title}
              </Txt>
              <Txt v="c1" c={colors.l2}>
                {source.meta}
              </Txt>
            </View>
            <Icon name="chevronRight" size={13} color={colors.l3} />
          </Pressable>
        )}
      </View>
      <View style={styles.chips}>
        {source && <CapButton label="Share the notice" icon="share" onPress={() => shareText(source.title, source.link).catch(() => undefined)} />}
        <CapButton label={why ? 'Hide why' : 'Why this answer?'} variant="gray" onPress={() => setWhy((w) => !w)} />
      </View>
    </Animated.View>
  );
}

export default function IsThisTrue() {
  const api = useApi();
  const insets = useSafeAreaInsets();
  const top = useNavInset(14);
  const session = useSession((s) => s.session);
  const scroll = useRef<ScrollViewInstance>(null);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const seq = useRef(0);
  const check = useMutation({
    mutationFn: (text: string) => api.checkClaim(text),
  });

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || check.isPending) return;
    haptic.tap();
    seq.current += 1;
    const id = seq.current;
    setTurns((prev) => [...prev, { id, text: t, at: new Date().toISOString(), result: null, error: null }]);
    setDraft('');
    check.mutate(t, {
      onSuccess: (result) => {
        haptic.success();
        setTurns((prev) => prev.map((x) => (x.id === id ? { ...x, result } : x)));
      },
      onError: (e) => {
        haptic.error();
        setTurns((prev) => prev.map((x) => (x.id === id ? { ...x, error: userMessage(toAppError(e).code) } : x)));
      },
    });
  };
  const paste = async () => {
    const text = await Clipboard.getStringAsync().catch(() => '');
    if (text) setDraft(text.slice(0, 2000));
  };

  return (
    <Screen bg={colors.white}>
      <NavBar
        left={<BackButton label="Explore" />}
        center={
          <View style={{ alignItems: 'center' }} pointerEvents="none">
            <Tile icon="bubble" color="teal" style={{ width: 26, height: 26, borderRadius: 13 }} />
            <Txt v="c1" w="600" style={{ marginTop: 2 }}>
              Is this true? <Txt v="c1" c={colors.l2}>Beta</Txt>
            </Txt>
          </View>
        }
        right={<NavButton label="Clear" disabled={!turns.length} onPress={() => setTurns([])} />}
      />
      {session.kind !== 'account' ? (
        <View style={{ paddingTop: top }}>
          <EmptyState icon="bubble" color={colors.teal} title="Sign in to check messages" body="Imboni compares forwarded messages with official records. Checks need an account so they can't be abused." />
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Button label="Sign in" onPress={() => router.push({ pathname: '/auth', params: { next: 'truth' } })} />
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} keyboardDismissMode="interactive" contentContainerStyle={{ paddingTop: top, paddingBottom: 20, paddingHorizontal: 16 }}>
            <Txt v="c1" c={colors.l2} center style={{ paddingBottom: 12 }}>
              Imboni compares messages with official records only
            </Txt>
            {!turns.length && (
              <Animated.View entering={FadeIn} style={{ alignItems: 'center', paddingTop: 30, gap: 12 }}>
                <Txt v="co" c={colors.l2} center>
                  Paste a message you were forwarded. You’ll see whether official records match it, conflict with it, or say nothing yet.
                </Txt>
                <CapButton label="Try an example" icon="sparkles" variant="solid" height={40} onPress={() => submit(EXAMPLE)} />
              </Animated.View>
            )}
            {turns.map((t) => (
              <View key={t.id}>
                <Animated.View entering={FadeInUp.springify().damping(18)} style={styles.bubble}>
                  <Txt v="co" c={colors.white}>
                    {t.text}
                  </Txt>
                </Animated.View>
                <Txt v="c2" c={colors.l2} style={{ textAlign: 'right', paddingTop: 4, paddingRight: 4 }}>{`Sent ${formatTime(t.at)}`}</Txt>
                {t.result ? (
                  <Verdict result={t.result} />
                ) : t.error ? (
                  <View style={[styles.unverified, { paddingTop: 12 }]}>
                    <Icon name="exclamation" size={15} color={colors.red} />
                    <Txt v="fn" c={colors.red} style={{ flex: 1 }}>
                      {t.error}
                    </Txt>
                    <CapButton label="Retry" onPress={() => submit(t.text)} />
                  </View>
                ) : (
                  <View style={styles.typing} accessibilityLabel="Checking">
                    <TypingDot delay={0} />
                    <TypingDot delay={200} />
                    <TypingDot delay={400} />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          <View style={[styles.composer, { paddingBottom: insets.bottom + 8 }]}>
            <CircleButton icon="paste" label="Paste" size={34} onPress={paste} />
            <View style={styles.field}>
              <TextInput value={draft} onChangeText={setDraft} placeholder="Paste a message" placeholderTextColor={colors.l3} multiline maxLength={2000} style={styles.input} accessibilityLabel="Message to check" />
              <Pressable accessibilityRole="button" accessibilityLabel="Check message" disabled={!draft.trim() || check.isPending} onPress={() => submit(draft)} style={[styles.send, (!draft.trim() || check.isPending) && { opacity: 0.4 }]}>
                <Icon name="arrowUp" size={15} color={colors.white} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: { alignSelf: 'flex-end', maxWidth: 290, backgroundColor: colors.tint, borderRadius: 20, borderBottomRightRadius: 6, paddingVertical: 10, paddingHorizontal: 14 },
  typing: { flexDirection: 'row', gap: 5, alignSelf: 'flex-start', backgroundColor: '#E9E9EB', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, marginTop: 14 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gray },
  result: { maxWidth: 330, backgroundColor: colors.bg, borderRadius: 20, borderBottomLeftRadius: 6, overflow: 'hidden' },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingHorizontal: 14 },
  unverified: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 8, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep, backgroundColor: 'rgba(255,255,255,0.96)' },
  field: { flex: 1, minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(60,60,67,0.29)', flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 14, paddingRight: 4, paddingVertical: 4 },
  input: { flex: 1, fontSize: 17, maxHeight: 120, paddingTop: 4, paddingBottom: 4, color: colors.l1 },
  send: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
});
