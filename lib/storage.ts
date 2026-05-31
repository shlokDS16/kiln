// =============================================================================
// Session storage — NATIVE (iOS/Android).
//
// Metro resolves `./storage.web.ts` when bundling for web automatically;
// this file is picked for everything else. We import react-native-mmkv at
// top-level here because we know we're on native.
//
// MMKV is ~10x faster than AsyncStorage for the small JSON blobs Supabase
// auth stores (session + refresh token).
// =============================================================================

import { createMMKV } from "react-native-mmkv";

// react-native-mmkv v4 replaced `new MMKV()` with the `createMMKV()` factory
// (`MMKV` is a type now). Same instance, same "kiln-auth" namespace.
const mmkv = createMMKV({ id: "kiln-auth" });

export const Storage = {
  getItem: async (key: string): Promise<string | null> => mmkv.getString(key) ?? null,
  setItem: async (key: string, value: string): Promise<void> => {
    mmkv.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    mmkv.remove(key);
  },
};
