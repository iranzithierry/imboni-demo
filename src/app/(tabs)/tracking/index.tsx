import { router } from 'expo-router';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { useActions, useInstitutionLookup, useStorylines, useToday } from '@/features/data';
import { SwipeRow, useTrackRowActions } from '@/features/tracking/swipe-row';
import { formatDate } from '@/lib/dates';
import { toHref } from '@/lib/links';
import { deriveTracking } from '@/lib/tracking';
import { usePrefs } from '@/state/prefs';
import { Checkbox, IconTile } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Group, GroupNote, INSET, Row, Rule, SectionHeader } from '@/ui/list';
import { BarTitle, HeaderActions } from '@/ui/nav';
import { Photo, hasPhoto } from '@/ui/photo';
import { EmptyState, RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors } from '@/ui/theme';

const LEVEL_LABEL = { all: 'All updates', important: 'Important', digest: 'Digest', off: 'Off' } as const;

export default function Tracking() {
  const colors = useColors();
  const styles = useStyles();
  const today = useToday();
  const actions = useActions();
  const storylines = useStorylines();
  const lookup = useInstitutionLookup();
  const tracked = usePrefs((s) => s.tracked);
  const archive = usePrefs((s) => s.archive);
  const followed = usePrefs((s) => s.storylines);
  const people = usePrefs((s) => s.people);
  const { markDone, snooze } = useTrackRowActions();
  const view = actions.data ? deriveTracking(tracked, actions.data, archive, today, people) : null;
  const stories = (storylines.data ?? []).filter((s) => (followed[s.id] ?? 'off') !== 'off');
  const summary = view ? [`${view.todo.length} to do`, view.missed.length ? `${view.missed.length} missed` : null, `${view.done.length} done`].filter(Boolean).join(' · ') : ' ';

  return (
    <>
      <BarTitle title="Tracking" />
      <HeaderActions actions={[{ icon: 'plus', label: 'Track something', onPress: () => router.push('/search') }]} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 40 }}>
        <Txt v="subhead" c={colors.ink2} num style={styles.summary}>
          {summary}
        </Txt>
        {actions.isError && !actions.data ? (
          <RetryLine label="Tracking" error={actions.error} onRetry={() => actions.refetch()} style={{ marginTop: 16 }} />
        ) : (
          view && (
            <Animated.View entering={FadeIn.duration(motion.fast)} layout={LinearTransition.duration(motion.base)}>
              <Rule />
              <SectionHeader title="To do" compact accessory={<Txt v="footnote" c={colors.ink2} num>{String(view.todo.length)}</Txt>} />
              {view.todo.length ? (
                <>
                  {view.todo.map((r, i) => (
                    <Fragment key={r.action.id}>
                      {i > 0 && <Rule style={{ marginLeft: GUTTER + 38 }} />}
                      <SwipeRow row={r} onDone={() => markDone(r)} onSnooze={() => snooze(r)} />
                    </Fragment>
                  ))}
                  <GroupNote>Swipe left to mark done, right to snooze the next reminder.</GroupNote>
                </>
              ) : (
                <EmptyState icon="checklist" art="tracking" title="Nothing to do" body="Track an action to get reminders that tighten as the deadline gets close." action={{ label: 'Find something to track', onPress: () => router.push('/search') }} />
              )}

              {view.missed.length > 0 && (
                <>
                  <Rule style={{ marginTop: 16 }} />
                  <SectionHeader title="Missed" compact accessory={<Txt v="footnote" c={colors.bad} num>{String(view.missed.length)}</Txt>} />
                  <Group plain inset={INSET.tile}>
                    {view.missed.map((r) => (
                      <Row
                        key={r.action.id}
                        align="top"
                        left={<IconTile icon="clock" tone="red" />}
                        title={r.action.title}
                        subtitle={`${lookup(r.action.institutionId).mono} · closed ${formatDate.long(r.action.deadline)} · ${r.open.map((c) => c.label).join(', ')}`}
                        onPress={() => router.push(toHref({ kind: 'action', id: r.action.id }))}>
                        <View style={styles.missedActions}>
                          <Button label="Follow next round" icon="bell" variant="secondary" size="sm" hug onPress={() => router.push(toHref({ kind: 'institution', id: r.action.institutionId }))} />
                        </View>
                      </Row>
                    ))}
                  </Group>
                </>
              )}

              <Rule style={{ marginTop: 16 }} />
              <SectionHeader title="People" compact />
              <Group plain inset={INSET.tile}>
                {view.people.map((p) => (
                  <Row
                    key={p.label}
                    left={
                      <View style={styles.person}>
                        <Txt v="callout" w="semibold">
                          {p.label[0] ?? '?'}
                        </Txt>
                      </View>
                    }
                    title={p.label}
                    right={
                      <Txt v="footnote" c={p.open ? colors.ink2 : colors.ok} num>
                        {p.open ? `${p.open} open` : 'All done'}
                      </Txt>
                    }
                  />
                ))}
              </Group>
              <GroupNote>Labels only, never names or ID numbers. Add someone when you track an action.</GroupNote>

              {view.done.length > 0 && (
                <>
                  <Rule style={{ marginTop: 16 }} />
                  <SectionHeader title="Done" compact />
                  <Group plain inset={INSET.check}>
                    {view.done.map((d) => (
                      <Row key={d.key} left={<Checkbox on tone="ok" />} title={d.title} subtitle={`Done ${formatDate.long(d.doneAt.slice(0, 10))}`} tone="muted" />
                    ))}
                  </Group>
                </>
              )}
            </Animated.View>
          )
        )}

        <Rule style={{ marginTop: 16 }} />
        <SectionHeader title="Storylines you follow" compact />
        {stories.length ? (
          <Group plain inset={80}>
            {stories.map((s) => (
              <Row
                key={s.id}
                left={hasPhoto(s.cover) ? <Photo id={s.cover} aspect={1} radius={radius.md} style={{ width: 52 }} /> : <IconTile icon="list" size={52} />}
                title={s.title}
                subtitle={`${lookup(s.institutionId).mono} · ${s.latest}`}
                right={
                  <Txt v="caption" c={colors.ink2}>
                    {LEVEL_LABEL[followed[s.id] ?? 'off']}
                  </Txt>
                }
                onPress={() => router.push(toHref({ kind: 'storyline', id: s.id }))}
              />
            ))}
          </Group>
        ) : (
          <EmptyState icon="list" title="No storylines yet" body="Follow a storyline to see each extension, correction and clarification in order." />
        )}
      </ScrollView>
    </>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    summary: { paddingHorizontal: GUTTER, paddingTop: 2, paddingBottom: 10 },
    missedActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    person: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  }),
);
