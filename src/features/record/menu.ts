import { useActionSheet } from '@expo/react-native-action-sheet';

import { haptic } from '@/lib/haptics';
import { useColors } from '@/ui/theme';

export type MenuItem = { label: string; onPress: () => void; destructive?: boolean };

/** Overflow menu as the platform's action sheet, so it behaves the same on iOS, Android and the web. */
export function useMenu() {
  const colors = useColors();
  const { showActionSheetWithOptions } = useActionSheet();
  return (items: readonly MenuItem[], title?: string, message?: string) => {
    haptic.tap();
    const options = [...items.map((i) => i.label), 'Cancel'];
    const destructive = items.findIndex((i) => i.destructive);
    showActionSheetWithOptions(
      {
        title,
        message,
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: destructive >= 0 ? destructive : undefined,
        tintColor: colors.ink,
        destructiveColor: colors.bad,
      },
      (index) => {
        if (index === undefined) return;
        items[index]?.onPress();
      },
    );
  };
}
