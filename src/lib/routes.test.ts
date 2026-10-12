import { describe, expect, it } from 'vitest';
import type { MovieDetails, TvDetails } from '@/types/media';
import { getMediaPath, getWatchPath, parseRouteId, parseSeasonNumber, paths } from './routes';

describe('parseRouteId', () => {
  it.each([
    ['550', 550],
    ['1', 1],
    ['1396', 1396],
  ])('accepts %s', (param, expected) => {
    expect(parseRouteId(param)).toBe(expected);
  });

  it.each([undefined, '', '0', '-5', '12abc', '1e3', ' 7', '7 ', '1.5', '0x10', '12345678901'])(
    'rejects %j',
    (param) => {
      expect(parseRouteId(param)).toBeUndefined();
    },
  );
});

describe('parseSeasonNumber', () => {
  it.each([
    ['0', 0],
    ['1', 1],
    ['12', 12],
  ])('accepts %s, including 0 for "Specials"', (param, expected) => {
    expect(parseSeasonNumber(param)).toBe(expected);
  });

  it.each([undefined, '', '-1', '1.5', '12abc', '1e3', ' 1', '1 '])('rejects %j', (param) => {
    expect(parseSeasonNumber(param)).toBeUndefined();
  });
});

describe('paths', () => {
  it('encodes search queries', () => {
    expect(paths.searchFor('mad max & co')).toBe('/search?q=mad%20max%20%26%20co');
  });

  it('routes movies and shows to different namespaces', () => {
    expect(getMediaPath({ id: 5, mediaType: 'movie' })).toBe('/movie/5');
    expect(getMediaPath({ id: 5, mediaType: 'tv' })).toBe('/tv/5');
  });

  it('builds season and player routes', () => {
    expect(paths.tvSeason(5, 2)).toBe('/tv/5/season/2');
    expect(paths.watchMovie(5)).toBe('/watch/movie/5');
    expect(paths.watchTv(5, 2, 4)).toBe('/watch/tv/5/2/4');
    expect(paths.upload).toBe('/upload');
  });
});

describe('getWatchPath', () => {
  const movie = (overrides: Partial<MovieDetails> = {}): MovieDetails => ({
    id: 5,
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
    id: 5,
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

  it('sends a movie straight to its watch page', () => {
    expect(getWatchPath(movie())).toBe('/watch/movie/5');
  });

  it('sends a show to episode 1 of its first regular season, skipping "Specials"', () => {
    const seasons = [
      { id: 1, seasonNumber: 0, name: 'Specials' },
      { id: 2, seasonNumber: 1, name: 'Season 1' },
      { id: 3, seasonNumber: 2, name: 'Season 2' },
    ];
    expect(getWatchPath(show({ seasons }))).toBe('/watch/tv/5/1/1');
  });

  it('falls back to season 0 when that is the only season', () => {
    const seasons = [{ id: 1, seasonNumber: 0, name: 'Specials' }];
    expect(getWatchPath(show({ seasons }))).toBe('/watch/tv/5/0/1');
  });

  it('is undefined for a show with no season data at all', () => {
    expect(getWatchPath(show())).toBeUndefined();
  });
});
