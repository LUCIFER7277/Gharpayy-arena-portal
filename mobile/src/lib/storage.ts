import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const localStoragePolyfill = {
  _cache: new Map<string, string>(),
  getItem(key: string) {
    return this._cache.get(key) || null;
  },
  setItem(key: string, value: string) {
    this._cache.set(key, value);
    AsyncStorage.setItem(key, value).catch(err => console.warn('AsyncStorage set error:', err));
  },
  removeItem(key: string) {
    this._cache.delete(key);
    AsyncStorage.removeItem(key).catch(err => console.warn('AsyncStorage remove error:', err));
  },
  async hydrate() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stores = await Promise.all(keys.map(async k => {
        const v = await AsyncStorage.getItem(k);
        return [k, v] as const;
      }));
      stores.forEach(([k, v]) => {
        if (v !== null) this._cache.set(k, v);
      });
      console.log(`[Storage] Hydrated ${stores.length} keys from AsyncStorage`);
    } catch (err) {
      console.error('[Storage] Hydration failed:', err);
    }
  }
};

// Apply polyfill.
// On native: window.localStorage doesn't exist, set via globalThis.
// On web: window.localStorage is a read-only getter on Window.prototype,
//         so direct assignment throws — use Object.defineProperty instead.
if (Platform.OS !== "web") {
  // Native (iOS / Android)
  if (typeof globalThis !== "undefined") {
    (globalThis as any).localStorage = localStoragePolyfill;
    if (typeof window === "undefined") {
      (globalThis as any).window = { localStorage: localStoragePolyfill };
    }
  }
} else if (typeof window !== "undefined") {
  // Web
  try {
    Object.defineProperty(window, "localStorage", {
      value: localStoragePolyfill,
      writable: true,
      configurable: true,
    });
  } catch {
    // If defineProperty also fails (e.g. already locked), fall back silently.
    (window as any).localStorage = localStoragePolyfill;
  }
}
