import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { toAppError, userMessage } from '@/lib/errors';

import { Icon, type IconName } from './icon';
import { Txt } from './text';
import { colors } from './theme';

/** A failed module collapses to one line with a retry; it never blanks the rest of the screen. */
export function RetryLine({ label, error, onRetry, style }: { label: string; error: unknown; onRetry: () => void; style?: StyleProp<ViewStyle> }) {
  const err = toAppError(error);
  return (
    <View style={[styles.retry, style]} accessibilityLiveRegion="polite">
      <Icon name={err.isTransport ? 'wifiOff' : 'exclamation'} size={15} color={colors.l2} />
      <Txt v="fn" c={colors.l2} style={{ flex: 1 }}>
        {`${label} didn’t load. ${err.isTransport ? '' : userMessage(err.code)}`.trim()}
      </Txt>
      <Pressable accessibilityRole="button" accessibilityLabel={`Retry ${label}`} hitSlop={10} onPress={onRetry}>
        <Txt v="fn" w="600" c={colors.tint}>
          Retry
        </Txt>
      </Pressable>
    </View>
  );
}

export function EmptyState({ icon, title, body, color = colors.green }: { icon: IconName; title: string; body: string; color?: string }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={34} color={colors.white} />
      </View>
      <Txt v="t2" center style={{ marginTop: 14 }}>
        {title}
      </Txt>
      <Txt v="co" c={colors.l2} center>
        {body}
      </Txt>
    </View>
  );
}

export function ErrorScreen({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const err = toAppError(error);
  return (
    <View style={styles.empty}>
      <Txt v="hl" center>
        {userMessage(err.code)}
      </Txt>
      <Txt v="c1" c={colors.l3} center num style={{ marginTop: 4 }}>
        {`Ref ${err.correlationId}`}
      </Txt>
      <Pressable accessibilityRole="button" onPress={onRetry} style={{ marginTop: 12 }}>
        <Txt w="600" c={colors.tint}>
          Try again
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.card },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 32 },
  emptyIcon: { width: 60, height: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
