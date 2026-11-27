import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { logos } from '@/data/logos';

import { Txt } from './text';
import { createStyles, useColors, useScheme } from './theme';

const SIZES = { s: { box: 28, font: 10 }, m: { box: 40, font: 12 }, l: { box: 56, font: 16 }, xl: { box: 72, font: 20 } } as const;
export type LogoSize = keyof typeof SIZES;

/**
 * An institution's own logo on a round chip, or its initials when we have no logo. Logos sit on white
 * in both themes so every mark keeps the colours its institution chose.
 */
export function InstitutionLogo({ id, label, size = 'm', style }: { id: string; label: string; size?: LogoSize; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const scheme = useScheme();
  const styles = useStyles();
  const s = SIZES[size];
  const logo = logos[id];
  const shape = { width: s.box, height: s.box, borderRadius: s.box / 2 };
  if (!logo) {
    return (
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.chip, shape, styles.initials, style]}>
        <Txt v="caption" w="medium" c={colors.ink} style={{ fontSize: s.font, lineHeight: s.font + 4, letterSpacing: 0.2 }} maxFontSizeMultiplier={1.2}>
          {label}
        </Txt>
      </View>
    );
  }
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.chip, shape, { backgroundColor: colors.white, borderWidth: scheme === 'dark' ? 0 : 1 }, style]}>
      <Image source={logo.source} style={{ width: s.box, height: s.box }} contentFit="contain" transition={0} />
    </View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    chip: { alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', borderColor: colors.line },
    initials: { backgroundColor: colors.card, borderWidth: 1 },
  }),
);
