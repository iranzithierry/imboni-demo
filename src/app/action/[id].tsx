import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Action } from '@/data/schema';
import { useAction, useInstitutionLookup, useToday } from '@/features/data';
import { useMenu } from '@/features/record/menu';
import { ChangeLine, DeadlineChip, FieldRow, ProvenanceLabel } from '@/features/record/parts';
import { useTracker } from '@/features/tracking';
import { daysBetween, formatDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { usePrefs } from '@/state/prefs';
import { Checkbox, IconTile, Tag } from '@/ui/atoms';
import { Button, IconButton } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Group, GroupLabel, INSET, Row } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { Dock, HeaderActions, PhotoStatusBar, useDockInset, useHeroTitle, useScrollY } from '@/ui/nav';
import { Photo, hasPhoto } from '@/ui/photo';
import { Highlight } from '@/ui/pressable';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

export default function ActionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { action, error, refetch, isPending } = useAction(id);
  if (!action) {
    return isPending ? null : <ErrorScreen error={error ?? new Error('not_found')} onRetry={() => refetch()} />;
  }
  return <ActionView action={action} />;
}

const layout = LinearTransition.duration(motion.base);
// Store selectors must return a stable value: a fresh [] on every read makes the store look changed forever.
const NO_STEPS: readonly number[] = [];

