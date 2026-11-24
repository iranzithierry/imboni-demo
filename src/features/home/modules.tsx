import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition, SlideInUp } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { daysBetween, formatDate, formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { windowRemaining, type TrackRow } from '@/lib/tracking';
import { usePrefs } from '@/state/prefs';
import { DateBadge, Skeleton, Tile } from '@/ui/atoms';
import { CapButton, CircleButton } from '@/ui/button';
import { Cell, Group, INSET, SectionTitle } from '@/ui/list';
import { PressableScale } from '@/ui/pressable';
import { Ring } from '@/ui/ring';
import { RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

import { useInstitutionLookup, useNow } from '../data';

export function SafetyBanner() {
  const { data } = useQuery(q.safetyAlerts(useApi()));
  const dismissed = usePrefs((s) => s.dismissedAlerts);
  const set = usePrefs((s) => s.set);
  const now = useNow().getTime();
  const alert = data?.find((a) => !dismissed.includes(a.id) && new Date(a.until).getTime() > now);
  if (!alert) return null;
  return (
    <Animated.View entering={SlideInUp.springify().damping(18)} exiting={FadeOut} style={styles.banner} accessibilityRole="alert">
      <Tile icon="rain" color="red" size="m" />
      <View style={{ flex: 1 }}>
        <Txt v="sh" w="600">
          {alert.title}
        </Txt>
        <Txt v="fn" c={colors.l2}>{`${alert.area} · until ${formatTime(alert.until)} · ${alert.advice}`}</Txt>
      </View>
      <CircleButton
        icon="xmark"
        label="Dismiss"
        onPress={() => {
          haptic.tap();
          set('dismissedAlerts', [...dismissed, alert.id]);
        }}
      />
    </Animated.View>
  );
}

export function UpNext({ row, today }: { row: TrackRow; today: string }) {
  const lookup = useInstitutionLookup();
  const { action, daysLeft, done, tracked } = row;
  const phase = action.phases.find((p) => p.from <= today && today <= p.to);
  return (
    <PressableScale feedback="tap" accessibilityRole="button" accessibilityLabel={`Up next: ${action.title}, ${daysLeft} days left`} onPress={() => router.push(toHref({ kind: 'action', id: action.id }))} style={styles.upNext}>
      <View style={styles.row16}>
        <Ring size={92} stroke={12} progress={windowRemaining(action, today)} color={colors.orange} trackColor="rgba(255,149,0,0.25)">
          <Txt num c={colors.white} style={{ fontSize: 30, lineHeight: 30, fontWeight: '700' }}>
            {daysLeft}
          </Txt>
          <Txt v="c2" c={colors.dark.l2}>
            {daysLeft === 1 ? 'day' : 'days'}
          </Txt>
        </Ring>
        <View style={{ flex: 1 }}>
          <Txt v="c1" w="600" c={colors.orange} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {`Up next${action.required ? ' · Required' : ''}`}
          </Txt>
          <Txt v="t3" c={colors.white} style={{ marginTop: 2 }}>
            {action.title}
          </Txt>
          <Txt v="fn" c={colors.dark.l2} num style={{ marginTop: 2 }}>
            {`${lookup(action.institutionId).mono} · ${phase ? `${phase.label.split(' ')[0]?.toLowerCase()} until` : 'due'} ${formatDate.weekdayShort(action.deadline)}`}
          </Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {action.revision && <CapButton label="Deadline moved" icon="refresh" variant="glass" />}
        {tracked.copies.length > 1 && <CapButton label={`${done.length} of ${tracked.copies.length} done`} icon="people" variant="glass" />}
      </View>
    </PressableScale>
  );
}

export function DueSoon({ rows, today }: { rows: readonly TrackRow[]; today: string }) {
  const lookup = useInstitutionLookup();
  if (!rows.length) return null;
  return (
    <>
      <SectionTitle
        title="Due soon"
        accessory={
          <Txt v="sh" c={colors.tint} onPress={() => router.navigate('/tracking')} accessibilityRole="link">
            See all
          </Txt>
        }
      />
      <Group inset={INSET.avatar}>
        {rows.map((r) => {
          const people = r.tracked.copies.length > 1 ? `${r.done.length} of ${r.tracked.copies.length} people done` : `in ${daysBetween(today, r.action.deadline)} days`;
          return (
            <Cell key={r.action.id} left={<DateBadge month={formatDate.monthTag(r.action.deadline)} day={r.daysLeft > 180 ? `’${formatDate.year(r.action.deadline).slice(2)}` : formatDate.day(r.action.deadline)} />} title={r.action.title} subtitle={`${lookup(r.action.institutionId).mono} · ${people}`} chevron onPress={() => router.push(toHref({ kind: 'action', id: r.action.id }))} />
          );
        })}
      </Group>
    </>
  );
}

function GlanceTile({ children, onPress, label }: { children: React.ReactNode; onPress?: () => void; label: string }) {
  return (
    <PressableScale feedback="tap" accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={!onPress} style={styles.tile}>
      {children}
    </PressableScale>
  );
}

function TileSkeleton() {
  return (
    <View style={[styles.tile, { gap: 6 }]} accessibilityLabel="Loading">
      <Skeleton width={30} height={30} radius={7} />
      <View style={{ marginTop: 'auto', gap: 6 }}>
        <Skeleton width={40} height={12} />
        <Skeleton width={70} height={18} />
      </View>
    </View>
  );
}

function TileError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <View style={styles.tile}>
      <Tile icon="exclamation" color="gray" />
      <Txt v="fn" c={colors.l2} style={{ marginTop: 'auto' }}>{`${label} didn’t load`}</Txt>
      <CapButton label="Retry" onPress={onRetry} />
    </View>
  );
}

