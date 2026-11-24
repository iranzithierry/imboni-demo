import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { formatTime } from '@/lib/dates';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { usePrefs } from '@/state/prefs';
import { useSession } from '@/state/session';
import { Badge, Radio } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Cell, Group, GroupFooter, GroupHeader } from '@/ui/list';
import { NavButton } from '@/ui/nav';
import { EmptyState } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const REASONS = ['Wrong date, amount or place', 'Mistranslation', 'Outdated', 'Not official', 'Duplicate', 'Misleading summary', 'Other'] as const;
const MAX_CORRECTION = 500;

export default function Report() {
  const { id, field = 'Whole item' } = useLocalSearchParams<{ id: string; field?: string }>();
  const api = useApi();
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

  const header = (right: React.ReactNode) => (
    <View style={styles.header}>
      <NavButton label={send.isSuccess ? 'Close' : 'Cancel'} onPress={() => router.back()} />
      <Txt v="hl" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">
        {field}
      </Txt>
      {right}
    </View>
  );

  if (session.kind !== 'account') {
    return (
      <View style={styles.sheet}>
        {header(<View style={{ width: 60 }} />)}
        <EmptyState icon="flag" color={colors.gray} title="Sign in to report" body="Reports go to a reviewer, who may need to reach you. Guests can read and track, but not report." />
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Button label="Sign in" onPress={() => router.push({ pathname: '/auth', params: { next: 'report', id } })} />
        </View>
      </View>
    );
  }

  if (send.isSuccess) {
    return (
      <View style={styles.sheet}>
        {header(<View style={{ width: 60 }} />)}
        <View style={styles.done}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.ok}>
            <Icon name="check" size={34} color={colors.white} />
          </Animated.View>
          <Txt v="t2" style={{ marginTop: 14 }}>
            Report sent
          </Txt>
          <Txt v="co" c={colors.l2} center style={{ marginTop: 4 }}>{`${field} · ${reason ?? ''}. A reviewer will check it and you’ll hear back in Inbox.`}</Txt>
          <Badge label={`Receipt ${send.data.receipt}`} style={{ marginTop: 12, alignSelf: 'center' }} />
        </View>
        <Group style={{ marginTop: 22 }}>
          <Cell left={<Radio on color={colors.green} />} title="Received" detail={formatTime(send.data.receivedAt)} />
          <Cell left={<View style={[styles.ring, { borderColor: colors.orange }]} />} title="Under review" />
          <Cell left={<View style={styles.ring} />} title="Fixed, or reason given" tone="muted" />
        </Group>
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header(<NavButton label="Send" bold disabled={!reason || send.isPending} onPress={() => send.mutate()} />)}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <GroupHeader top={8}>What’s wrong with it?</GroupHeader>
        <Group>
          {REASONS.map((r) => (
            <Cell
              key={r}
              title={r}
              accessibilityRole="radio"
              accessibilityState={{ checked: reason === r }}
              onPress={() => {
                haptic.selection();
                setReason(r);
              }}
              right={<Icon name="check" size={17} color={colors.tint} style={{ opacity: reason === r ? 1 : 0 }} />}
            />
          ))}
        </Group>
        <GroupHeader>What should it say? (optional)</GroupHeader>
        <Group>
          <TextInput
            multiline
            value={correction}
            onChangeText={(t) => setCorrection(t.slice(0, MAX_CORRECTION))}
            placeholder="e.g. the website says 30 November"
            placeholderTextColor={colors.l3}
            style={styles.input}
            accessibilityLabel="Correction"
          />
        </Group>
        <GroupFooter>Don’t include ID numbers or personal details.</GroupFooter>
        {send.isError && (
          <Animated.View entering={FadeIn} style={styles.error}>
            <Icon name="exclamation" size={13} color={colors.red} />
            <Txt v="fn" c={colors.red}>{`${userMessage(toAppError(send.error).code)} (ref ${toAppError(send.error).correlationId})`}</Txt>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingTop: 6 },
  input: { minHeight: 96, paddingHorizontal: 16, paddingVertical: 12, fontSize: 17, color: colors.l1, textAlignVertical: 'top' },
  done: { alignItems: 'center', paddingTop: 26, paddingHorizontal: 20 },
  ok: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.l3 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 32, paddingTop: 10 },
});
