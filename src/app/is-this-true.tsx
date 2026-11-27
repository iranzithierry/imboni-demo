import { useMutation } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
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
import { IconTile, Tag } from '@/ui/atoms';
import { Button, IconButton, TextAction } from '@/ui/button';
import { Icon, type IconName } from '@/ui/icon';
import { InstitutionLogo } from '@/ui/logo';
import { HeaderActions } from '@/ui/nav';
import { Highlight } from '@/ui/pressable';
import { EmptyState } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, fonts, GUTTER, motion, palettes, radius, statusColors, useColors } from '@/ui/theme';

const EXAMPLES = [
  'BNR is taking old notes so everyone is forced to go cashless. After January cash won’t be accepted anywhere. Share!',
  'Car Free Day is this Sunday 6 December from 7 to 10, roads closed.',
];

type Turn = { id: number; text: string; at: string; result: ClaimCheck | null; error: string | null };

const VERDICT: Record<ClaimCheck['verdict'], { title: string; tone: 'warn' | 'ok' | 'neutral'; icon: IconName }> = {
  conflicts: { title: 'Conflicts with an official notice', tone: 'warn', icon: 'warning' },
  matches: { title: 'Matches an official notice', tone: 'ok', icon: 'checkCircle' },
  no_source: { title: 'No official source found yet', tone: 'neutral', icon: 'info' },
};

function Verdict({ result }: { result: ClaimCheck }) {
  const colors = useColors();
  const styles = useStyles();
  const v = VERDICT[result.verdict];
  const inst = useInstitutionLookup();
  const [why, setWhy] = useState(false);
  const source = result.source;
  return (
    <Animated.View entering={FadeIn.duration(motion.base)} style={styles.result} accessibilityLiveRegion="polite">
      <View style={[styles.resultHead, { backgroundColor: statusColors(colors, v.tone).bg }]}>
        <IconTile icon={v.icon} tone={v.tone} size={36} style={{ backgroundColor: colors.card }} />
        <View style={{ flex: 1 }}>
          <Txt v="callout" w="semibold" c={v.tone === 'neutral' ? colors.ink : statusColors(colors, v.tone).fg}>
            {v.title}
          </Txt>
          <Txt v="caption" c={colors.ink2} num>{`${result.claimsChecked} of ${result.claimsTotal} claims checked`}</Txt>
        </View>
      </View>
      <View style={{ padding: 16, gap: 12 }}>
        {result.claim && (
          <View>
            <Txt v="caption" c={colors.ink3}>
              The message says
            </Txt>
            <Txt v="subhead" style={{ marginTop: 2 }}>
              {result.claim}
            </Txt>
          </View>
        )}
        {result.record && (
          <View>
            <Txt v="caption" c={colors.ink3}>
              The official record says
            </Txt>
            <Txt v="subhead" w="semibold" style={{ marginTop: 2 }}>
              {result.record}
            </Txt>
          </View>
        )}
        {result.unverified.map((u) => (
          <View key={u} style={styles.unverified}>
            <Icon name="info" size={15} color={colors.ink2} />
            <Txt v="footnote" c={colors.ink2} style={{ flex: 1 }}>
              {u}
            </Txt>
          </View>
        ))}
        {why && (
          <Animated.View entering={FadeIn.duration(motion.fast)}>
            <Txt v="footnote" c={colors.ink2}>
              {result.why}
            </Txt>
          </Animated.View>
        )}
      </View>
      {source && (
        <Highlight accessibilityRole="link" onPress={() => router.push(toHref(source.link))} pressedStyle={{ backgroundColor: colors.pressed }} style={styles.sourceRow}>
          <InstitutionLogo id={source.institutionId} label={inst(source.institutionId).mono} size="s" />
          <View style={{ flex: 1 }}>
            <Txt v="subhead" w="semibold" numberOfLines={1}>
              {source.title}
            </Txt>
            <Txt v="caption" c={colors.ink2}>
              {source.meta}
            </Txt>
          </View>
          <Icon name="chevronRight" size={13} color={colors.pearl} weight="semibold" />
        </Highlight>
      )}
      <View style={styles.resultActions}>
        {source && <Button label="Share the notice" icon="share" variant="secondary" size="sm" hug onPress={() => shareText(source.title, source.link).catch(() => undefined)} />}
        <Button label={why ? 'Hide why' : 'Why this answer?'} variant="quiet" size="sm" hug onPress={() => setWhy((w) => !w)} />
      </View>
    </Animated.View>
  );
}

