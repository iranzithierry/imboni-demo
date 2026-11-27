import { router } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { SwipeDirection, type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { formatDate, formatTime } from '@/lib/dates';
import { userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import type { TrackRow } from '@/lib/tracking';
import { Checkbox, Tag } from '@/ui/atoms';
import { Icon, type IconName } from '@/ui/icon';
import { Highlight } from '@/ui/pressable';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, useColors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

import { useInstitutionLookup } from '../data';
import { DeadlineChip } from '../record/parts';
import { useTracker } from '@/features/tracking';

const ACTION_W = 96;

function SwipeAction({ progress, icon, label, bg, align }: { progress: SharedValue<number>; icon: IconName; label: string; bg: string; align: 'left' | 'right' }) {
  const colors = useColors();
  const styles = useStyles();
  const style = useAnimatedStyle(() => ({ opacity: interpolate(progress.get(), [0, 0.5], [0, 1], 'clamp') }));
  return (
    <View style={[styles.action, { backgroundColor: bg, alignItems: align === 'left' ? 'flex-start' : 'flex-end' }]}>
      <Animated.View style={[styles.actionInner, style]}>
        <Icon name={icon} size={20} color={colors.white} weight="semibold" />
        <Txt v="footnote" w="semibold" c={colors.white}>
          {label}
        </Txt>
      </Animated.View>
    </View>
  );
}

/** Swipe left to mark done, right to snooze. Both commit on release, like Mail's full swipe. */
/** Done and snooze for a tracked row, with the toast that confirms each (and undoes done). */
export function useTrackRowActions() {
  const tracker = useTracker();
  const toast = useToast();
  const markDone = async (row: TrackRow) => {
    const copy = row.open.find((c) => c.label === 'Me') ?? row.open[0];
    if (!copy) return;
    haptic.success();
    await tracker.setDone(row.action, copy.id, true);
    toast({ message: `Marked done for ${copy.label}`, icon: 'checkCircle', action: { label: 'Undo', onPress: () => tracker.setDone(row.action, copy.id, false) } });
  };
  const snooze = async (row: TrackRow) => {
    const res = await tracker.snooze(row.action);
    if ('until' in res) {
      haptic.success();
      toast({ message: `Next reminder ${formatDate.weekdayShort(res.until.slice(0, 10))}, ${formatTime(res.until)}`, icon: 'snooze' });
    } else toast({ message: userMessage(res.error), icon: 'warning' });
  };
  return { markDone, snooze };
}

export function SwipeRow({ row, onDone, onSnooze }: { row: TrackRow; onDone: () => void; onSnooze: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  const ref = useRef<SwipeableMethods>(null);
  const inst = useInstitutionLookup()(row.action.institutionId);
  const due = row.action.repeats ? `${formatDate.weekdayShort(row.action.deadline)} · ${row.action.repeats.toLowerCase()}` : formatDate.weekdayShort(row.action.deadline);
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.6}
      leftThreshold={ACTION_W}
      rightThreshold={ACTION_W}
      overshootFriction={8}
      renderLeftActions={(progress) => <SwipeAction progress={progress} icon="snooze" label="Snooze" bg={colors.ink} align="left" />}
      renderRightActions={(progress) => <SwipeAction progress={progress} icon="check" label="Done" bg={colors.ok} align="right" />}
      onSwipeableWillOpen={() => haptic.threshold()}
      onSwipeableOpen={(direction) => {
        if (direction === SwipeDirection.LEFT) onDone();
        else onSnooze();
        ref.current?.close();
      }}>
      <Highlight
        accessibilityRole="button"
        accessibilityLabel={`Action, ${row.action.required ? 'required' : 'advised'}, ${row.daysLeft} days left. ${row.action.title}`}
        accessibilityActions={[
          { name: 'done', label: 'Mark done' },
          { name: 'snooze', label: 'Snooze reminder' },
        ]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'done' ? onDone() : onSnooze())}
        onPress={() => router.push(toHref({ kind: 'action', id: row.action.id }))}
        pressedStyle={{ backgroundColor: colors.pressed }}
        style={styles.cell}>
        <Highlight accessibilityRole="checkbox" accessibilityLabel="Mark done" hitSlop={8} onPress={onDone} style={{ marginTop: 1 }}>
          <Checkbox on={false} />
        </Highlight>
        <View style={{ flex: 1 }}>
          <Txt v="callout" w="semibold">
            {row.action.title}
          </Txt>
          <Txt v="footnote" c={colors.ink2} num style={{ marginTop: 2 }}>{`${inst.mono} · ${due}`}</Txt>
          {row.tracked.copies.length > 1 && (
            <View style={styles.copies}>
              {row.tracked.copies.map((c) => (
                <Tag key={c.id} label={c.label} tone={c.doneAt ? 'ok' : 'outline'} icon={c.doneAt ? 'check' : undefined} />
              ))}
            </View>
          )}
        </View>
        <DeadlineChip daysLeft={row.daysLeft} compact />
      </Highlight>
    </ReanimatedSwipeable>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  cell: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: GUTTER, paddingVertical: 14, backgroundColor: colors.canvas },
  copies: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  action: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  actionInner: { alignItems: 'center', gap: 4, width: ACTION_W - 40 },
}));
