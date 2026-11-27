import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useHeaderOptions } from '@/ui/nav';

// A link straight to a later step still has the first one underneath to go back to.
export const unstable_settings = { anchor: 'index' };

export default function AuthLayout() {
  const header = useHeaderOptions();
  return (
    <Stack screenOptions={header}>
      {/* The sheet closes with its own button; the JS header on the web and Android would add a back arrow. */}
      <Stack.Screen name="index" options={Platform.OS === 'ios' ? undefined : { headerLeft: () => null }} />
    </Stack>
  );
}
