import { afterEach, describe, expect, it } from 'vitest';
import { mediaItem } from '@/test/fixtures';
import type { MediaItem } from '@/types/media';
import { libraryStore } from './libraryStore';

afterEach(() => {
  window.localStorage.clear();
  libraryStore.resetForTests();
});

describe('libraryStore', () => {
  it('starts empty', () => {
    const snapshot = libraryStore.getSnapshot();
    expect(snapshot.watchlist).toEqual([]);
    expect(snapshot.favorites).toEqual([]);
    expect(snapshot.recentlyViewed).toEqual([]);
  });

  it('toggles an item into and back out of the watchlist', () => {
    const item = mediaItem();
    libraryStore.toggleWatchlist(item);
    expect(libraryStore.getSnapshot().watchlist).toHaveLength(1);
    expect(libraryStore.getSnapshot().watchlist[0]).toMatchObject({ id: 550, mediaType: 'movie' });

    libraryStore.toggleWatchlist(item);
    expect(libraryStore.getSnapshot().watchlist).toEqual([]);
  });

  it('keeps the watchlist and favorites independent', () => {
    const item = mediaItem();
    libraryStore.toggleWatchlist(item);
    libraryStore.toggleFavorite(item);

    expect(libraryStore.getSnapshot().watchlist).toHaveLength(1);
    expect(libraryStore.getSnapshot().favorites).toHaveLength(1);

    libraryStore.removeFromWatchlist(item);
    expect(libraryStore.getSnapshot().watchlist).toEqual([]);
    expect(libraryStore.getSnapshot().favorites).toHaveLength(1);
  });

  it('treats a movie and a TV show with the same numeric id as different entries', () => {
    libraryStore.toggleWatchlist(mediaItem({ id: 5, mediaType: 'movie', title: 'Movie 5' }));
    libraryStore.toggleWatchlist(mediaItem({ id: 5, mediaType: 'tv', title: 'Show 5' }));
    expect(libraryStore.getSnapshot().watchlist).toHaveLength(2);
  });

  it('records recently viewed, moving a re-viewed item back to the front without duplicating it', () => {
    const a = mediaItem({ id: 1, title: 'A' });
    const b = mediaItem({ id: 2, title: 'B' });
    libraryStore.recordRecentlyViewed(a);
    libraryStore.recordRecentlyViewed(b);
    libraryStore.recordRecentlyViewed(a);

    const ids = libraryStore.getSnapshot().recentlyViewed.map((entry) => entry.id);
    expect(ids).toEqual([1, 2]);
  });

  it('caps recently viewed at 24 entries, dropping the oldest', () => {
    for (let i = 0; i < 30; i += 1) {
      libraryStore.recordRecentlyViewed(mediaItem({ id: i, title: `Title ${i}` }));
    }
    const snapshot = libraryStore.getSnapshot().recentlyViewed;
    expect(snapshot).toHaveLength(24);
    expect(snapshot[0]?.id).toBe(29);
    expect(snapshot.some((entry) => entry.id === 5)).toBe(false);
  });

  it('clears recently viewed', () => {
    libraryStore.recordRecentlyViewed(mediaItem());
    libraryStore.clearRecentlyViewed();
    expect(libraryStore.getSnapshot().recentlyViewed).toEqual([]);
  });

  it('strips detail-only fields before persisting (stores a plain MediaItem)', () => {
    // Fields a `MovieDetails`/`TvDetails` object carries that a plain `MediaItem` does not.
    const detailsLike = { ...mediaItem(), cast: [{ id: 1, name: 'Someone' }] } as MediaItem & {
      cast: unknown;
    };
    libraryStore.toggleWatchlist(detailsLike);
    const stored = libraryStore.getSnapshot().watchlist[0];
    expect(stored).not.toHaveProperty('cast');
  });

  it('persists across a fresh read of localStorage (survives a reload)', () => {
    libraryStore.toggleFavorite(mediaItem());
    libraryStore.resetForTests();
    expect(libraryStore.getSnapshot().favorites).toHaveLength(1);
  });

  it('notifies subscribers on every change', () => {
    let calls = 0;
    const unsubscribe = libraryStore.subscribe(() => {
      calls += 1;
    });
    libraryStore.toggleWatchlist(mediaItem());
    unsubscribe();
    libraryStore.toggleWatchlist(mediaItem());

    expect(calls).toBe(1);
  });
});
