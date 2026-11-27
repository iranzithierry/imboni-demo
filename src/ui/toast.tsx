import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UNDO_WINDOW_MS } from '@/config/constants';
import { haptic } from '@/lib/haptics';

import { Icon, type IconName } from './icon';
import { Txt } from './text';
import { createStyles, motion, useColors } from './theme';

type ToastInput = { message: string; icon?: IconName; action?: { label: string; onPress: () => void }; durationMs?: number };
type ToastState = ToastInput & { id: number };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const styles = useStyles();
  const [toast, setToast] = useState<ToastState | null>(null);
  const seq = useRef(0);
  const top = useSafeAreaInsets().top;
  const show = useCallback((t: ToastInput) => {
    seq.current += 1;
    setToast({ ...t, id: seq.current });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), toast.durationMs ?? UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext value={show}>
      {children}
      {toast && (
        <Animated.View
          key={toast.id}
          entering={FadeInUp.duration(motion.base).easing(Easing.out(Easing.cubic))}
          exiting={FadeOutUp.duration(motion.fast)}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          pointerEvents="box-none"
          style={[styles.wrap, { top: top + 6 }]}>
          <View style={styles.toast}>
            {toast.icon && <Icon name={toast.icon} size={14} color={colors.accent} weight="semibold" />}
            <Txt v="footnote" w="medium" c={colors.canvas} numberOfLines={2} style={styles.text}>
              {toast.message}
            </Txt>
            {toast.action && (
              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => {
                  haptic.tap();
                  toast.action?.onPress();
                  setToast(null);
                }}
                style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
                <Txt v="footnote" w="semibold" c={colors.accent}>
                  {toast.action.label}
                </Txt>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </ToastContext>
  );
}

export function useToast() {
  const show = use(ToastContext);
  if (!show) throw new Error('useToast must be used inside ToastProvider');
  return show;
}

/** A small pill under the status bar, like a system banner: one line, out of the way of the content. */
const useStyles = createStyles((colors) =>
  StyleSheet.create({
    wrap: { position: 'absolute', left: 0, right: 0, zIndex: 100, alignItems: 'center' },
    toast: { maxWidth: 340, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.ink, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    text: { flexShrink: 1 },
    action: { marginLeft: 4, paddingLeft: 10, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.ink3 },
  }),
);
