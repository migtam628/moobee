import { describe, expect, it } from 'vitest';
import type { MovieDetails, TvDetails } from '@/types/media';
import { getFacts, getMetaItems } from './details';

const movie = (overrides: Partial<MovieDetails> = {}): MovieDetails => ({
  id: 1,
  mediaType: 'movie',
  title: 'A Movie',
  overview: '',
  genres: [],
  cast: [],
  recommendations: [],
  similar: [],
  directors: [],
  ...overrides,
});

const show = (overrides: Partial<TvDetails> = {}): TvDetails => ({
  id: 2,
  mediaType: 'tv',
  title: 'A Show',
  overview: '',
  genres: [],
  cast: [],
  recommendations: [],
  similar: [],
  creators: [],
  networks: [],
  seasons: [],
  ...overrides,
});

describe('getMetaItems', () => {
  it('lists year and runtime for movies, skipping what is missing', () => {
    expect(getMetaItems(movie({ year: 1999, runtimeMinutes: 139 }))).toEqual(['1999', '2h 19m']);
    expect(getMetaItems(movie({ year: 1999 }))).toEqual(['1999']);
    expect(getMetaItems(movie())).toEqual([]);
  });

  it('lists the year range and counts for shows, with correct plurals', () => {
    expect(
      getMetaItems(show({ year: 2008, endYear: 2013, numberOfSeasons: 5, numberOfEpisodes: 62 })),
    ).toEqual(['2008–2013', '5 seasons', '62 episodes']);
    expect(getMetaItems(show({ year: 2020, numberOfSeasons: 1, numberOfEpisodes: 1 }))).toEqual([
      '2020',
      '1 season',
      '1 episode',
    ]);
  });
});

describe('getFacts', () => {
  it('labels directors by count and omits empty facts', () => {
    expect(getFacts(movie({ directors: ['A'] }))).toEqual([{ label: 'Director', value: 'A' }]);
    expect(getFacts(movie({ directors: ['A', 'B'], status: 'Released' }))).toEqual([
      { label: 'Directors', value: 'A, B' },
      { label: 'Status', value: 'Released' },
    ]);
    expect(getFacts(movie())).toEqual([]);
  });

  it('lists creators and networks for shows', () => {
    expect(
      getFacts(show({ creators: ['C'], networks: ['AMC', 'Netflix'], status: 'Ended' })),
    ).toEqual([
      { label: 'Creator', value: 'C' },
      { label: 'Networks', value: 'AMC, Netflix' },
      { label: 'Status', value: 'Ended' },
    ]);
  });
});
