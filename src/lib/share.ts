import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import { env } from '@/config/env';
import type { RouteRef } from '@/data/schema';

import { AppError } from './errors';
import { toPath } from './links';

/** Public link when a share domain is configured, otherwise the app's own deep link. */
export function shareUrl(ref: RouteRef): string {
  const path = toPath(ref);
  return env.EXPO_PUBLIC_SHARE_BASE_URL ? new URL(path, env.EXPO_PUBLIC_SHARE_BASE_URL).toString() : Linking.createURL(path);
}

export async function shareText(title: string, ref: RouteRef) {
  await Share.share({ title, message: `${title}\n${shareUrl(ref)}` });
}

export async function copyLink(ref: RouteRef) {
  await Clipboard.setStringAsync(shareUrl(ref));
}

export async function shareImage(fileUri: string, title: string) {
  if (!(await Sharing.isAvailableAsync())) throw new AppError('provider_unavailable');
  await Sharing.shareAsync(fileUri, { mimeType: 'image/png', dialogTitle: title, UTI: 'public.png' });
}

export async function saveImage(fileUri: string) {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) throw new AppError('permission_denied');
  await MediaLibrary.Asset.create(fileUri);
}
