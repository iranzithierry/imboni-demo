import { router } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { SwipeDirection, type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { formatDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import type { TrackRow } from '@/lib/tracking';
import { Badge, Tile } from '@/ui/atoms';
import { Icon, type IconName } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const ACTION_W = 88;

function SwipeAction({ progress, icon, label, color, align }: { progress: SharedValue<number>; icon: IconName; label: string; color: string; align: 'left' | 'right' }) {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(progress.get(), [0, 1], [0.6, 1], 'clamp') }], opacity: interpolate(progress.get(), [0, 0.6], [0, 1], 'clamp') }));
  return (
    <View style={[styles.action, { backgroundColor: color, alignItems: align === 'left' ? 'flex-start' : 'flex-end' }]}>
      <Animated.View style={[styles.actionInner, style]}>
        <Icon name={icon} size={22} color={colors.white} />
        <Txt v="fn" w="600" c={colors.white}>
          {label}
        </Txt>
      </Animated.View>
    </View>
  );
}

/** Swipe left to mark done, right to snooze. Both commit on release, like Mail's full swipe. */
export function SwipeRow({ row, onDone, onSnooze }: { row: TrackRow; onDone: () => void; onSnooze: () => void }) {
  const ref = useRef<SwipeableMethods>(null);
  const urgent = row.daysLeft <= 7;
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.6}
      leftThreshold={ACTION_W}
      rightThreshold={ACTION_W}
      overshootFriction={8}
      renderLeftActions={(progress) => <SwipeAction progress={progress} icon="snooze" label="Snooze" color={colors.indigo} align="left" />}
      renderRightActions={(progress) => <SwipeAction progress={progress} icon="check" label="Done" color={colors.green} align="right" />}
      onSwipeableWillOpen={() => haptic.threshold()}
      onSwipeableOpen={(direction) => {
        if (direction === SwipeDirection.LEFT) onDone();
        else onSnooze();
        ref.current?.close();
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${row.action.title}, ${row.daysLeft} days left`}
        accessibilityActions={[{ name: 'done', label: 'Mark done' }, { name: 'snooze', label: 'Snooze reminder' }]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'done' ? onDone() : onSnooze())}
        onPress={() => router.push(toHref({ kind: 'action', id: row.action.id }))}
        style={({ pressed }) => [styles.cell, pressed && { backgroundColor: colors.pressed }]}>
        <View style={[styles.radio, { borderColor: urgent ? colors.orange : colors.l3 }]} />
        <View style={{ flex: 1 }}>
          <Txt>{row.action.title}</Txt>
          <Txt v="fn" c={urgent ? colors.orangeText : colors.l2} num>
            {row.action.repeats ? `${formatDate.short(row.action.deadline)} · ${row.action.repeats}` : `${row.daysLeft} days · ${formatDate.weekdayShort(row.action.deadline)}`}
          </Txt>
          {row.tracked.copies.length > 1 && (
            <View style={styles.copies}>
              {row.tracked.copies.map((c) => (
                <Badge key={c.id} label={c.label} tone={c.doneAt ? 'green' : 'gray'} icon={c.doneAt ? 'check' : undefined} />
              ))}
            </View>
          )}
        </View>
        <Tile icon={row.action.icon} color={row.action.color} style={{ width: 26, height: 26, borderRadius: 6 }} />
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  cell: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: colors.card },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, marginTop: 1 },
  copies: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  action: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  actionInner: { alignItems: 'center', gap: 3, width: ACTION_W - 40 },
});
