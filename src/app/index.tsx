import { Redirect, useIsFocused } from 'expo-router';

import { usePrefs } from '@/state/prefs';

/** Entry point for cold launches and `imboni://`: onboarding until it's done, then Home. */
export default function Index() {
  const onboarded = usePrefs((s) => s.onboarded);
  // This route also sits underneath links opened from a cold start (it is the root anchor). It must only
  // forward once it is the screen in front, or it would replace the linked screen with Home.
  const focused = useIsFocused();
  if (!focused) return null;
  return <Redirect href={onboarded ? '/home' : '/welcome'} />;
}