/** Three tiles, three requests: each loads, fails and retries on its own. */
export function AtAGlance({ today, offline }: { today: string; offline: boolean }) {
  const api = useApi();
  const rates = useQuery(q.rates(api));
  const roads = useQuery(q.roads(api));
  const calendar = useQuery(q.calendar(api));
  const stamp = rates.data ? formatTime(rates.data.asOf) : '';
  const usd = rates.data?.fx[0];
  const onRoute = roads.data?.advisories.filter((a) => a.onRoute) ?? [];
  const next = calendar.data?.filter((e) => e.date >= today && e.from).sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <>
      <SectionTitle title="At a glance" accessory={stamp ? <Txt v="fn" c={colors.l2} num>{stamp}</Txt> : undefined} />
      <View style={styles.tiles}>
        {rates.isPending ? (
          <TileSkeleton />
        ) : !usd ? (
          <TileError label="Rates" onRetry={() => rates.refetch()} />
        ) : (
          <GlanceTile label={`${usd.code} ${usd.value}`} onPress={() => router.push('/rates')}>
            <Tile icon="chart" color="green" />
            <Txt v="fn" c={colors.l2} style={{ marginTop: 'auto' }}>
              {usd.code}
            </Txt>
            <Txt v="hl" num>
              {usd.value.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </Txt>
            <Txt v="c1" num c={usd.changePct >= 0 ? colors.greenText : colors.redText}>{`${usd.changePct >= 0 ? '▲' : '▼'} ${Math.abs(usd.changePct).toFixed(2)}%`}</Txt>
          </GlanceTile>
        )}
        {roads.isPending ? (
          <TileSkeleton />
        ) : !roads.data ? (
          <TileError label="Roads" onRetry={() => roads.refetch()} />
        ) : (
          <GlanceTile label="Your route" onPress={() => router.push('/traffic')}>
            <Tile icon="car" color="orange" />
            <Txt v="fn" c={colors.l2} style={{ marginTop: 'auto' }}>
              Your route
            </Txt>
            <Txt v="hl">{onRoute.length ? `${onRoute.length} closure${onRoute.length > 1 ? 's' : ''}` : 'Clear'}</Txt>
            <Txt v="c1" c={offline ? colors.l2 : colors.orangeText} num>
              {offline ? `As of ${formatTime(roads.data.asOf)}` : onRoute[0] ? (daysBetween(today, onRoute[0].window.from.slice(0, 10)) === 1 ? 'Tomorrow' : formatDate.weekdayShort(onRoute[0].window.from.slice(0, 10))) : 'No advisories'}
            </Txt>
          </GlanceTile>
        )}
        {calendar.isPending ? (
          <TileSkeleton />
        ) : !calendar.data ? (
          <TileError label="Calendar" onRetry={() => calendar.refetch()} />
        ) : (
          <GlanceTile label="Next event" onPress={() => router.push('/calendar')}>
            <Tile icon="calendar" color="purple" />
            <Txt v="fn" c={colors.l2} style={{ marginTop: 'auto' }}>
              {next ? formatDate.weekday(next.date) : 'Calendar'}
            </Txt>
            <Txt v="hl" numberOfLines={1}>
              {next?.title ?? 'Nothing soon'}
            </Txt>
            <Txt v="c1" c={colors.l2} num>
              {next?.from ?? ''}
            </Txt>
          </GlanceTile>
        )}
      </View>
    </>
  );
}

export function ModuleRetry({ label, error, onRetry }: { label: string; error: unknown; onRetry: () => void }) {
  return (
    <Animated.View layout={LinearTransition}>
      <RetryLine label={label} error={error} onRetry={onRetry} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: 16, marginTop: 8, padding: 12, paddingLeft: 14, borderRadius: 16, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 12 },
  upNext: { marginHorizontal: 16, marginTop: 12, backgroundColor: colors.black, borderRadius: 22, padding: 18 },
  row16: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  tiles: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  tile: { flex: 1, height: 128, borderRadius: 18, padding: 12, backgroundColor: colors.card },
});
