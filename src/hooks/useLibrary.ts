import { useSyncExternalStore } from 'react';
import { libraryStore, type LibrarySnapshot } from '@/lib/libraryStore';
import { getMediaKey } from '@/lib/media';
import type { LibraryEntry } from '@/types/library';
import type { MediaItem } from '@/types/media';

const inList = (
  list: readonly LibraryEntry[],
  item: Pick<MediaItem, 'id' | 'mediaType'>,
): boolean => {
  const key = getMediaKey(item);
  return list.some((entry) => getMediaKey(entry) === key);
};

export interface UseLibraryResult extends LibrarySnapshot {
  isInWatchlist: (item: Pick<MediaItem, 'id' | 'mediaType'>) => boolean;
  isFavorite: (item: Pick<MediaItem, 'id' | 'mediaType'>) => boolean;
  toggleWatchlist: (item: MediaItem) => void;
  toggleFavorite: (item: MediaItem) => void;
  recordRecentlyViewed: (item: MediaItem) => void;
  removeFromWatchlist: (item: Pick<MediaItem, 'id' | 'mediaType'>) => void;
  removeFromFavorites: (item: Pick<MediaItem, 'id' | 'mediaType'>) => void;
  clearRecentlyViewed: () => void;
}

/**
 * Reactive view of the watchlist/favorites/recently-viewed store. Needs no provider: it reads the
 * shared `localStorage`-backed store directly, so it works the same in a full page or a single
 * card rendered on its own.
 */
export function useLibrary(): UseLibraryResult {
  const snapshot = useSyncExternalStore(libraryStore.subscribe, libraryStore.getSnapshot);

  return {
    ...snapshot,
    isInWatchlist: (item) => inList(snapshot.watchlist, item),
    isFavorite: (item) => inList(snapshot.favorites, item),
    toggleWatchlist: libraryStore.toggleWatchlist,
    toggleFavorite: libraryStore.toggleFavorite,
    recordRecentlyViewed: libraryStore.recordRecentlyViewed,
    removeFromWatchlist: libraryStore.removeFromWatchlist,
    removeFromFavorites: libraryStore.removeFromFavorites,
    clearRecentlyViewed: libraryStore.clearRecentlyViewed,
  };
}
