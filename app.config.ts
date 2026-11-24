import type { ConfigContext, ExpoConfig } from 'expo/config';
import { z } from 'zod';

// Build-time secrets. Read here only, never shipped through `extra`.
const BuildEnv = z.object({
  GOOGLE_MAPS_ANDROID_API_KEY: z.string().min(1).optional(),
});

export default ({ config }: ConfigContext): ExpoConfig => {
  const env = BuildEnv.parse(process.env);
  const base = config as ExpoConfig;
  const mapsKey = env.GOOGLE_MAPS_ANDROID_API_KEY;
  return {
    ...base,
    plugins: [
      ...(base.plugins ?? []),
      ...(mapsKey ? [['react-native-maps', { androidGoogleMapsApiKey: mapsKey }] as [string, object]] : []),
    ],
  };
};
