import { BlurView } from 'expo-blur';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icon';
import { Txt } from './text';
import { colors } from './theme';

export const NAV_ROW = 44;

export function useScrollY() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  return { scrollY, onScroll };
}

/** Top padding for content that sits under the nav bar (`.pt-nav`). */
export function useNavInset(extra = 0) {
  return useSafeAreaInsets().top + NAV_ROW + extra;
}

export function Screen({ children, bg = colors.bg, statusBar = 'dark' }: { children: ReactNode; bg?: string; statusBar?: 'dark' | 'light' }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar style={statusBar} />
      {children}
    </View>
  );
}

function Glass({ dark }: { dark?: boolean }) {
  if (Platform.OS === 'ios') {
    return <BlurView tint={dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} intensity={100} style={StyleSheet.absoluteFill} />;
  }
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(0,0,0,0.9)' : 'rgba(249,249,249,0.96)' }]} />;
}

type NavBarProps = {
  /** When given, the bar is clear until content scrolls past `threshold`, then turns to glass and shows the title. */
  scrollY?: SharedValue<number>;
  threshold?: number;
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  center?: ReactNode;
  /** Extra row under the main row (search pills, segmented control). */
  children?: ReactNode;
  background?: 'glass' | 'none' | string;
  dark?: boolean;
};

export function NavBar({ scrollY, threshold = 34, title, left, right, center, children, background = 'glass', dark }: NavBarProps) {
  const top = useSafeAreaInsets().top;
  const progress = useDerivedValue(() => (scrollY ? withTiming(scrollY.get() > threshold ? 1 : 0, { duration: 200 }) : 1));
  const bgStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const isGlass = background === 'glass';
  return (
    <View style={[styles.nav, { paddingTop: top }, !isGlass && background !== 'none' && { backgroundColor: background }]}>
      {isGlass && (
        <Animated.View style={[StyleSheet.absoluteFill, bgStyle]} pointerEvents="none">
          <Glass dark={dark} />
          <View style={[styles.navBorder, { backgroundColor: dark ? colors.dark.sep : colors.sep }]} />
        </Animated.View>
      )}
      <View style={styles.row}>
        <View style={styles.side}>{left}</View>
        {title !== undefined && (
          <Animated.View style={[styles.title, titleStyle]} pointerEvents="none">
            <Txt v="hl" c={dark ? colors.white : colors.l1} numberOfLines={1} accessibilityRole="header">
              {title}
            </Txt>
          </Animated.View>
        )}
        {center && (
          <View style={styles.center} pointerEvents="box-none">
            {center}
          </View>
        )}
        <View style={[styles.side, styles.right]}>{right}</View>
      </View>
      {children}
    </View>
  );
}

const goBack = (fallback?: Href) => {
  if (router.canGoBack()) router.back();
  else if (fallback) router.replace(fallback);
};

export function BackButton({ label, fallback, color = colors.tint, onPress }: { label?: string; fallback?: Href; color?: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ? `Back to ${label}` : 'Back'}
      hitSlop={8}
      onPress={onPress ?? (() => goBack(fallback))}
      style={({ pressed }) => [styles.back, pressed && { opacity: 0.4 }]}>
      <Icon name="chevronLeft" size={22} color={color} />
      {label && (
        <Txt c={color} numberOfLines={1}>
          {label}
        </Txt>
      )}
    </Pressable>
  );
}

export function NavButton({ label, icon, onPress, bold, color = colors.tint, disabled }: { label: string; icon?: IconName; onPress: () => void; bold?: boolean; color?: string; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.nbtn, { opacity: disabled ? 0.3 : pressed ? 0.4 : 1 }]}>
      {icon ? <Icon name={icon} size={19} color={color} /> : <Txt c={color} w={bold ? '600' : '400'}>{label}</Txt>}
    </Pressable>
  );
}

/** Large title row that stretches slightly on overscroll, like UIKit large titles. */
export function LargeTitle({ title, caption, captionColor = colors.red, accessory, scrollY, style }: { title: string; caption?: string; captionColor?: string; accessory?: ReactNode; scrollY?: SharedValue<number>; style?: StyleProp<ViewStyle> }) {
  const stretch = useAnimatedStyle(() => {
    const y = scrollY ? scrollY.get() : 0;
    const scale = interpolate(y, [-160, 0], [1.12, 1], 'clamp');
    return { transform: [{ scale }], transformOrigin: 'left bottom' };
  });
  return (
    <View style={[styles.lt, style]}>
      <Animated.View style={[{ flexShrink: 1 }, stretch]}>
        {caption && (
          <Txt v="cap" c={captionColor}>
            {caption}
          </Txt>
        )}
        <Txt v="lt" accessibilityRole="header">
          {title}
        </Txt>
      </Animated.View>
      {accessory}
    </View>
  );
}

export function Dock({ children, row, line, tone = 'gray' }: { children: ReactNode; row?: boolean; line?: boolean; tone?: 'gray' | 'white' }) {
  const bottom = useSafeAreaInsets().bottom;
  return (
    <View style={[styles.dock, { paddingBottom: bottom + 8, flexDirection: row ? 'row' : 'column' }, line && styles.dockLine]}>
      {Platform.OS === 'ios' ? (
        <BlurView tint="systemChromeMaterialLight" intensity={100} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tone === 'white' ? 'rgba(255,255,255,0.96)' : 'rgba(242,242,247,0.96)' }]} />
      )}
      {children}
    </View>
  );
}

/** Bottom padding for scroll content that sits above a Dock. */
export function useDockInset(rows = 1) {
  return useSafeAreaInsets().bottom + 8 + 12 + rows * 60 + 20;
}

const styles = StyleSheet.create({
  nav: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 },
  navBorder: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  row: { height: NAV_ROW, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  side: { flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 2, minWidth: 44 },
  right: { justifyContent: 'flex-end' },
  title: { position: 'absolute', left: 90, right: 90, alignItems: 'center' },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 3, height: NAV_ROW, paddingRight: 8, maxWidth: 160 },
  nbtn: { height: NAV_ROW, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  lt: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 4, paddingHorizontal: 16, paddingBottom: 8 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30, paddingTop: 12, paddingHorizontal: 16, gap: 10, overflow: 'hidden' },
  dockLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
});
