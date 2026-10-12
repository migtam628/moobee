/**
 * Safe `localStorage` access. Every call is wrapped in try/catch: private browsing, a full quota,
 * or storage disabled by policy must never throw into a component or corrupt the app's state.
 */

const hasLocalStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    // Some browsers throw just accessing `window.localStorage` under strict privacy settings.
    return false;
  }
};

export function readJSON<T>(key: string, fallback: T): T {
  if (!hasLocalStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Returns whether the write succeeded, so callers can decide how to react to a full/blocked store. */
export function writeJSON(key: string, value: unknown): boolean {
  if (!hasLocalStorage()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key: string): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing useful to do; the read path already tolerates a stale/missing value.
  }
}
