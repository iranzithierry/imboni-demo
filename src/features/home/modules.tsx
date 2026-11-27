import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { daysBetween, formatDate, formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { windowRemaining, type TrackRow } from '@/lib/tracking';
import { usePrefs } from '@/state/prefs';
import { Bar, Skeleton, Tag } from '@/ui/atoms';
import { Button, IconButton, TextAction } from '@/ui/button';
import { FeatureIcon, type FeatureIconName } from '@/illustrations/icons';
import { Icon } from '@/ui/icon';
import { Rule, SectionHeader } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { Highlight, PressableScale } from '@/ui/pressable';
import { RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors, type Palette } from '@/ui/theme';
import { useToast } from '@/ui/toast';

import { useInstitutionLookup, useNow } from '../data';
import { useMenu } from '../record/menu';
import { useTracker } from '../tracking';
import { SwipeRow, useTrackRowActions } from '../tracking/swipe-row';

const layout = LinearTransition.duration(motion.base);

/** Active safety alert for the person's area. Severity is carried by icon, word and colour together. */
export function SafetyBanner() {
  const colors = useColors();
  const styles = useStyles();
  const { data } = useQuery(q.safetyAlerts(useApi()));
  const dismissed = usePrefs((s) => s.dismissedAlerts);
  const set = usePrefs((s) => s.set);
  const now = useNow().getTime();
  const lookup = useInstitutionLookup();
  const alert = data?.find((a) => !dismissed.includes(a.id) && new Date(a.until).getTime() > now);
  if (!alert) return null;
  return (
    <Animated.View exiting={FadeOut.duration(motion.fast)} layout={layout} style={[styles.bannerWrap, styles.banner]}>
      <Highlight
        accessibilityRole="button"
        accessibilityLabel={`Alert, ${alert.severity}. ${alert.title}. ${alert.area}, until ${formatTime(alert.until)}. ${alert.advice}.`}
        onPress={() => router.push(toHref({ kind: 'alert', id: alert.id }))}
        pressedStyle={{ opacity: 0.85 }}
        style={styles.bannerBody}>
        <View style={styles.bannerIcon}>
          <Icon name="rain" size={20} color={colors.bad} weight="semibold" />
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="caption" c={colors.bad} num>{`${alert.severity === 'warning' ? 'Warning' : 'Watch'} · ${lookup(alert.issuerId).name} · until ${formatTime(alert.until)}`}</Txt>
          <Txt v="headline" style={{ marginTop: 2 }}>
            {alert.title}
          </Txt>
          <Txt v="footnote" c={colors.ink2}>{`${alert.area} · ${alert.advice}`}</Txt>
        </View>
      </Highlight>
      <IconButton
        icon="xmark"
        label="Dismiss alert"
        variant="plain"
        size={32}
        onPress={() => {
          haptic.tap();
          set('dismissedAlerts', [...dismissed, alert.id]);
        }}
      />
    </Animated.View>
  );
}

/** The tracked action due soonest: a quiet card where only the days left carry the accent. */
export function UpNext({ row, today }: { row: TrackRow; today: string }) {
  const colors = useColors();
  const styles = useStyles();
  const inst = useInstitutionLookup()(row.action.institutionId);
  const tracker = useTracker();
  const toast = useToast();
  const menu = useMenu();
  const { action, daysLeft, done, tracked, open } = row;
  const phase = action.phases.find((p) => p.from <= today && today <= p.to);

  const markDone = (copyId: string, label: string) => {
    haptic.success();
    tracker.setDone(action, copyId, true).catch(() => undefined);
    toast({ message: `Marked done for ${label}`, icon: 'checkCircle', action: { label: 'Undo', onPress: () => tracker.setDone(action, copyId, false).catch(() => undefined) } });
  };
  const onDone = () => {
    if (open.length === 1 && open[0]) return markDone(open[0].id, open[0].label);
    menu(
      open.map((c) => ({ label: `Done for ${c.label}`, onPress: () => markDone(c.id, c.label) })),
      'Mark done',
      'Each person’s copy is marked on its own.',
    );
  };

  return (
    <View style={styles.upNext}>
      <PressableScale accessibilityRole="button" accessibilityLabel={`Up next. Action, ${action.required ? 'required' : 'advised'}, ${daysLeft} days left. ${action.title}`} onPress={() => router.push(toHref({ kind: 'action', id: action.id }))}>
        <View style={styles.between}>
          <View style={styles.upLabel}>
            <Txt v="headline">Up next</Txt>
            <Txt v="footnote" c={colors.ink2}>{action.required ? 'Required' : 'Advised'}</Txt>
          </View>
          <InstitutionLogo id={inst.id} label={inst.mono} size="s" />
        </View>
        <Txt v="callout" w="medium" style={{ marginTop: 8 }}>
          {action.title}
        </Txt>
        <View style={styles.count}>
          <Txt v="title1" num c={colors.accent}>
            {Math.max(0, daysLeft)}
          </Txt>
          <View style={{ paddingBottom: 3, flex: 1 }}>
            <Txt v="subhead" w="medium">
              {`${daysLeft === 1 ? 'day' : 'days'} left${phase ? ` at ${phase.label.toLowerCase().split(' and ')[0]}` : ''}`}
            </Txt>
            <Txt v="footnote" c={colors.ink2} num>{`Ends ${formatDate.weekdayShort(action.deadline)} ${formatDate.year(action.deadline)}`}</Txt>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <Bar value={1 - windowRemaining(action, today)} height={4} />
        </View>
        {(action.revision || tracked.copies.length > 1) && (
          <View style={styles.upTags}>
            {action.revision && <Tag label="Deadline moved" icon="refresh" />}
            {tracked.copies.length > 1 && <Tag label={`${done.length} of ${tracked.copies.length} done`} icon="people" />}
          </View>
        )}
      </PressableScale>
      <View style={styles.upActions}>
        <View style={{ flex: 1 }}>
          <Button label={open.length > 1 ? 'Mark done…' : 'Mark done'} icon="check" size="md" variant="secondary" onPress={onDone} />
        </View>
        <Button label="Reminders" variant="quiet" icon="bell" size="md" hug onPress={() => router.push({ pathname: '/track/[id]', params: { id: action.id } })} />
      </View>
    </View>
  );
}

/** The next few deadlines as the same rows as Tracking: tick to mark done, swipe to snooze, open for details. */
export function DueSoon({ rows }: { rows: readonly TrackRow[]; today: string }) {
  const { markDone, snooze } = useTrackRowActions();
  if (!rows.length) return null;
  return (
    <Animated.View layout={layout}>
      <SectionHeader title="Due soon" compact accessory={<TextAction label="All" onPress={() => router.navigate('/tracking')} />} />
      {rows.map((r, i) => (
        <Fragment key={r.action.id}>
          {i > 0 && <Rule style={{ marginLeft: GUTTER + 38 }} />}
          <SwipeRow row={r} onDone={() => markDone(r)} onSnooze={() => snooze(r)} />
        </Fragment>
      ))}
    </Animated.View>
  );
}

/** Calendar-leaf date: month over day. Dates within a week take the brand tint. */
export function DateTile({ ymd, far, size = 44, urgent }: { ymd: string; far?: boolean; size?: number; urgent?: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.date, { width: size, height: size + 4 }, urgent && { backgroundColor: colors.accentWash, borderColor: colors.accentWash }]} accessibilityElementsHidden>
      <Txt v="caption" c={urgent ? colors.accentInk : colors.ink2} style={{ fontSize: 11, lineHeight: 13 }}>
        {far ? formatDate.year(ymd) : formatDate.monthShort(ymd)}
      </Txt>
      <Txt v="title3" num c={urgent ? colors.accentInk : colors.ink} style={{ fontSize: 19, lineHeight: 22 }}>
        {far ? formatDate.monthShort(ymd) : formatDate.day(ymd)}
      </Txt>
    </View>
  );
}

