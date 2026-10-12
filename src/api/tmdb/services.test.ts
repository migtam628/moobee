import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  jsonResponse,
  rawMovie,
  rawMovieDetails,
  rawPage,
  rawSearchMovie,
  rawSearchPerson,
  rawSearchTv,
  rawTv,
  rawTvDetails,
} from '@/test/fixtures';
import {
  getMovieDetails,
  getNowPlayingMovies,
  getOnTheAirTv,
  getPopularMovies,
  getPopularTv,
  getTopRatedMovies,
  getTopRatedTv,
  getTrendingMovies,
  getTrendingTv,
  getTvDetails,
  getUpcomingMovies,
  searchMulti,
} from './index';

/** The services go through the default client, which resolves fetch lazily at call time. */
function stubFetch(body: unknown) {
  const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(body)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const requestedPath = (fetchMock: ReturnType<typeof stubFetch>) =>
  new URL(String((fetchMock.mock.calls[0] as unknown[] | undefined)?.[0]), 'http://localhost')
    .pathname;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('movie services', () => {
  it.each([
    [getPopularMovies, '/api/tmdb/movie/popular'],
    [getTopRatedMovies, '/api/tmdb/movie/top_rated'],
    [getUpcomingMovies, '/api/tmdb/movie/upcoming'],
    [getNowPlayingMovies, '/api/tmdb/movie/now_playing'],
  ])('hits the right endpoint and returns normalized movies', async (fn, expectedPath) => {
    const fetchMock = stubFetch(rawPage([rawMovie()]));
    const page = await fn();
    expect(requestedPath(fetchMock)).toBe(expectedPath);
    expect(page.items[0]).toMatchObject({ mediaType: 'movie', title: 'Fight Club', year: 1999 });
  });

  it('passes the requested page number through', async () => {
    const fetchMock = stubFetch(rawPage([rawMovie()], { page: 3 }));
    const page = await getPopularMovies({ page: 3 });
    expect(String((fetchMock.mock.calls[0] as unknown[] | undefined)?.[0])).toContain('page=3');
    expect(page.page).toBe(3);
  });
});

describe('tv services', () => {
  it.each([
    [getPopularTv, '/api/tmdb/tv/popular'],
    [getTopRatedTv, '/api/tmdb/tv/top_rated'],
    [getOnTheAirTv, '/api/tmdb/tv/on_the_air'],
  ])('hits the right endpoint and returns normalized shows', async (fn, expectedPath) => {
    const fetchMock = stubFetch(rawPage([rawTv()]));
    const page = await fn();
    expect(requestedPath(fetchMock)).toBe(expectedPath);
    expect(page.items[0]).toMatchObject({ mediaType: 'tv', title: 'Breaking Bad', year: 2008 });
  });
});

describe('trending services', () => {
  it('defaults to the weekly window', async () => {
    const fetchMock = stubFetch(rawPage([rawMovie()]));
    await getTrendingMovies();
    expect(requestedPath(fetchMock)).toBe('/api/tmdb/trending/movie/week');
  });

  it('supports the daily window for TV', async () => {
    const fetchMock = stubFetch(rawPage([rawTv()]));
    const page = await getTrendingTv({ window: 'day' });
    expect(requestedPath(fetchMock)).toBe('/api/tmdb/trending/tv/day');
    expect(page.items[0]?.mediaType).toBe('tv');
  });
});

const requestedUrl = (fetchMock: ReturnType<typeof stubFetch>, call = 0) =>
  new URL(String((fetchMock.mock.calls[call] as unknown[] | undefined)?.[0]), 'http://localhost');

describe('details services', () => {
  it('fetches a movie with every appended section in one request', async () => {
    const fetchMock = stubFetch(rawMovieDetails());
    const details = await getMovieDetails(550);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe('/api/tmdb/movie/550');
    const appended = url.searchParams.get('append_to_response')?.split(',');
    expect(appended).toEqual(
      expect.arrayContaining([
        'credits',
        'videos',
        'recommendations',
        'similar',
        'watch/providers',
      ]),
    );
    expect(url.searchParams.get('include_video_language')).toMatch(/,null$/);
    expect(details).toMatchObject({ mediaType: 'movie', title: 'Fight Club', certification: 'R' });
  });

  it('fetches a TV show with content ratings', async () => {
    const fetchMock = stubFetch(rawTvDetails());
    const details = await getTvDetails(1396);

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe('/api/tmdb/tv/1396');
    expect(url.searchParams.get('append_to_response')).toContain('content_ratings');
    expect(details).toMatchObject({
      mediaType: 'tv',
      title: 'Breaking Bad',
      certification: 'TV-MA',
    });
  });

  it('uses the region for certification and providers', async () => {
    stubFetch(
      rawMovieDetails({
        release_dates: {
          results: [{ iso_3166_1: 'GB', release_dates: [{ certification: '18', type: 3 }] }],
        },
      }),
    );
    const details = await getMovieDetails(550, { region: 'GB' });
    expect(details.certification).toBe('18');
    expect(details.providers).toBeUndefined();
  });
});

describe('searchMulti', () => {
  it('splits movies, shows and people', async () => {
    const fetchMock = stubFetch(
      rawPage([rawSearchMovie(), rawSearchTv(), rawSearchPerson()], { total_results: 3 }),
    );
    const page = await searchMulti('  brad  ');

    expect(requestedUrl(fetchMock).pathname).toBe('/api/tmdb/search/multi');
    expect(requestedUrl(fetchMock).searchParams.get('query')).toBe('brad');
    expect(requestedUrl(fetchMock).searchParams.get('include_adult')).toBe('false');
    expect(page.media.map((item) => item.mediaType)).toEqual(['movie', 'tv']);
    expect(page.people).toEqual([
      {
        id: 287,
        name: 'Brad Pitt',
        profilePath: '/p.jpg',
        knownForDepartment: 'Acting',
        knownFor: ['Fight Club', 'Some Show'],
      },
    ]);
  });

  it('drops result kinds it does not understand instead of failing the page', async () => {
    stubFetch(
      rawPage([{ media_type: 'collection', id: 1, name: 'A collection' }, rawSearchMovie()]),
    );
    const page = await searchMulti('fight');
    expect(page.media).toHaveLength(1);
    expect(page.people).toEqual([]);
  });

  it('never calls the network for a blank query', async () => {
    const fetchMock = stubFetch(rawPage([]));
    const page = await searchMulti('   ');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(page.media).toEqual([]);
  });

  it('requests the page it is asked for', async () => {
    const fetchMock = stubFetch(rawPage([rawSearchMovie()], { page: 2 }));
    await searchMulti('fight', { page: 2 });
    expect(requestedUrl(fetchMock).searchParams.get('page')).toBe('2');
  });
});