export default function IsThisTrue() {
  const colors = useColors();
  const styles = useStyles();
  const api = useApi();
  const insets = useSafeAreaInsets();
  const session = useSession((s) => s.session);
  const scroll = useRef<ScrollViewInstance>(null);
  // Under the transparent iOS header the thread rests at a negative offset, which `scrollToEnd` ignores (it
  // clamps to 0 and tucks the first message under the header). So the resting offset is noted before the
  // first drag, Clear returns to it, and new messages only ever scroll the thread down.
  const viewport = useRef(0);
  const offset = useRef(0);
  const restOffset = useRef(0);
  const dragged = useRef(false);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const seq = useRef(0);
  const check = useMutation({ mutationFn: (text: string) => api.checkClaim(text) });

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
  const clear = () => {
    setTurns([]);
    scroll.current?.scrollTo({ y: restOffset.current, animated: false });
  };
  const revealEnd = (contentHeight: number) => {
    const end = contentHeight - viewport.current;
    if (turns.length && end > offset.current) scroll.current?.scrollTo({ y: end, animated: true });
  };
  const canSend = Boolean(draft.trim()) && !check.isPending;

  return (
    <>
      <Stack.Screen options={{ title: 'Is this true?', headerLargeTitleEnabled: true }} />
      <HeaderActions actions={turns.length ? [{ icon: 'trash', text: 'Clear', label: 'Clear', onPress: clear }] : []} />
      {session.kind !== 'account' ? (
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.thread}>
          <Tag label="Beta" tone="pink" />
          <EmptyState icon="bubble" title="Sign in to check messages" body="Imboni compares a forwarded message with official records. Checks need an account so they can’t be abused." action={{ label: 'Sign in', onPress: () => router.push({ pathname: '/auth', params: { next: 'truth' } }) }} />
        </ScrollView>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scroll}
            contentInsetAdjustmentBehavior="automatic"
            onLayout={(e) => {
              viewport.current = e.nativeEvent.layout.height;
            }}
            onScroll={(e) => {
              offset.current = e.nativeEvent.contentOffset.y;
              if (!dragged.current) restOffset.current = Math.min(restOffset.current, offset.current);
            }}
            onScrollBeginDrag={() => {
              dragged.current = true;
            }}
            scrollEventThrottle={16}
            onContentSizeChange={(_, h) => revealEnd(h)}
            keyboardDismissMode="interactive"
            contentContainerStyle={styles.thread}>
            <Tag label="Beta" tone="pink" />
            {!turns.length && (
              <View>
                <Txt v="title3" accessibilityRole="header">
                  Check a forwarded message
                </Txt>
                <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>
                  Paste a message or a screenshot’s text. You’ll see whether official records match it, conflict with it, or don’t cover it yet. Imboni never calls a message false without an official record.
                </Txt>
                <Txt v="footnote" w="medium" c={colors.ink2} style={{ marginTop: 20 }}>
                  Try one
                </Txt>
                {EXAMPLES.map((e) => (
                  <Highlight key={e} accessibilityRole="button" onPress={() => submit(e)} pressedStyle={{ opacity: 0.7 }} style={styles.example}>
                    <Icon name="quote" size={16} color={colors.ink2} />
                    <Txt v="subhead" style={{ flex: 1 }}>
                      {e}
                    </Txt>
                  </Highlight>
                ))}
              </View>
            )}
            {turns.map((t) => (
              <View key={t.id} style={{ gap: 6 }}>
                <View style={styles.bubble}>
                  <Txt v="callout" c={colors.white}>
                    {t.text}
                  </Txt>
                </View>
                <Txt v="caption" c={colors.ink3} style={{ textAlign: 'right' }} num>{`Sent ${formatTime(t.at)}`}</Txt>
                {t.result ? (
                  <Verdict result={t.result} />
                ) : t.error ? (
                  <View style={styles.unverified}>
                    <Icon name="exclamation" size={15} color={colors.bad} />
                    <Txt v="footnote" c={colors.bad} style={{ flex: 1 }}>
                      {t.error}
                    </Txt>
                    <TextAction label="Retry" icon="refresh" color={colors.ink} onPress={() => submit(t.text)} />
                  </View>
                ) : (
                  <View style={styles.checking} accessibilityLabel="Checking against official records">
                    <ActivityIndicator color={colors.ink2} />
                    <Txt v="footnote" c={colors.ink2}>
                      Checking against official records…
                    </Txt>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <IconButton icon="paste" label="Paste from clipboard" onPress={paste} />
            <View style={styles.field}>
              <TextInput value={draft} onChangeText={setDraft} placeholder="Paste a message" placeholderTextColor={colors.ink3} multiline maxLength={2000} style={styles.input} accessibilityLabel="Message to check" />
            </View>
            <Highlight accessibilityRole="button" accessibilityLabel="Check message" accessibilityState={{ disabled: !canSend }} disabled={!canSend} onPress={() => submit(draft)} style={[styles.send, !canSend && styles.sendOff]}>
              <Icon name="arrowUp" size={18} color={canSend ? colors.white : colors.ink3} weight="semibold" />
            </Highlight>
          </View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  thread: { paddingTop: 4, paddingBottom: 20, paddingHorizontal: GUTTER, gap: 18 },
  example: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  // The saturated light-theme pink in both themes, so white text stays legible on it.
  bubble: { alignSelf: 'flex-end', maxWidth: '86%', backgroundColor: palettes.light.pink, borderRadius: radius.lg, borderBottomRightRadius: radius.xs, paddingVertical: 10, paddingHorizontal: 14 },
  checking: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  result: { borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, overflow: 'hidden' },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  unverified: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.line },
  resultActions: { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
  field: { flex: 1, minHeight: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.canvas, paddingHorizontal: 12, justifyContent: 'center' },
  input: { fontSize: 16, fontFamily: fonts.regular, maxHeight: 120, paddingVertical: 9, color: colors.ink },
  send: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendOff: { backgroundColor: colors.fill },
}));
