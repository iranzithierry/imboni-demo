import { StyleSheet, Text, type ColorValue, type TextProps } from 'react-native';

import { maxScale, type, useColors, weightFamily, type TypeVariant, type Weight } from './theme';

export type TxtProps = TextProps & {
  v?: TypeVariant;
  c?: ColorValue;
  /** Weight for this run of text; semibold and bold are mapped down so nothing reads heavy. */
  w?: Weight;
  /** Tabular figures for dates, amounts and counters. */
  num?: boolean;
  center?: boolean;
  strike?: boolean;
};

export function Txt({ v = 'body', c, w, num, center, strike, style, ...rest }: TxtProps) {
  const colors = useColors();
  return (
    <Text
      maxFontSizeMultiplier={maxScale[v]}
      {...rest}
      style={[
        type[v],
        { color: c ?? colors.ink },
        // Each weight is its own loaded face; a fontWeight here would make browsers fake-bold it.
        w !== undefined && { fontFamily: weightFamily[w] },
        num && styles.num,
        center && styles.center,
        strike && styles.strike,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  num: { fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
  strike: { textDecorationLine: 'line-through' },
});
