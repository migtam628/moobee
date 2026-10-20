import { describe, expect, it } from 'vitest';
import { mediaItem } from '@/test/fixtures';
import type { Episode } from '@/types/media';
import { describeStats, episodeUpNextItems, isAnime, mediaUpNextItems } from './watch';

describe('isAnime', () => {
  it('needs Animation and Japanese as the original language', () => {
    const animation = [{ id: 16, name: 'Animation' }];
    expect(isAnime({ genres: animation, originalLanguage: 'ja' })).toBe(true);
    expect(isAnime({ genres: animation, originalLanguage: 'en' })).toBe(false);
    expect(isAnime({ genres: [{ id: 18, name: 'Drama' }], originalLanguage: 'ja' })).toBe(false);
    expect(isAnime({ originalLanguage: 'ja' })).toBe(false);
  });
});

describe('describeStats', () => {
  it('joins what is known, in order', () => {
    expect(
      describeStats({ lead: 'S1 E3', rating: 8.43, voteCount: 28_400, date: '2008-01-20' }),
    ).toBe('S1 E3 · ★ 8.4 · 28.4K votes · Jan 20, 2008');
  });

  it('leaves out what is missing, and a vote count of zero', () => {
    expect(describeStats({ rating: 7, voteCount: 0 })).toBe('★ 7.0');
    expect(describeStats({ date: '2008-01-20' })).toBe('Jan 20, 2008');
    expect(describeStats({})).toBeUndefined();
  });

  it('says "vote" for exactly one', () => {
    expect(describeStats({ voteCount: 1 })).toBe('1 vote');
  });
});

describe('mediaUpNextItems', () => {
  it('links to the details page and describes the title', () => {
    const [movie, show] = mediaUpNextItems([
      mediaItem({ id: 680, mediaType: 'movie', title: 'Pulp Fiction', year: 1994, rating: 8.5 }),
      mediaItem({
        id: 60059,
        mediaType: 'tv',
        title: 'Better Call Saul',
        year: undefined,
        rating: undefined,
      }),
    ]);
    expect(movie).toMatchObject({
      key: 'movie:680',
      href: '/movie/680',
      title: 'Pulp Fiction',
      meta: 'Movie · 1994 · ★ 8.5',
      kind: 'movie',
    });
    expect(show).toMatchObject({ key: 'tv:60059', href: '/tv/60059', meta: 'TV', kind: 'tv' });
  });

  it('prefers the backdrop for the thumbnail and falls back to the poster', () => {
    const [withBackdrop, posterOnly, none] = mediaUpNextItems([
      mediaItem({ backdropPath: '/b.jpg', posterPath: '/p.jpg' }),
      mediaItem({ backdropPath: undefined, posterPath: '/p.jpg' }),
      mediaItem({ backdropPath: undefined, posterPath: undefined }),
    ]);
    expect(withBackdrop?.thumbnailUrl).toContain('/w300/b.jpg');
    expect(posterOnly?.thumbnailUrl).toContain('/w185/p.jpg');
    expect(none?.thumbnailUrl).toBeUndefined();
  });
});

describe('episodeUpNextItems', () => {
  const episode = (episodeNumber: number, overrides: Partial<Episode> = {}): Episode => ({
    id: episodeNumber,
    episodeNumber,
    seasonNumber: 2,
    name: `Episode ${episodeNumber}`,
    ...overrides,
  });

  it('numbers the rows, links to the player and marks the one playing', () => {
    const items = episodeUpNextItems(1396, [episode(1), episode(2, { runtimeMinutes: 47 })], {
      seasonNumber: 2,
      episodeNumber: 2,
    });
    expect(items.map((item) => item.title)).toEqual(['1. Episode 1', '2. Episode 2']);
    expect(items[1]).toMatchObject({ href: '/watch/tv/1396/2/2', badge: '47m', current: true });
    expect(items[0]?.current).toBe(false);
  });

  it('marks nothing while another season is listed', () => {
    const items = episodeUpNextItems(1396, [episode(1)], { seasonNumber: 1, episodeNumber: 1 });
    expect(items[0]?.current).toBe(false);
  });
});
