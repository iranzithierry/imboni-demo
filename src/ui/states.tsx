import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { EMPTY_ART } from '@/illustrations/static/empty';
import { toAppError, userMessage } from '@/lib/errors';

import { IconTile } from './atoms';
import { Button, TextAction } from './button';
import { Icon, type IconName } from './icon';
import { Txt } from './text';
import { createStyles, GUTTER, radius, useColors } from './theme';

/** A failed module collapses to one line with a retry; it never blanks the rest of the screen. */
export function RetryLine({ label, error, onRetry, style }: { label: string; error: unknown; onRetry: () => void; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const styles = useStyles();
  const err = toAppError(error);
  return (
    <View style={[styles.retry, style]} accessibilityLiveRegion="polite">
      <Icon name={err.isTransport ? 'wifiOff' : 'exclamation'} size={16} color={colors.ink2} />
      <Txt v="footnote" c={colors.ink2} style={{ flex: 1 }}>
        {`${label} didn’t load. ${err.isTransport ? 'Check your connection.' : userMessage(err.code)}`.trim()}
      </Txt>
      <TextAction label="Retry" icon="refresh" color={colors.ink} onPress={onRetry} />
    </View>
  );
}

type EmptyProps = { icon: IconName; art?: keyof typeof EMPTY_ART; title: string; body: string; action?: { label: string; onPress: () => void }; children?: ReactNode };

/**
 * One quiet line of explanation and, when there is one, the single next step. The places people land
 * on empty most often show a small scene of what will appear there instead of an icon.
 */
export function EmptyState({ icon, art, title, body, action, children }: EmptyProps) {
  const colors = useColors();
  const styles = useStyles();
  const Art = art ? EMPTY_ART[art] : null;
  return (
    <View style={styles.empty}>
      {Art ? <Art width={200} /> : <IconTile icon={icon} size={52} />}
      <Txt v="title3" center style={{ marginTop: 16 }}>
        {title}
      </Txt>
      <Txt v="subhead" c={colors.ink2} center style={{ marginTop: 6, maxWidth: 300 }}>
        {body}
      </Txt>
      {children}
      {action && <Button label={action.label} variant="secondary" size="md" hug onPress={action.onPress} style={{ marginTop: 18, alignSelf: 'center' }} />}
    </View>
  );
}

export function ErrorScreen({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  const err = toAppError(error);
  return (
    <View style={[styles.empty, { paddingTop: 140 }]}>
      <IconTile icon={err.isTransport ? 'wifiOff' : 'exclamation'} size={52} />
      <Txt v="title3" center style={{ marginTop: 16 }}>
        {err.code === 'not_found' ? 'This item isn’t available' : 'Something didn’t load'}
      </Txt>
      <Txt v="subhead" c={colors.ink2} center style={{ marginTop: 6 }}>
        {userMessage(err.code)}
      </Txt>
      <Txt v="caption" c={colors.ink3} center num style={{ marginTop: 8 }}>
        {`Reference ${err.correlationId}`}
      </Txt>
      <Button label="Try again" variant="secondary" size="md" hug onPress={onRetry} style={{ marginTop: 18, alignSelf: 'center' }} />
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  retry: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: GUTTER, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  empty: { alignItems: 'center', paddingTop: 56, paddingBottom: 24, paddingHorizontal: 32 },
}));
