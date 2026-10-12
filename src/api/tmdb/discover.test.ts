import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, rawGenreList, rawMovie, rawPage, rawTv } from '@/test/fixtures';
import {
  discoverAnimeMovies,
  discoverAnimeTv,
  discoverMovies,
  discoverTv,
  getMovieGenres,
  getTvGenres,
} from './index';

function stubFetch(body: unknown) {
  const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(body)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const requestedUrl = (fetchMock: ReturnType<typeof stubFetch>) =>
  new URL(String((fetchMock.mock.calls[0] as unknown[] | undefined)?.[0]), 'http://localhost');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('genre services', () => {
  it('fetches and normalizes the movie genre list', async () => {
    const fetchMock = stubFetch(rawGenreList());
    const genres = await getMovieGenres();
    expect(requestedUrl(fetchMock).pathname).toBe('/api/tmdb/genre/movie/list');
    expect(genres).toEqual([
      { id: 28, name: 'Action' },
      { id: 18, name: 'Drama' },
    ]);
  });

  it('fetches the TV genre list from its own endpoint', async () => {
    const fetchMock = stubFetch(rawGenreList());
    await getTvGenres();
    expect(requestedUrl(fetchMock).pathname).toBe('/api/tmdb/genre/tv/list');
  });

  it('drops malformed genre entries instead of failing the whole list', async () => {
    stubFetch({ genres: [{ id: 28, name: 'Action' }, { id: 'nope' }] });
    const genres = await getMovieGenres();
    expect(genres).toEqual([{ id: 28, name: 'Action' }]);
  });
});

describe('discover services', () => {
  it('hits /discover/movie with popularity as the default sort', async () => {
    const fetchMock = stubFetch(rawPage([rawMovie()]));
    const page = await discoverMovies();
    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe('/api/tmdb/discover/movie');
    expect(url.searchParams.get('sort_by')).toBe('popularity.desc');
    expect(page.items[0]).toMatchObject({ mediaType: 'movie', title: 'Fight Club' });
  });

  it('filters by genre and requests a specific page', async () => {
    const fetchMock = stubFetch(rawPage([rawMovie()], { page: 2 }));
    await discoverMovies({ genreId: 28, page: 2 });
    const url = requestedUrl(fetchMock);
    expect(url.searchParams.get('with_genres')).toBe('28');
    expect(url.searchParams.get('page')).toBe('2');
  });

  it('applies a minimum vote count when sorting by rating', async () => {
    const fetchMock = stubFetch(rawPage([rawMovie()]));
    await discoverMovies({ sort: 'rating' });
    const url = requestedUrl(fetchMock);
    expect(url.searchParams.get('sort_by')).toBe('vote_average.desc');
    expect(url.searchParams.get('vote_count.gte')).toBe('50');
  });

  it('sorts movies and TV by their own date fields when "newest" is requested', async () => {
    const movieFetch = stubFetch(rawPage([rawMovie()]));
    await discoverMovies({ sort: 'newest' });
    expect(requestedUrl(movieFetch).searchParams.get('sort_by')).toBe('primary_release_date.desc');
    vi.unstubAllGlobals();

    const tvFetch = stubFetch(rawPage([rawTv()]));
    await discoverTv({ sort: 'newest' });
    expect(requestedUrl(tvFetch).searchParams.get('sort_by')).toBe('first_air_date.desc');
  });

  it('hits /discover/tv and returns normalized shows', async () => {
    const fetchMock = stubFetch(rawPage([rawTv()]));
    const page = await discoverTv();
    expect(requestedUrl(fetchMock).pathname).toBe('/api/tmdb/discover/tv');
    expect(page.items[0]).toMatchObject({ mediaType: 'tv', title: 'Breaking Bad' });
  });
});

describe('anime discover services', () => {
  it('restricts /discover/movie to the Animation genre and Japanese original language', async () => {
    const fetchMock = stubFetch(rawPage([rawMovie()]));
    await discoverAnimeMovies();
    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe('/api/tmdb/discover/movie');
    expect(url.searchParams.get('with_genres')).toBe('16');
    expect(url.searchParams.get('with_original_language')).toBe('ja');
  });

  it('restricts /discover/tv to the Animation genre and Japanese original language', async () => {
    const fetchMock = stubFetch(rawPage([rawTv()]));
    await discoverAnimeTv();
    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe('/api/tmdb/discover/tv');
    expect(url.searchParams.get('with_genres')).toBe('16');
    expect(url.searchParams.get('with_original_language')).toBe('ja');
  });

  it('ANDs a user-picked genre with the anime base genre (TMDB: comma = AND)', async () => {
    const fetchMock = stubFetch(rawPage([rawMovie()]));
    await discoverAnimeMovies({ genreId: 14 });
    expect(requestedUrl(fetchMock).searchParams.get('with_genres')).toBe('16,14');
  });

  it('still applies the requested sort order', async () => {
    const fetchMock = stubFetch(rawPage([rawTv()]));
    await discoverAnimeTv({ sort: 'rating' });
    const url = requestedUrl(fetchMock);
    expect(url.searchParams.get('sort_by')).toBe('vote_average.desc');
    expect(url.searchParams.get('vote_count.gte')).toBe('50');
  });
});
