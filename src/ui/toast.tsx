import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UNDO_WINDOW_MS } from '@/config/constants';
import { haptic } from '@/lib/haptics';

import { Icon, type IconName } from './icon';
import { Txt } from './text';
import { colors } from './theme';

type ToastInput = { message: string; icon?: IconName; iconColor?: string; action?: { label: string; onPress: () => void }; durationMs?: number; aboveTabBar?: boolean };
type ToastState = ToastInput & { id: number };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const seq = useRef(0);
  const bottom = useSafeAreaInsets().bottom;
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
          entering={FadeInDown.springify().damping(20)}
          exiting={FadeOutDown.duration(180)}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[styles.toast, { bottom: bottom + (toast.aboveTabBar ? 62 : 16) }]}>
          {toast.icon && <Icon name={toast.icon} size={20} color={toast.iconColor ?? colors.green} />}
          <Txt v="sh" c={colors.white} style={styles.grow}>
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
              }}>
              <Txt v="sh" w="600" c={colors.dark.tint}>
                {toast.action.label}
              </Txt>
            </Pressable>
          )}
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

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, zIndex: 100, minHeight: 50, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(30,30,30,0.94)' },
  grow: { flex: 1 },
});
