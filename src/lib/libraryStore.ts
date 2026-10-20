import type { LibraryEntry } from '@/types/library';
import type { MediaItem } from '@/types/media';
import { getMediaKey, toMediaItem } from './media';
import { readJSON, writeJSON } from './storage';

/**
 * Watchlist, favorites and recently-viewed: a small `localStorage`-backed store, read through
 * `useLibrary` (`src/hooks/useLibrary.ts`) via `useSyncExternalStore`. Kept as a plain external
 * store rather than a React Context so it works the same whether or not a component tree happens
 * to be wrapped in a provider (useful in isolation, e.g. a `MediaCard` rendered in a test), and so
 * every tab sharing this browser stays in sync via the `storage` event.
 */

const STORAGE_KEYS = {
  watchlist: 'moobee:watchlist:v1',
  favorites: 'moobee:favorites:v1',
  recentlyViewed: 'moobee:recently-viewed:v1',
} as const;

/** Recently viewed is a short, most-recent-first trail, not a full history. */
const MAX_RECENTLY_VIEWED = 24;

export interface LibrarySnapshot {
  watchlist: LibraryEntry[];
  favorites: LibraryEntry[];
  recentlyViewed: LibraryEntry[];
}

type Field = keyof LibrarySnapshot;
type Listener = () => void;

const loadList = (key: string): LibraryEntry[] => readJSON<LibraryEntry[]>(key, []);

const without = (
  list: LibraryEntry[],
  item: Pick<MediaItem, 'id' | 'mediaType'>,
): LibraryEntry[] => {
  const key = getMediaKey(item);
  return list.filter((entry) => getMediaKey(entry) !== key);
};

const contains = (list: LibraryEntry[], item: Pick<MediaItem, 'id' | 'mediaType'>): boolean => {
  const key = getMediaKey(item);
  return list.some((entry) => getMediaKey(entry) === key);
};

class LibraryStore {
  private snapshot: LibrarySnapshot = {
    watchlist: loadList(STORAGE_KEYS.watchlist),
    favorites: loadList(STORAGE_KEYS.favorites),
    recentlyViewed: loadList(STORAGE_KEYS.recentlyViewed),
  };

  private readonly listeners = new Set<Listener>();

  constructor() {
    if (typeof window !== 'undefined') {
      // Keeps every open tab in step: a change made in one tab updates the others' snapshots.
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    const field = (Object.keys(STORAGE_KEYS) as Field[]).find(
      (key) => STORAGE_KEYS[key] === event.key,
    );
    if (!field) return;
    this.snapshot = { ...this.snapshot, [field]: loadList(STORAGE_KEYS[field]) };
    this.notify();
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): LibrarySnapshot => this.snapshot;

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private setList(field: Field, list: LibraryEntry[]): void {
    this.snapshot = { ...this.snapshot, [field]: list };
    // Best-effort: a full or blocked store still updates the in-memory snapshot for this session.
    writeJSON(STORAGE_KEYS[field], list);
    this.notify();
  }

  toggleWatchlist = (item: MediaItem): void => {
    const list = this.snapshot.watchlist;
    const next = contains(list, item)
      ? without(list, item)
      : [{ ...toMediaItem(item), savedAt: new Date().toISOString() }, ...list];
    this.setList('watchlist', next);
  };

  toggleFavorite = (item: MediaItem): void => {
    const list = this.snapshot.favorites;
    const next = contains(list, item)
      ? without(list, item)
      : [{ ...toMediaItem(item), savedAt: new Date().toISOString() }, ...list];
    this.setList('favorites', next);
  };

  /** Moves `item` to the front, deduplicating, and caps the list. Call once details finish loading. */
  recordRecentlyViewed = (item: MediaItem): void => {
    const next = [
      { ...toMediaItem(item), savedAt: new Date().toISOString() },
      ...without(this.snapshot.recentlyViewed, item),
    ].slice(0, MAX_RECENTLY_VIEWED);
    this.setList('recentlyViewed', next);
  };

  removeFromWatchlist = (item: Pick<MediaItem, 'id' | 'mediaType'>): void => {
    this.setList('watchlist', without(this.snapshot.watchlist, item));
  };

  removeFromFavorites = (item: Pick<MediaItem, 'id' | 'mediaType'>): void => {
    this.setList('favorites', without(this.snapshot.favorites, item));
  };

  clearRecentlyViewed = (): void => {
    this.setList('recentlyViewed', []);
  };

  clearWatchlist = (): void => {
    this.setList('watchlist', []);
  };

  clearFavorites = (): void => {
    this.setList('favorites', []);
  };

  /**
   * Test-only: re-reads every list from `localStorage`. The store loads its snapshot once at
   * module import, so a test that clears `localStorage` between cases must call this afterwards
   * or the previous test's in-memory state would otherwise leak into the next one.
   */
  resetForTests = (): void => {
    this.snapshot = {
      watchlist: loadList(STORAGE_KEYS.watchlist),
      favorites: loadList(STORAGE_KEYS.favorites),
      recentlyViewed: loadList(STORAGE_KEYS.recentlyViewed),
    };
    this.notify();
  };
}

export const libraryStore = new LibraryStore();
