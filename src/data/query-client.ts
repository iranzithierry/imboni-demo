import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { QUERY_CACHE_MAX_AGE_MS } from '@/config/constants';
import { AppError, reportError, toAppError } from '@/lib/errors';

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false);
  }),
);

export function subscribeAppFocus() {
  const sub = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  });
  return () => sub.remove();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: QUERY_CACHE_MAX_AGE_MS,
      // Transport errors retry with backoff; application errors surface immediately.
      retry: (failures, error) => failures < 2 && toAppError(error).isTransport,
      // Offline: keep showing the saved copy instead of an error state.
      networkMode: 'offlineFirst',
    },
    mutations: {
      onError: (error) => reportError(toAppError(error), 'mutation'),
    },
  },
});

export const queryPersister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'imboni.query-cache' });

export { AppError };
