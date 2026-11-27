import { router, Stack, useIsFocused, useNavigation, type NativeStackNavigationOptions } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAnimatedReaction, useAnimatedScrollHandler, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePrefs } from '@/state/prefs';

import { IconButton, TextAction } from './button';
import { sfSymbol, type IconName } from './icon';
import { Txt } from './text';
import { createStyles, fonts, GUTTER, useColors, useScheme } from './theme';

/** Native header defaults: the system back button, Inter titles, the brand tint, glass on iOS. */
export function useHeaderOptions(): NativeStackNavigationOptions {
  const colors = useColors();
  const scheme = useScheme();
  return useMemo(
    () => ({
      // Without a title the native bar would show the route name, e.g. "action/[id]".
      title: '',
      headerBackButtonDisplayMode: 'minimal',
      headerTintColor: colors.accent,
      headerTitleStyle: { fontFamily: fonts.semibold, color: colors.ink },
      headerLargeTitleStyle: { fontFamily: fonts.semibold, color: colors.ink },
      headerShadowVisible: false,
      headerLargeTitleShadowVisible: false,
      headerTransparent: Platform.OS === 'ios',
      headerStyle: Platform.OS === 'ios' ? undefined : { backgroundColor: colors.canvas },
      headerUserInterfaceStyle: scheme,
      contentStyle: { backgroundColor: colors.canvas },
    }),
    [colors, scheme],
  );
}

/**
 * A tab's heading, left-aligned in the native bar on the same line as its buttons. iOS takes it as a
 * toolbar view without the glass capsule; elsewhere the JS header aligns its own title left.
 */
export function BarTitle({ title }: { title: string }) {
  const colors = useColors();
  if (Platform.OS !== 'ios') return <Stack.Screen options={{ title, headerTitleAlign: 'left' }} />;
  return (
    <>
      {/* The title still names the screen for the back menu and VoiceOver; only the centred text is hidden. */}
      <Stack.Screen options={{ title, headerTitle: '' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.View hidesSharedBackground>
          <Txt v="title2" c={colors.ink} accessibilityRole="header" style={{ paddingLeft: 4 }}>
            {title}
          </Txt>
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    </>
  );
}

/** The stack inside each tab: the compact native title in the bar, and no back arrow on the tab's first screen. */
export function TabStack() {
  const header = useHeaderOptions();
  return (
    <Stack screenOptions={header}>
      {/* The web header would otherwise offer a back arrow into whatever the browser history holds. */}
      <Stack.Screen name="index" options={{ headerLeft: () => null }} />
    </Stack>
  );
}

/**
 * For screens that open on their own big heading or a full-bleed photo: the native header title stays
 * empty until that heading has scrolled away, then shows. Returns whether it is showing, so a photo
 * screen can switch its status bar back from light.
 */
export function useHeroTitle(scrollY: SharedValue<number>, threshold: number, title: string) {
  const navigation = useNavigation();
  const [shown, setShown] = useState(false);
  useAnimatedReaction(
    () => scrollY.get() > threshold,
    (past, prev) => {
      if (past !== prev) scheduleOnRN(setShown, past);
    },
  );
  useLayoutEffect(() => {
    navigation.setOptions({ title: shown ? title : '' });
  }, [navigation, shown, title]);
  return shown;
}

export type HeaderAction = {
  icon: IconName;
  /** Show a word instead of the icon, for actions an icon can't name on its own. */
  text?: string;
  label: string;
  onPress: () => void;
  /** On state, such as a saved bookmark: the filled glyph in the brand colour. */
  selected?: boolean;
  /** iOS shows these as a native pull-down menu; elsewhere `onPress` opens the app's own sheet. */
  menu?: readonly { label: string; icon?: IconName; destructive?: boolean; onPress: () => void }[];
};

/** The close button for screens presented as modals. */
export const closeAction: HeaderAction = { icon: 'xmark', label: 'Close', onPress: () => router.back() };

/**
 * Buttons in the native header. iOS gets system toolbar items (glass on iOS 26); the web and Android
 * draw the same actions as icon buttons, since native toolbar items only exist on iOS here.
 */
export function HeaderActions({ actions, placement = 'right' }: { actions: readonly HeaderAction[]; placement?: 'left' | 'right' }) {
  const colors = useColors();
  if (Platform.OS !== 'ios') {
    const side = () => (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 }}>
        {actions.map((a) =>
          a.text ? <TextAction key={a.label} label={a.text} icon={null} onPress={a.onPress} /> : <IconButton key={a.label} icon={a.icon} label={a.label} variant="plain" size={40} selected={a.selected} onPress={a.onPress} />,
        )}
      </View>
    );
    return <Stack.Screen options={placement === 'left' ? { headerLeft: side } : { headerRight: side }} />;
  }
  return (
    <Stack.Toolbar placement={placement}>
      {actions.map((a) =>
        a.menu ? (
          <Stack.Toolbar.Menu key={a.label} icon={sfSymbol(a.icon)} accessibilityLabel={a.label}>
            {a.menu.map((m) => (
              <Stack.Toolbar.MenuAction key={m.label} icon={m.icon ? sfSymbol(m.icon) : undefined} destructive={m.destructive} onPress={m.onPress}>
                {m.label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        ) : a.text ? (
          <Stack.Toolbar.Button key={a.label} accessibilityLabel={a.label} onPress={a.onPress}>
            {a.text}
          </Stack.Toolbar.Button>
        ) : (
          <Stack.Toolbar.Button key={a.label} icon={sfSymbol(a.icon, a.selected)} tintColor={a.selected ? colors.accent : undefined} accessibilityLabel={a.label} onPress={a.onPress} />
        ),
      )}
    </Stack.Toolbar>
  );
}

/**
 * Light status bar text over a screen's photo. It renders only while its screen is focused: status bar
 * styles stack, so an unfocused photo screen would otherwise keep the bar light on the screen above it.
 */
export function PhotoStatusBar({ overPhoto }: { overPhoto: boolean }) {
  const focused = useIsFocused();
  const scheme = useScheme();
  const lowData = usePrefs((s) => s.lowData);
  if (!focused) return null;
  // In low-data mode the photo is a light placeholder until tapped, so the text stays dark there.
  return <StatusBar style={overPhoto && !lowData ? 'light' : scheme === 'dark' ? 'light' : 'dark'} />;
}

/** Widest the app gets on the web, where it keeps a phone-width column with a 1px edge each side. */
export const WEB_COLUMN = 480;

/** Width available to screen content: the window on phones, the column on the web. */
export function useColumnWidth() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' ? Math.min(width, WEB_COLUMN) - 2 : width;
}

export function useScrollY() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  return { scrollY, onScroll };
}

/** Bottom action area. Flat white with a top edge, like the rest of the surfaces. */
export function Dock({ children, row, style }: { children: ReactNode; row?: boolean; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  const bottom = useSafeAreaInsets().bottom;
  return <View style={[styles.dock, { paddingBottom: Math.max(bottom, 12) + 4, flexDirection: row ? 'row' : 'column' }, style]}>{children}</View>;
}

/** Scroll padding for content that sits above a Dock with one row of buttons. */
export function useDockInset(rows = 1) {
  return Math.max(useSafeAreaInsets().bottom, 12) + 4 + 14 + rows * 55 + (rows - 1) * 10 + 24;
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    dock: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30, paddingTop: 14, paddingHorizontal: GUTTER, gap: 10, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line },
  }),
);
