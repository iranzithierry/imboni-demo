import { StyleSheet, Text, type ColorValue, type TextProps } from 'react-native';

import { colors, type, type TypeVariant } from './theme';

type Weight = '400' | '500' | '600' | '700';

export type TxtProps = TextProps & {
  v?: TypeVariant;
  c?: ColorValue;
  w?: Weight;
  /** Tabular figures for dates, amounts and counters. */
  num?: boolean;
  center?: boolean;
  strike?: boolean;
};

export function Txt({ v = 'bd', c = colors.l1, w, num, center, strike, style, ...rest }: TxtProps) {
  return (
    <Text
      {...rest}
      style={[
        type[v],
        { color: c },
        w !== undefined && { fontWeight: w },
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
