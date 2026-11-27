import { Stack } from 'expo-router';

import { useHeaderOptions } from '@/ui/nav';

export const unstable_settings = { anchor: 'welcome' };

export default function OnboardingLayout() {
  const header = useHeaderOptions();
  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
    </Stack>
  );
}