/** One fact per line: a small icon, what it is, and the single number or state that matters. */
function GlanceRow({ art, label, value, note, noteColor, onPress, a11y }: { art: FeatureIconName; label: string; value: string; note?: string; noteColor?: string; onPress: () => void; a11y: string }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Highlight accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} pressedStyle={{ backgroundColor: colors.pressed }} style={styles.line}>
      <FeatureIcon name={art} size={28} />
      <Txt v="subhead" c={colors.ink2} numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </Txt>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt v="subhead" w="semibold" num numberOfLines={1}>
          {value}
        </Txt>
        {note && (
          <Txt v="caption" c={noteColor ?? colors.ink2} num numberOfLines={1}>
            {note}
          </Txt>
        )}
      </View>
    </Highlight>
  );
}

const change = (colors: Palette, pct: number) => (pct === 0 ? { fg: colors.ink2, text: 'No change' } : pct > 0 ? { fg: colors.ok, text: `↑ ${pct.toFixed(2)}%` } : { fg: colors.bad, text: `↓ ${Math.abs(pct).toFixed(2)}%` });

/** At a glance: rates, your route, the next event and fuel, as four quiet lines. Each loads and retries alone. */
export function TodayStrip({ today, offline }: { today: string; offline: boolean }) {
  const colors = useColors();
  const api = useApi();
  const rates = useQuery(q.rates(api));
  const roads = useQuery(q.roads(api));
  const calendar = useQuery(q.calendar(api));
  const usd = rates.data?.fx[0];
  const onRoute = roads.data?.advisories.filter((a) => a.onRoute) ?? [];
  const next = calendar.data?.filter((e) => e.date >= today && e.from && e.state !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextLabel = next ? (daysBetween(today, next.date) === 0 ? 'Today' : daysBetween(today, next.date) === 1 ? 'Tomorrow' : formatDate.weekdayShort(next.date)) : '';
  const go = (href: Href) => () => router.push(href);
  const failed = [rates, roads, calendar].filter((x) => x.isError && !x.data);

  return (
    <View>
      <SectionHeader title="At a glance" compact accessory={offline ? <Txt v="caption" c={colors.ink2}>Saved copy</Txt> : undefined} />
      {usd && (
        <GlanceRow art="rates" label="US dollar" value={usd.value.toLocaleString('en-GB', { minimumFractionDigits: 2 })} note={change(colors, usd.changePct).text} noteColor={change(colors, usd.changePct).fg} onPress={go('/rates')} a11y={`US dollar ${usd.value} francs, ${change(colors, usd.changePct).text}`} />
      )}
      {roads.data && (
        <GlanceRow
          art="roads"
          label="Your route"
          value={onRoute.length ? `${onRoute[0]?.road ?? ''} closed` : 'Clear'}
          note={onRoute[0] ? `${daysBetween(today, onRoute[0].window.from.slice(0, 10)) === 1 ? 'Tomorrow' : formatDate.weekdayShort(onRoute[0].window.from.slice(0, 10))} ${formatTime(onRoute[0].window.from)}` : undefined}
          noteColor={onRoute.length ? colors.bad : undefined}
          onPress={go('/traffic')}
          a11y={`Your route. ${onRoute.length ? `${onRoute[0]?.road ?? ''} closed` : 'Clear'}`}
        />
      )}
      {next && <GlanceRow art="calendar" label={next.title} value={nextLabel} note={next.from ?? undefined} onPress={go('/calendar')} a11y={`Next: ${next.title}, ${nextLabel}`} />}
      {rates.data && (
        <GlanceRow art="fuel" label="Petrol, per litre" value={`Rwf ${(rates.data.fuel.items[0]?.price ?? 0).toLocaleString('en-GB')}`} onPress={go('/rates')} a11y={`Petrol ${rates.data.fuel.items[0]?.price ?? ''} francs a litre`} />
      )}
      {(rates.isPending || roads.isPending || calendar.isPending) && <Skeleton width="60%" height={14} style={{ marginHorizontal: GUTTER, marginVertical: 12 }} />}
      {failed.length > 0 && <RetryLine label="Some figures" error={failed[0]?.error} onRetry={() => failed.forEach((x) => x.refetch())} style={{ marginTop: 6 }} />}
      <View style={{ height: 8 }} />
    </View>
  );
}

export function ModuleRetry({ label, error, onRetry }: { label: string; error: unknown; onRetry: () => void }) {
  return (
    <Animated.View layout={layout} style={{ marginTop: 16 }}>
      <RetryLine label={label} error={error} onRetry={onRetry} />
    </Animated.View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    bannerWrap: {},
    banner: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 14, paddingLeft: GUTTER, paddingRight: GUTTER - 8 },
    bannerBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    bannerIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.badWash, alignItems: 'center', justifyContent: 'center' },
    row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    line: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: GUTTER, paddingVertical: 8 },
    upNext: { paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 16 },
    upLabel: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    count: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 10 },
    upTags: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
    upActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    date: { borderRadius: radius.md, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  }),
);
