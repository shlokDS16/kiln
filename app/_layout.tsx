import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

import { AuthProvider } from '../lib/auth-context';
import { queryClient } from '../lib/query-client';

// React Query DevTools — web-only, dev-only. Wrapped in try/require so the
// native bundle doesn't crash if the package's imports aren't RN-safe.
let ReactQueryDevtools: React.ComponentType<{ initialIsOpen?: boolean }> | null = null;
try {
  if (Platform.OS === 'web' && __DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ReactQueryDevtools = require('@tanstack/react-query-devtools').ReactQueryDevtools;
  }
} catch {
  // devtools unavailable on this platform — silently skip
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
        {ReactQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </AuthProvider>
    </QueryClientProvider>
  );
}
