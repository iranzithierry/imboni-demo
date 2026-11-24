import { Redirect } from 'expo-router';

import { usePrefs } from '@/state/prefs';

/** Entry point for cold launches and `imboni://`: onboarding until it's done, then Home. */
export default function Index() {
  const onboarded = usePrefs((s) => s.onboarded);
  return <Redirect href={onboarded ? '/home' : '/welcome'} />;
}
