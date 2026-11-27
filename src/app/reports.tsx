import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { useActions } from '@/features/data';
import { formatDate, formatTime } from '@/lib/dates';
import { usePrefs } from '@/state/prefs';
import type { Prefs } from '@/state/schema';
import { useSession } from '@/state/session';
import { Card, IconTile, Tag } from '@/ui/atoms';
import { Icon, type IconName } from '@/ui/icon';
import { Group, GroupLabel, INSET, Row } from '@/ui/list';
import { EmptyState } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, radius, useColors } from '@/ui/theme';

type Report = Prefs['reports'][number];

const STEPS = ['Received', 'Under review', 'Fixed or reason given'] as const;
/** Completed steps and the step in progress for each status. */
const PROGRESS: Record<Report['status'], { done: number; current: number; label: string }> = {
  received: { done: 1, current: -1, label: 'Received' },
  reviewing: { done: 1, current: 1, label: 'Under review' },
  resolved: { done: 3, current: -1, label: 'Fixed or reason given' },
};

const HOW: { icon: IconName; text: string }[] = [
  { icon: 'shield', text: 'A reviewer checks every report against the official source, and sooner when the field affects a deadline, amount or place.' },
  { icon: 'hand', text: 'Reports never unpublish anything by themselves, so mass reporting can’t bury a real notice.' },
  { icon: 'refresh', text: 'If a report is upheld, everyone tracking the item sees exactly what changed.' },
  { icon: 'bell', text: 'You hear back in Inbox: fixed, or the reason it was dismissed.' },
];

export default function Reports() {
  const styles = useStyles();
  const api = useApi();
  const session = useSession((s) => s.session);
  const reports = usePrefs((s) => s.reports);
  const actions = useActions().data;
  const feed = useQuery(q.feed(api)).data;
  const notices = useQuery(q.notices(api)).data;
  const titleOf = (id: string) => actions?.find((a) => a.id === id)?.title ?? feed?.find((f) => f.id === id)?.title ?? notices?.find((n) => n.id === id)?.title ?? id;

  return (
    <>
      <Stack.Screen options={{ title: 'My reports', headerLargeTitleEnabled: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: 4, paddingBottom: 40 }}>
        {session.kind !== 'account' ? (
          <EmptyState
            icon="flag"
            title="Sign in to see your reports"
            body="Reports are tied to an account so a reviewer can follow up with you. Guests can read and track, but not report."
            action={{ label: 'Sign in', onPress: () => router.push({ pathname: '/auth', params: { next: 'me' } }) }}
          />
        ) : reports.length === 0 ? (
          <EmptyState icon="flag" art="reports" title="No reports yet" body="Spot a wrong date, amount or place? Use Report a problem on any item, or long-press a single field." />
        ) : (
          <View style={styles.list}>
            {reports.map((r) => (
              <ReportCard key={r.receipt} report={r} title={titleOf(r.subject)} />
            ))}
          </View>
        )}

        <GroupLabel top={32}>How reports work</GroupLabel>
        <Group inset={INSET.tile}>
          {HOW.map((h) => (
            <Row key={h.icon} left={<IconTile icon={h.icon} />} align="top">
              <Txt v="subhead">{h.text}</Txt>
            </Row>
          ))}
        </Group>
      </ScrollView>
    </>
  );
}

function ReportCard({ report, title }: { report: Report; title: string }) {
  const colors = useColors();
  const styles = useStyles();
  const p = PROGRESS[report.status];
  const active = (i: number) => i < p.done || i === p.current;
  return (
    <Card radiusSize="lg">
      <View style={styles.between}>
        <Txt v="footnote" w="semibold" num>{`Receipt ${report.receipt}`}</Txt>
        <Txt v="caption" c={colors.ink3} num>
          {`${formatDate.short(report.at.slice(0, 10))}, ${formatTime(report.at)}`}
        </Txt>
      </View>
      <Txt v="callout" w="semibold" style={{ marginTop: 8 }}>
        {report.reason}
      </Txt>
      <Txt v="footnote" c={colors.ink2} numberOfLines={2} style={{ marginTop: 2 }}>
        {`${report.field} · ${title}`}
      </Txt>
      <View style={styles.track} accessibilityLabel={`Status: ${p.label}.`}>
        {STEPS.map((step, i) => {
          const done = i < p.done;
          const current = i === p.current;
          return (
            <View key={step} style={styles.step}>
              <View style={styles.stepTop}>
                <View style={[styles.node, done ? styles.nodeDone : current ? styles.nodeCurrent : styles.nodeTodo]}>{done && <Icon name="check" size={11} color={colors.white} weight="semibold" />}</View>
                {i < STEPS.length - 1 && <View style={[styles.link, { backgroundColor: active(i + 1) ? colors.accent : colors.line }]} />}
              </View>
              <Txt v="caption" c={done || current ? colors.ink : colors.ink3} style={{ marginTop: 6, paddingRight: 8 }}>
                {step}
              </Txt>
            </View>
          );
        })}
      </View>
      {report.status === 'resolved' && <Tag label="Closed" tone="ok" icon="checkCircle" style={{ marginTop: 12 }} />}
    </Card>
  );
}

const NODE = 20;

const useStyles = createStyles((colors) => StyleSheet.create({
  list: { gap: 12, paddingHorizontal: GUTTER },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  track: { flexDirection: 'row', marginTop: 16 },
  step: { flex: 1 },
  stepTop: { flexDirection: 'row', alignItems: 'center' },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: colors.accent },
  nodeCurrent: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.card },
  nodeTodo: { borderWidth: 1.5, borderColor: colors.pearl, backgroundColor: colors.card },
  link: { flex: 1, height: 2, marginHorizontal: 4, borderRadius: radius.xs },
}));
