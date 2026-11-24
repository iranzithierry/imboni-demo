import { SegmentedControl } from '@expo/ui/community/segmented-control';
import type { StyleProp, ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';

export type SegmentOption<T extends string> = { readonly value: T; readonly label: string };

type Props<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
};

/** Native segmented control (UISegmentedControl / Compose) from Expo UI. */
export function Segmented<T extends string>({ options, value, onChange, dark, style, accessibilityLabel }: Props<T>) {
  return (
    <SegmentedControl
      accessibilityLabel={accessibilityLabel}
      values={options.map((o) => o.label)}
      selectedIndex={Math.max(0, options.findIndex((o) => o.value === value))}
      appearance={dark ? 'dark' : 'light'}
      style={[{ height: 32 }, style]}
      onChange={(e) => {
        const next = options[e.nativeEvent.selectedSegmentIndex];
        if (!next || next.value === value) return;
        haptic.selection();
        onChange(next.value);
      }}
    />
  );
}
