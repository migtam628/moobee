import { describe, expect, it } from 'vitest';
import { mediaItem } from '@/test/fixtures';
import {
  buildPoolPlan,
  interleaveTypes,
  matchSuggestion,
  MOODS,
  POOL_PAGE_SPAN,
  preparePool,
  shuffle,
  tasteTitles,
} from './surprise';

/** A fixed "random" source, cycling through the given values, for repeatable tests. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe('buildPoolPlan', () => {
  it('asks for movies and series for "any", one page each, within the page span', () => {
    const plan = buildPoolPlan('any', undefined, sequence(0, 0.999));
    expect(plan).toEqual([
      { mediaType: 'movie', anime: false, page: 1 },
      { mediaType: 'tv', anime: false, page: POOL_PAGE_SPAN },
    ]);
  });

  it('asks only for the chosen type', () => {
    expect(buildPoolPlan('movie', undefined).map((p) => p.mediaType)).toEqual(['movie']);
    expect(buildPoolPlan('tv', undefined).map((p) => p.mediaType)).toEqual(['tv']);
  });

  it('uses each type’s own genres for a mood, as alternatives', () => {
    const plan = buildPoolPlan('any', 'scare');
    expect(plan.find((p) => p.mediaType === 'movie')?.genres).toBe('27');
    expect(plan.find((p) => p.mediaType === 'tv')?.genres).toBe('9648|10765');
  });

  it('keeps anime to films and series and narrows a mood to one genre', () => {
    const plan = buildPoolPlan('anime', 'thrill');
    expect(plan.map((p) => [p.mediaType, p.anime, p.genres])).toEqual([
      ['movie', true, '53'],
      ['tv', true, '9648'],
    ]);
  });

  it('never goes outside page 1..POOL_PAGE_SPAN', () => {
    for (let n = 0; n < 200; n += 1) {
      for (const part of buildPoolPlan('any', undefined)) {
        expect(part.page).toBeGreaterThanOrEqual(1);
        expect(part.page).toBeLessThanOrEqual(POOL_PAGE_SPAN);
      }
    }
  });

  it('has a genre for every mood and type', () => {
    for (const mood of MOODS) {
      expect(mood.genres.movie.length).toBeGreaterThan(0);
      expect(mood.genres.tv.length).toBeGreaterThan(0);
    }
  });
});

describe('shuffle', () => {
  it('keeps every item, does not change the input, and follows the random source', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, sequence(0, 0, 0, 0));
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(out).toEqual([2, 3, 4, 5, 1]);
  });
});

describe('preparePool', () => {
  it('drops duplicates and excluded titles', () => {
    const a = mediaItem({ id: 1, title: 'A' });
    const b = mediaItem({ id: 2, title: 'B' });
    const showSameId = mediaItem({ id: 1, mediaType: 'tv', title: 'A show' });
    const pool = preparePool([a, a, b, showSameId], new Set(['movie:2']));
    expect(pool.map((item) => item.title).sort()).toEqual(['A', 'A show']);
  });
});

describe('interleaveTypes', () => {
  it('takes turns between movies and series', () => {
    const entry = (id: number, mediaType: 'movie' | 'tv') => ({
      item: mediaItem({ id, mediaType }),
    });
    const out = interleaveTypes([
      entry(1, 'movie'),
      entry(2, 'movie'),
      entry(3, 'movie'),
      entry(4, 'tv'),
    ]);
    expect(out.map((e) => e.item.id)).toEqual([1, 4, 2, 3]);
  });
});

describe('tasteTitles', () => {
  it('lists titles with their year, without repeats, up to the limit', () => {
    const lists = [
      [mediaItem({ title: 'Heat', year: 1995 }), mediaItem({ title: 'Se7en', year: undefined })],
      [mediaItem({ title: 'heat', year: 1995 }), mediaItem({ title: 'Alien', year: 1979 })],
    ];
    expect(tasteTitles(lists)).toEqual(['Heat (1995)', 'Se7en', 'Alien (1979)']);
    expect(tasteTitles(lists, 2)).toEqual(['Heat (1995)', 'Se7en']);
  });
});

describe('matchSuggestion', () => {
  const results = [
    mediaItem({ id: 1, title: 'The Heat', year: 2013 }),
    mediaItem({ id: 2, title: 'Heat', year: 1995 }),
    mediaItem({ id: 3, title: 'Léon: The Professional', originalTitle: 'Léon', year: 1994 }),
  ];

  it('needs the same name and, when known, a year within one', () => {
    expect(matchSuggestion(results, { title: 'Heat', year: 1995 })?.id).toBe(2);
    expect(matchSuggestion(results, { title: 'heat', year: 1996 })?.id).toBe(2);
    expect(matchSuggestion(results, { title: 'Heat', year: 2005 })).toBeUndefined();
    expect(matchSuggestion(results, { title: 'Heat' })?.id).toBe(1);
  });

  it('ignores case, accents, punctuation and a leading "The"', () => {
    expect(matchSuggestion(results, { title: 'THE HEAT!', year: 2013 })?.id).toBe(1);
    expect(matchSuggestion(results, { title: 'Leon', year: 1994 })?.id).toBe(3);
  });

  it('finds nothing for an invented title or a blank one', () => {
    expect(matchSuggestion(results, { title: 'Heat of the Night 9', year: 1995 })).toBeUndefined();
    expect(matchSuggestion(results, { title: '  ' })).toBeUndefined();
    expect(matchSuggestion([], { title: 'Heat' })).toBeUndefined();
  });
});
