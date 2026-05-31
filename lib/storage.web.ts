// =============================================================================
// Session storage — WEB.
//
// Metro auto-picks this file over `./storage.ts` when bundling for web.
// react-native-mmkv is JSI-only and would fail to load in the browser bundle,
// so on web we delegate to plain localStorage.
//
// Guarded with `typeof window !== "undefined"` so SSR/static export doesn't
// throw at module-eval time.
// =============================================================================

export const Storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};
