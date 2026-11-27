import { Image } from 'expo-image';
import { View } from 'react-native';

import { useScheme } from './theme';

const MARK = require('../../assets/images/brand/mark.png');
const LOGO = { light: require('../../assets/images/brand/logo-black.png'), dark: require('../../assets/images/brand/logo-white.png') };
/** The full logo's width to height, from the kit artwork (3008 × 678). */
const LOGO_RATIO = 3008 / 678;

/** The bird on its orange tile. The kit keeps the symbol in full colour on every background. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return <Image source={MARK} style={{ width: size, height: size }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

/** The full logo: the mark and the name, which switches between ink and white with the theme. */
export function Wordmark({ size = 28 }: { size?: number }) {
  const scheme = useScheme();
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Imboni">
      <Image source={LOGO[scheme]} style={{ height: size, width: size * LOGO_RATIO }} contentFit="contain" />
    </View>
  );
}