function ActionView({ action }: { action: Action }) {
  const colors = useColors();
  const styles = useStyles();
  const top = useSafeAreaInsets().top;
  const { width } = useWindowDimensions();
  const bottom = useDockInset();
  const today = useToday();
  const { scrollY, onScroll } = useScrollY();
  const inst = useInstitutionLookup()(action.institutionId);
  const tracked = usePrefs((s) => s.tracked[action.id]);
  const checked = usePrefs((s) => s.steps[action.id] ?? NO_STEPS);
  const toggleStep = usePrefs((s) => s.toggleStep);
  const lang = usePrefs((s) => s.contentLanguage);
  const tracker = useTracker();
  const toast = useToast();
  const menu = useMenu();
  const [original, setOriginal] = useState(false);
  const left = daysBetween(today, action.deadline);
  const phase = action.phases.find((p) => p.from <= today && today <= p.to);
  const nextPhase = action.phases.find((p) => p.from > today);
  const translated = lang !== 'EN' ? action.titleI18n?.[lang] : undefined;
  const title = translated && !original ? translated : action.title;
  const photoHero = hasPhoto(action.photo);
  const heroH = photoHero ? Math.round(Math.min(width, 480) * 0.62) + top : 0;
  const titleShown = useHeroTitle(scrollY, photoHero ? heroH - top - 40 : 60, action.shortTitle);

  const report = (field: string) => router.push({ pathname: '/report/[id]', params: { id: action.id, field } });
  const stopTracking = async () => {
    const removed = await tracker.stop(action.id);
    if (removed) toast({ message: 'Stopped tracking', icon: 'xmark', action: { label: 'Undo', onPress: () => tracker.restore(removed, action).catch(() => undefined) } });
  };
  const moreItems = [
    ...(action.originalId ? [{ label: 'View original', icon: 'doc' as const, onPress: () => router.push(toHref({ kind: 'original', id: action.originalId ?? '' })) }] : []),
    ...(action.storylineId ? [{ label: 'Open storyline', icon: 'list' as const, onPress: () => router.push(toHref({ kind: 'storyline', id: action.storylineId ?? '' })) }] : []),
    ...(tracked ? [{ label: 'Stop tracking', icon: 'xmark' as const, destructive: true, onPress: () => stopTracking() }] : []),
    { label: 'Report a problem', icon: 'flag' as const, onPress: () => report('Whole item') },
  ];

  const setCopyDone = (copyId: string, label: string, done: boolean) => {
    if (done) haptic.success();
    tracker.setDone(action, copyId, done).catch(() => undefined);
    if (done) toast({ message: `Marked done for ${label}`, icon: 'checkCircle', action: { label: 'Undo', onPress: () => tracker.setDone(action, copyId, false).catch(() => undefined) } });
  };

  return (
    <View style={{ flex: 1 }}>
      <PhotoStatusBar overPhoto={photoHero && !titleShown} />
      <HeaderActions
        actions={[
          { icon: 'share', label: 'Share', onPress: () => router.push({ pathname: '/share/[id]', params: { id: action.id } }) },
          { icon: 'more', label: 'More', onPress: () => menu(moreItems), menu: moreItems },
        ]}
      />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentInsetAdjustmentBehavior={photoHero ? 'never' : 'automatic'} contentContainerStyle={{ paddingBottom: bottom }}>
        {photoHero && (
          <View style={{ height: heroH }}>
            <Photo id={action.photo} fill />
          </View>
        )}

        <View style={styles.head}>
          <View style={styles.inst}>
            <InstitutionLogo id={inst.id} label={inst.mono} size="s" />
            <Highlight accessibilityRole="link" onPress={() => router.push(toHref({ kind: 'institution', id: inst.id }))} style={{ flex: 1 }}>
              <Txt v="footnote" w="semibold" numberOfLines={1}>
                {inst.name}
              </Txt>
            </Highlight>
            <ProvenanceLabel provenance={action.provenance} institution={inst.name} source={action.source.label} at={action.source.publishedAt} />
          </View>
          <Txt v="title1" style={{ marginTop: 14 }} accessibilityRole="header">
            {title}
          </Txt>
          {translated && (
            <Highlight accessibilityRole="button" onPress={() => setOriginal((o) => !o)} style={styles.translate}>
              <Txt v="footnote" c={colors.ink2}>
                {original ? 'Original wording · ' : 'Translated · '}
                <Txt v="footnote" w="semibold">
                  {original ? 'Show translation' : 'Show original'}
                </Txt>
              </Txt>
            </Highlight>
          )}
          <View style={styles.tags}>
            <Tag label="Action" tone="brand" icon="checklist" />
            <Tag label={action.required ? 'Required' : 'Advised'} tone={action.required ? 'red' : 'outline'} icon={action.required ? 'exclamation' : 'info'} />
            {action.repeats && <Tag label={action.repeats} tone="outline" icon="refresh" />}
            {tracked && <Tag label="Tracking" tone="outline" icon="check" />}
          </View>
          <Txt v="callout" c={colors.ink2} style={{ marginTop: 14 }}>
            {action.summary}
          </Txt>
        </View>

        <View style={styles.countCard} accessibilityLabel={`${left < 0 ? 'Closed' : `${left} days left`}. Ends ${formatDate.long(action.deadline)}`}>
          <View style={styles.countRow}>
            <Txt v="display" num>
              {Math.max(0, left)}
            </Txt>
            <View style={{ flex: 1, paddingBottom: 5 }}>
              <Txt v="callout" w="semibold">
                {left < 0 ? 'Closed' : `${left === 1 ? 'day' : 'days'} left${phase ? ` at ${phase.label.toLowerCase().split(' and ')[0]}` : ''}`}
              </Txt>
              <Txt v="footnote" c={colors.ink2} num>{`Ends ${formatDate.weekdayShort(action.deadline)} ${formatDate.year(action.deadline)}`}</Txt>
            </View>
            <DeadlineChip daysLeft={left} compact />
          </View>
          {action.phases.length > 0 && (
            <View style={styles.phases}>
              <View style={styles.bars}>
                {action.phases.map((p) => (
                  <View key={p.label} style={[styles.bar, { flex: Math.max(1, daysBetween(p.from, p.to)), backgroundColor: p === phase ? colors.accent : colors.fill }]} />
                ))}
              </View>
              <View style={styles.phaseCols}>
                {[phase, nextPhase].map((p, i) =>
                  p ? (
                    <View key={p.label} style={{ flex: 1 }}>
                      <Txt v="caption" c={i === 0 ? colors.ink : colors.ink3}>
                        {i === 0 ? 'Now' : 'Next'}
                      </Txt>
                      <Txt v="subhead" w="semibold" style={{ marginTop: 2 }}>
                        {p.label}
                      </Txt>
                      <Txt v="footnote" c={colors.ink2} num>
                        {i === 0 ? `Until ${formatDate.short(p.to)}` : `${formatDate.short(p.from)} – ${formatDate.long(p.to)}`}
                      </Txt>
                      {p.where && (
                        <Txt v="footnote" c={colors.ink3} style={{ marginTop: 2 }}>
                          {p.where}
                        </Txt>
                      )}
                    </View>
                  ) : null,
                )}
              </View>
            </View>
          )}
        </View>

        {action.revision && action.revision.changes[0] && (
          <Highlight accessibilityRole="button" accessibilityLabel="What changed" onPress={() => router.push(toHref({ kind: 'what_changed', id: action.id }))} pressedStyle={{ opacity: 0.8 }} style={styles.linkCard}>
            <View style={{ flex: 1, gap: 8 }}>
              <Txt v="subhead" w="semibold">{`Updated ${formatDate.short(action.revision.at.slice(0, 10))} · revision ${action.revision.rev}`}</Txt>
              <ChangeLine change={{ field: action.revision.changes[0].field, before: formatDate.short(action.revision.changes[0].before), after: formatDate.long(action.revision.changes[0].after) }} />
            </View>
            <Icon name="chevronRight" size={13} color={colors.pearl} weight="semibold" />
          </Highlight>
        )}

        {action.checker && (
          <Highlight accessibilityRole="button" onPress={() => router.push({ pathname: '/note-checker/[id]', params: { id: action.id } })} pressedStyle={{ opacity: 0.8 }} style={styles.linkCard}>
            <IconTile icon="banknote" size={44} tone="violet" />
            <View style={{ flex: 1 }}>
              <Txt v="callout" w="semibold">
                Check your notes
              </Txt>
              <Txt v="footnote" c={colors.ink2}>
                Only some issue dates are withdrawn, not whole values
              </Txt>
            </View>
            <Icon name="chevronRight" size={13} color={colors.pearl} weight="semibold" />
          </Highlight>
        )}

        {tracked && (
          <Animated.View layout={layout}>
            <GroupLabel>{`Your copies · ${tracked.copies.filter((c) => c.doneAt).length} of ${tracked.copies.length} done`}</GroupLabel>
            <Group inset={INSET.check}>
              {tracked.copies.map((c) => (
                <Row
                  key={c.id}
                  left={<Checkbox on={Boolean(c.doneAt)} tone="ok" />}
                  title={c.label}
                  subtitle={c.doneAt ? `Done ${formatDate.short(c.doneAt.slice(0, 10))}` : 'Not done yet'}
                  tone={c.doneAt ? 'muted' : 'default'}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: Boolean(c.doneAt) }}
                  onPress={() => setCopyDone(c.id, c.label, !c.doneAt)}
                />
              ))}
            </Group>
          </Animated.View>
        )}

        <GroupLabel>Details · long-press a line to report it</GroupLabel>
        <View style={styles.fields}>
          <FieldRow label="Who" value={action.details.who} onReport={() => report('Who')} />
          <FieldRow label="Where" value={action.details.where} onReport={() => report('Where')} />
          <FieldRow label="Bring" value={action.details.bring} onReport={() => report('Bring')} />
          <FieldRow label="Cost" value={action.details.cost} onReport={() => report('Cost')} />
          <FieldRow label="Deadline" value={formatDate.long(action.deadline)} onReport={() => report('Deadline')} last />
        </View>

        <GroupLabel>{`Steps · ${checked.length} of ${action.steps.length}`}</GroupLabel>
        <Group inset={INSET.check}>
          {action.steps.map((step, i) => {
            const on = checked.includes(i);
            return (
              <Row
                key={step}
                left={<Checkbox on={on} />}
                title={step}
                tone={on ? 'muted' : 'default'}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  haptic.selection();
                  toggleStep(action.id, i);
                }}
              />
            );
          })}
        </Group>

        {(action.portal || action.directoryId) && (
          <>
            <GroupLabel>Where to do it</GroupLabel>
            <Group inset={INSET.tile}>
              {action.portal && <Row left={<IconTile icon="external" />} title={action.portal.label} subtitle="Official site · Imboni never asks for your details" chevron onPress={() => WebBrowser.openBrowserAsync(action.portal?.url ?? '').catch(() => undefined)} />}
              {action.directoryId && <Row left={<IconTile icon="building" tone="teal" />} title="Offices, hours and contacts" subtitle={action.details.where} chevron onPress={() => router.push(toHref({ kind: 'directory', id: action.directoryId ?? '' }))} />}
            </Group>
          </>
        )}

        <GroupLabel>Source</GroupLabel>
        <Group inset={INSET.tile}>
          <Row
            left={<IconTile icon="doc" />}
            title={action.originalId ? 'View original' : action.source.label}
            subtitle={`${action.source.label} · ${formatDate.long(action.source.publishedAt)}`}
            chevron={Boolean(action.originalId)}
            onPress={action.originalId ? () => router.push(toHref({ kind: 'original', id: action.originalId ?? '' })) : action.source.url ? () => WebBrowser.openBrowserAsync(action.source.url ?? '').catch(() => undefined) : undefined}
          />
          {action.storylineId && <Row left={<IconTile icon="list" tone="violet" />} title="Storyline" subtitle="Every update about this, in order" chevron onPress={() => router.push(toHref({ kind: 'storyline', id: action.storylineId ?? '' }))} />}
          <Row left={<IconTile icon="flag" />} title="Report a problem" subtitle="A date, amount, place or translation" chevron onPress={() => report('Whole item')} />
        </Group>
      </Animated.ScrollView>
      <Dock row>
        {tracked ? (
          <>
            <IconButton icon="bell" label="Reminders" size={52} onPress={() => router.push({ pathname: '/track/[id]', params: { id: action.id } })} />
            <View style={{ flex: 1 }}>
              <Button label={`Tracking for ${tracked.copies.length === 1 ? '1 person' : `${tracked.copies.length} people`}`} icon="checklist" variant="secondary" onPress={() => router.navigate('/tracking')} />
            </View>
          </>
        ) : (
          <View style={{ flex: 1 }}>
            <Button label="Track this action" icon="plus" onPress={() => router.push({ pathname: '/track/[id]', params: { id: action.id } })} accessibilityHint="Choose who it is for and set reminders" />
          </View>
        )}
      </Dock>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  head: { paddingHorizontal: GUTTER, paddingTop: 18 },
  inst: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  translate: { marginTop: 6, alignSelf: 'flex-start' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  countCard: { marginHorizontal: GUTTER, marginTop: 22, padding: 18, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  countRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  phases: { marginTop: 18 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { height: 6, borderRadius: radius.xs },
  phaseCols: { flexDirection: 'row', gap: 16, marginTop: 12 },
  linkCard: { marginHorizontal: GUTTER, marginTop: 12, padding: 14, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fields: { marginHorizontal: GUTTER, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, overflow: 'hidden' },
}));
