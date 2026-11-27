import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { photo as lookup } from '@/data/photos';
import { usePrefs } from '@/state/prefs';

import { Icon } from './icon';
import { Txt } from './text';
import { motion, useColors } from './theme';

type Props = {
  id: string | undefined;
  /** Width / height. Defaults to the photo's own ratio. */
  aspect?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** In low-data mode the photo waits for a tap; `hideInLowData` drops it entirely (feed cards). */
  hideInLowData?: boolean;
  /** Fill the parent instead of sizing by aspect ratio (heroes). */
  fill?: boolean;
};

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** A content photo. Low-data mode keeps the space and loads the photo only when tapped. */
export function Photo({ id, aspect, radius = 0, style, hideInLowData, fill }: Props) {
  const colors = useColors();
  const p = lookup(id);
  const lowData = usePrefs((s) => s.lowData);
  const [revealed, setRevealed] = useState(false);
  const [compact, setCompact] = useState(false);
  if (!p) return null;
  if (lowData && hideInLowData) return null;
  const ratio = aspect ?? p.width / p.height;
  const frame = [fill ? StyleSheet.absoluteFill : { aspectRatio: ratio }, { borderRadius: radius, overflow: 'hidden' as const, backgroundColor: colors.fill }, style];

  if (lowData && !revealed) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Load photo, ${kb(p.bytes)}`} onPress={() => setRevealed(true)} onLayout={(e) => setCompact(e.nativeEvent.layout.width < 140)} style={[frame, styles.placeholder]}>
        <Icon name="photo" size={compact ? 16 : 20} color={colors.ink2} />
        {!compact && <Txt v="footnote" w="medium" c={colors.ink2}>{`Tap to load photo · ${kb(p.bytes)}`}</Txt>}
      </Pressable>
    );
  }
  return (
    <View style={frame}>
      <Image source={p.source} style={StyleSheet.absoluteFill} contentFit="cover" transition={motion.base} accessibilityLabel={p.alt} accessible />
      {fill && <TopShade />}
    </View>
  );
}

/** Heroes sit under the status bar and the header buttons; a soft shade keeps both readable over a pale sky. */
function TopShade() {
  return (
    <View pointerEvents="none" style={styles.shade}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="heroShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity={0.42} />
            <Stop offset="1" stopColor="#000" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#heroShade)" />
      </Svg>
    </View>
  );
}

export function hasPhoto(id: string | undefined) {
  return Boolean(lookup(id));
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  shade: { position: 'absolute', top: 0, left: 0, right: 0, height: 150 },
});
