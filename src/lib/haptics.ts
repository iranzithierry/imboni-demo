import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Haptics are feedback, never control flow: a failed call (simulator, web, low-power) is not an error.
const fire = (run: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  run().catch(() => undefined);
};

export const haptic = {
  selection: () => fire(() => Haptics.selectionAsync()),
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  snap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
  threshold: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
