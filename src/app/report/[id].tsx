import { useMutation } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { formatTime } from '@/lib/dates';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { usePrefs } from '@/state/prefs';
import { useSession } from '@/state/session';
import { IconTile, Radio, Tag } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Group, GroupLabel, GroupNote, Row } from '@/ui/list';
import { closeAction, Dock, HeaderActions, useDockInset } from '@/ui/nav';
import { EmptyState } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, fonts, GUTTER, motion, radius, useColors } from '@/ui/theme';

const REASONS = ['Wrong date, amount or place', 'Mistranslation', 'Outdated', 'Not official', 'Duplicate', 'Misleading summary', 'Other'] as const;
const MAX_CORRECTION = 500;

export default function Report() {
  const colors = useColors();
  const styles = useStyles();
  const { id, field = 'Whole item' } = useLocalSearchParams<{ id: string; field?: string }>();
  const api = useApi();
  const bottom = useDockInset();
  const session = useSession((s) => s.session);
  const addReport = usePrefs((s) => s.addReport);
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [correction, setCorrection] = useState('');
  const send = useMutation({
    mutationFn: () => api.submitReport({ subjectId: id, field, reason: reason ?? '', correction: correction.trim() }, session),
    onSuccess: (r) => {
      haptic.success();
      addReport({ receipt: r.receipt, subject: id, field, reason: reason ?? '', at: r.receivedAt, status: 'received' });
    },
    onError: () => haptic.error(),
  });
  const title = field === 'Whole item' ? 'Report a problem' : `Report: ${field}`;
  const header = (
    <>
      <Stack.Screen options={{ title }} />
      <HeaderActions actions={[closeAction]} />
    </>
  );

  if (session.kind !== 'account') {
    return (
      <View style={styles.sheet}>
        {header}
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <EmptyState icon="flag" title="Sign in to report" body="Reports go to a reviewer, who may need to reach you. Guests can read and track, but not report." action={{ label: 'Sign in', onPress: () => router.push({ pathname: '/auth', params: { next: 'report', id } }) }} />
        </ScrollView>
      </View>
    );
  }

  if (send.isSuccess) {
    return (
      <View style={styles.sheet}>
        {header}
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: bottom }}>
          <Animated.View entering={FadeIn.duration(motion.base)} style={styles.done}>
            <IconTile icon="check" tone="ok" size={56} />
            <Txt v="title2" style={{ marginTop: 18 }}>
              Report sent
            </Txt>
            <Txt v="callout" c={colors.ink2} style={{ marginTop: 6 }}>{`${field} · ${reason ?? ''}. A reviewer checks it against the source, and you’ll hear back in Inbox.`}</Txt>
            <Tag label={`Receipt ${send.data.receipt}`} tone="outline" icon="doc" style={{ marginTop: 14 }} />
          </Animated.View>
          <GroupLabel>Status</GroupLabel>
          <Group inset={52}>
            <Row left={<IconTile icon="check" tone="ok" size={28} />} title="Received" detail={formatTime(send.data.receivedAt)} />
            <Row left={<IconTile icon="eye" size={28} />} title="Under review" subtitle="Usually within a day" />
            <Row left={<IconTile icon="circle" size={28} />} title="Fixed, or the reason given" tone="muted" />
          </Group>
          <GroupNote>Reports never unpublish anything by themselves, so mass reporting can’t bury a real notice.</GroupNote>
        </ScrollView>
        <Dock>
          <Button label="Done" variant="secondary" onPress={() => router.back()} />
        </Dock>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottom }}>
        <GroupLabel top={8}>What’s wrong with it?</GroupLabel>
        <Group>
          {REASONS.map((r) => (
            <Row
              key={r}
              title={r}
              accessibilityRole="radio"
              accessibilityState={{ checked: reason === r }}
              onPress={() => {
                haptic.selection();
                setReason(r);
              }}
              right={<Radio on={reason === r} />}
            />
          ))}
        </Group>
        <GroupLabel>What should it say? Optional</GroupLabel>
        <View style={styles.inputWrap}>
          <TextInput
            multiline
            value={correction}
            onChangeText={(t) => setCorrection(t.slice(0, MAX_CORRECTION))}
            placeholder="For example: the website says 30 November"
            placeholderTextColor={colors.ink3}
            style={styles.input}
            accessibilityLabel="Correction"
          />
          <Txt v="caption" c={colors.ink3} num style={styles.count}>{`${correction.length} / ${MAX_CORRECTION}`}</Txt>
        </View>
        <GroupNote>Don’t include ID numbers or personal details.</GroupNote>
        {send.isError && (
          <Animated.View entering={FadeIn.duration(motion.fast)} style={styles.error}>
            <Icon name="exclamation" size={15} color={colors.bad} />
            <Txt v="footnote" c={colors.bad} style={{ flex: 1 }}>{`${userMessage(toAppError(send.error).code)} Reference ${toAppError(send.error).correlationId}.`}</Txt>
          </Animated.View>
        )}
      </ScrollView>
      <Dock>
        <Button label={reason ? 'Send report' : 'Choose what’s wrong'} icon={reason ? 'flag' : undefined} disabled={!reason} loading={send.isPending} onPress={() => send.mutate()} />
      </Dock>
    </KeyboardAvoidingView>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.canvas },
  inputWrap: { marginHorizontal: GUTTER, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  input: { minHeight: 110, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, fontSize: 16, fontFamily: fonts.regular, color: colors.ink, textAlignVertical: 'top' },
  count: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingBottom: 8 },
  done: { paddingHorizontal: GUTTER + 4, paddingTop: 20 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: GUTTER + 4, paddingTop: 12 },
}));
