import { describe, expect, it } from 'vitest';
import { rawMovie, rawPage, rawTv } from '@/test/fixtures';
import { mapMoviePage, mapMovieSummary, mapTvPage, mapTvSummary, parseYear } from './mappers';
import { tmdbMoviePageSchema, tmdbMovieSummarySchema, tmdbTvSummarySchema } from './schemas';

const movie = (overrides: Record<string, unknown> = {}) =>
  tmdbMovieSummarySchema.parse(rawMovie(overrides));
const tv = (overrides: Record<string, unknown> = {}) => tmdbTvSummarySchema.parse(rawTv(overrides));

describe('parseYear', () => {
  it('reads the year from ISO dates', () => {
    expect(parseYear('1999-10-15')).toBe(1999);
    expect(parseYear('2024')).toBe(2024);
  });

  it.each([undefined, null, '', '   ', 'soon', '99-10-15', '1999/10/15'])(
    'returns undefined for %s',
    (value) => {
      expect(parseYear(value)).toBeUndefined();
    },
  );
});

describe('mapMovieSummary', () => {
  it('normalizes a movie and tags it as a movie', () => {
    expect(mapMovieSummary(movie())).toEqual({
      id: 550,
      mediaType: 'movie',
      title: 'Fight Club',
      originalTitle: 'Fight Club',
      overview: 'An insomniac office worker crosses paths with a soap salesman.',
      posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      backdropPath: '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg',
      releaseDate: '1999-10-15',
      year: 1999,
      rating: 8.4,
      voteCount: 30000,
      popularity: 61.4,
      genreIds: [18, 53],
      originalLanguage: 'en',
    });
  });

  it('never invents an IMDb id from list data', () => {
    expect(mapMovieSummary(movie())).not.toHaveProperty('imdbId');
  });

  it('omits fields TMDB left empty instead of emitting empty strings or nulls', () => {
    const item = mapMovieSummary(
      movie({
        poster_path: null,
        backdrop_path: '',
        release_date: '',
        original_title: '',
        overview: undefined,
        genre_ids: [],
      }),
    );

    expect(item.posterPath).toBeUndefined();
    expect(item.backdropPath).toBeUndefined();
    expect(item.releaseDate).toBeUndefined();
    expect(item.year).toBeUndefined();
    expect(item.originalTitle).toBeUndefined();
    expect(item.genreIds).toBeUndefined();
    expect(item.overview).toBe('');
    expect('posterPath' in item).toBe(false);
  });

  it('treats a 0.0 score with no votes as unrated rather than a bad rating', () => {
    const item = mapMovieSummary(movie({ vote_average: 0, vote_count: 0 }));
    expect(item.rating).toBeUndefined();
    expect(item.voteCount).toBeUndefined();
  });

  it('rounds ratings to one decimal', () => {
    expect(mapMovieSummary(movie({ vote_average: 7.349 })).rating).toBe(7.3);
    expect(mapMovieSummary(movie({ vote_average: 7.35 })).rating).toBe(7.4);
  });
});

describe('mapTvSummary', () => {
  it('maps name and first_air_date onto the shared title/releaseDate fields', () => {
    const item = mapTvSummary(tv());
    expect(item).toMatchObject({
      id: 1396,
      mediaType: 'tv',
      title: 'Breaking Bad',
      originalTitle: 'Breaking Bad',
      releaseDate: '2008-01-20',
      year: 2008,
      rating: 8.9,
    });
  });

  it('keeps the same numeric id distinct from a movie by carrying mediaType', () => {
    const asMovie = mapMovieSummary(movie({ id: 1396 }));
    const asTv = mapTvSummary(tv({ id: 1396 }));
    expect(asMovie.id).toBe(asTv.id);
    expect(asMovie.mediaType).not.toBe(asTv.mediaType);
  });
});

describe('page mappers', () => {
  it('maps pagination metadata and every result', () => {
    const page = mapMoviePage(
      tmdbMoviePageSchema.parse(rawPage([rawMovie(), rawMovie({ id: 2 })])),
    );
    expect(page).toMatchObject({ page: 1, totalPages: 5, totalResults: 10 });
    expect(page.items.map((item) => item.id)).toEqual([550, 2]);
  });

  it('maps TV pages as TV items', () => {
    const page = mapTvPage({
      page: 2,
      total_pages: 9,
      total_results: 180,
      results: [tv()],
    });
    expect(page.items[0]?.mediaType).toBe('tv');
    expect(page.page).toBe(2);
  });
});

describe('schema leniency', () => {
  it('drops a malformed result but keeps the valid ones', () => {
    const parsed = tmdbMoviePageSchema.parse(
      rawPage([rawMovie(), { id: 'not-a-number', title: 'Broken' }, rawMovie({ id: 3 })]),
    );
    expect(parsed.results.map((result) => result.id)).toEqual([550, 3]);
  });

  it('rejects a response that is not a page at all', () => {
    expect(tmdbMoviePageSchema.safeParse({ results: 'nope' }).success).toBe(false);
  });

  it('strips unknown fields so raw TMDB extras never leak into the app', () => {
    const parsed = tmdbMovieSummarySchema.parse(rawMovie({ some_new_field: 1 }));
    expect(parsed).not.toHaveProperty('some_new_field');
  });
});
