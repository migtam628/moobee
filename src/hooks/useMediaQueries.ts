import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  discoverAnimeMovies,
  discoverAnimeTv,
  discoverMovies,
  discoverTv,
  getMovieDetails,
  getMovieGenres,
  getNowPlayingMovies,
  getPersonDetails,
  getPopularMovies,
  getPopularTv,
  getTopRatedMovies,
  getTrendingMovies,
  getTvDetails,
  getTvGenres,
  getTvSeason,
  getUpcomingMovies,
  searchMulti,
  type DiscoverSort,
} from '@/api/tmdb';
import { getMediaKey } from '@/lib/media';
import type {
  Genre,
  MediaItem,
  MediaPage,
  MovieDetails,
  PersonDetails,
  PersonSummary,
  SearchPage,
  SeasonDetails,
  TvDetails,
} from '@/types/media';

/**
 * Query hooks for media lists. They are the only bridge between React and the API layer.
 * Query keys are centralised so the same request from several components (e.g. the hero and
 * the "Trending" row) shares one cache entry and one network call.
 */

export const mediaKeys = {
  all: ['media'] as const,
  trending: (mediaType: 'movie' | 'tv', window: 'day' | 'week') =>
    [...mediaKeys.all, 'trending', mediaType, window] as const,
  list: (mediaType: 'movie' | 'tv', category: string) =>
    [...mediaKeys.all, 'list', mediaType, category] as const,
  details: (mediaType: 'movie' | 'tv', id: number) =>
    [...mediaKeys.all, 'details', mediaType, id] as const,
  season: (tvId: number, seasonNumber: number) =>
    [...mediaKeys.all, 'season', tvId, seasonNumber] as const,
  search: (query: string) => [...mediaKeys.all, 'search', query] as const,
  genres: (mediaType: 'movie' | 'tv') => [...mediaKeys.all, 'genres', mediaType] as const,
  // `kind` is a discriminator, not necessarily a raw media type: the anime browse hooks use
  // 'anime-movie' / 'anime-tv' so their cache entries never collide with the plain browse pages.
  discover: (kind: string, genreId: number | undefined, sort: DiscoverSort) =>
    [...mediaKeys.all, 'discover', kind, genreId ?? 'all', sort] as const,
  person: (id: number) => [...mediaKeys.all, 'person', id] as const,
};

export interface ListQueryOptions {
  /** Set false to hold the request until the row is near the viewport. */
  enabled?: boolean;
}

const selectItems = (page: MediaPage): MediaItem[] => page.items;

export type MediaListQuery = UseQueryResult<MediaItem[]>;

export function useTrendingMovies(): MediaListQuery {
  return useQuery({
    queryKey: mediaKeys.trending('movie', 'week'),
    queryFn: ({ signal }) => getTrendingMovies({ window: 'week', signal }),
    select: selectItems,
  });
}

export function usePopularMovies(): MediaListQuery {
  return useQuery({
    queryKey: mediaKeys.list('movie', 'popular'),
    queryFn: ({ signal }) => getPopularMovies({ signal }),
    select: selectItems,
  });
}

export function useTopRatedMovies({ enabled = true }: ListQueryOptions = {}): MediaListQuery {
  return useQuery({
    queryKey: mediaKeys.list('movie', 'top_rated'),
    queryFn: ({ signal }) => getTopRatedMovies({ signal }),
    select: selectItems,
    enabled,
  });
}

export function useNowPlayingMovies({ enabled = true }: ListQueryOptions = {}): MediaListQuery {
  return useQuery({
    queryKey: mediaKeys.list('movie', 'now_playing'),
    queryFn: ({ signal }) => getNowPlayingMovies({ signal }),
    select: selectItems,
    enabled,
  });
}

export function useUpcomingMovies({ enabled = true }: ListQueryOptions = {}): MediaListQuery {
  return useQuery({
    queryKey: mediaKeys.list('movie', 'upcoming'),
    queryFn: ({ signal }) => getUpcomingMovies({ signal }),
    select: selectItems,
    enabled,
  });
}

export function usePopularTv(): MediaListQuery {
  return useQuery({
    queryKey: mediaKeys.list('tv', 'popular'),
    queryFn: ({ signal }) => getPopularTv({ signal }),
    select: selectItems,
  });
}

/** Details are fetched only for a valid id; an undefined id (bad URL) never hits the network. */
export function useMovieDetails(id: number | undefined): UseQueryResult<MovieDetails> {
  return useQuery({
    queryKey: mediaKeys.details('movie', id ?? 0),
    queryFn: ({ signal }) => getMovieDetails(id ?? 0, { signal }),
    enabled: id !== undefined,
  });
}

export function useTvDetails(id: number | undefined): UseQueryResult<TvDetails> {
  return useQuery({
    queryKey: mediaKeys.details('tv', id ?? 0),
    queryFn: ({ signal }) => getTvDetails(id ?? 0, { signal }),
    enabled: id !== undefined,
  });
}

/** A season's episode list. Either id being undefined (an invalid route) skips the request. */
export function useTvSeason(
  tvId: number | undefined,
  seasonNumber: number | undefined,
): UseQueryResult<SeasonDetails> {
  return useQuery({
    queryKey: mediaKeys.season(tvId ?? 0, seasonNumber ?? 0),
    queryFn: ({ signal }) => getTvSeason(tvId ?? 0, seasonNumber ?? 0, { signal }),
    enabled: tvId !== undefined && seasonNumber !== undefined,
  });
}

export const MIN_SEARCH_LENGTH = 2;
/** TMDB serves at most 500 pages from any paginated endpoint. */
const TMDB_MAX_PAGES = 500;

export interface SearchResults {
  media: MediaItem[];
  people: PersonSummary[];
  totalResults: number;
}

function combineSearchPages(pages: SearchPage[]): SearchResults {
  const seenMedia = new Set<string>();
  const seenPeople = new Set<number>();
  const media: MediaItem[] = [];
  const people: PersonSummary[] = [];

  for (const page of pages) {
    for (const item of page.media) {
      const key = getMediaKey(item);
      if (!seenMedia.has(key)) {
        seenMedia.add(key);
        media.push(item);
      }
    }
    for (const person of page.people) {
      if (!seenPeople.has(person.id)) {
        seenPeople.add(person.id);
        people.push(person);
      }
    }
  }
  return { media, people, totalResults: pages[0]?.totalResults ?? 0 };
}

/**
 * Paginated multi-search. The previous query's results stay on screen (`isPlaceholderData`)
 * while a new query loads, so typing doesn't flash empty states.
 */
export function useSearch(query: string) {
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: mediaKeys.search(trimmed),
    queryFn: ({ pageParam, signal }) => searchMulti(trimmed, { page: pageParam, signal }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < Math.min(last.totalPages, TMDB_MAX_PAGES) ? last.page + 1 : undefined,
    select: (data) => combineSearchPages(data.pages),
    enabled: trimmed.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
  });
}

export type SearchQuery = ReturnType<typeof useSearch>;

/**
 * Genre lists change on the order of once a year; cache them for the life of the session.
 * `enabled` (default true) lets a caller that needs both lists — e.g. the anime page, which
 * lets the viewer flip between movies and series — mount both hooks unconditionally (required by
 * the rules of hooks) while only the one currently shown actually fetches.
 */
export function useMovieGenres({ enabled = true }: ListQueryOptions = {}): UseQueryResult<Genre[]> {
  return useQuery({
    queryKey: mediaKeys.genres('movie'),
    queryFn: ({ signal }) => getMovieGenres(signal),
    staleTime: Infinity,
    enabled,
  });
}

export function useTvGenres({ enabled = true }: ListQueryOptions = {}): UseQueryResult<Genre[]> {
  return useQuery({
    queryKey: mediaKeys.genres('tv'),
    queryFn: ({ signal }) => getTvGenres(signal),
    staleTime: Infinity,
    enabled,
  });
}

export interface DiscoverParams {
  genreId?: number | undefined;
  sort?: DiscoverSort;
  /** Same purpose as `ListQueryOptions.enabled`: lets a caller mount several discover hooks
   * unconditionally and only let one of them actually fetch. Defaults to true. */
  enabled?: boolean;
}

export interface DiscoverResults {
  items: MediaItem[];
  totalResults: number;
}

function combineDiscoverPages(pages: MediaPage[]): DiscoverResults {
  const seen = new Set<string>();
  const items: MediaItem[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      const key = getMediaKey(item);
      if (!seen.has(key)) {
        seen.add(key);
        items.push(item);
      }
    }
  }
  return { items, totalResults: pages[0]?.totalResults ?? 0 };
}

/**
 * Shared by every `useDiscover*` hook below: paginated, genre-filtered, sortable browsing.
 * `kind` is only a cache-key discriminator (see `mediaKeys.discover`); `fetchPage` is what
 * actually determines the endpoint and media type.
 */
function useDiscover(
  kind: string,
  fetchPage: typeof discoverMovies,
  { genreId, sort = 'popularity', enabled = true }: DiscoverParams,
) {
  return useInfiniteQuery({
    queryKey: mediaKeys.discover(kind, genreId, sort),
    queryFn: ({ pageParam, signal }) => fetchPage({ page: pageParam, genreId, sort, signal }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < Math.min(last.totalPages, TMDB_MAX_PAGES) ? last.page + 1 : undefined,
    select: (data) => combineDiscoverPages(data.pages),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export const useDiscoverMovies = (params: DiscoverParams = {}) =>
  useDiscover('movie', discoverMovies, params);
export const useDiscoverTv = (params: DiscoverParams = {}) => useDiscover('tv', discoverTv, params);
/** Same shape as `useDiscoverMovies`/`useDiscoverTv`, restricted to anime — see `discoverAnimeMovies`/
 * `discoverAnimeTv` for what "anime" means here. */
export const useDiscoverAnimeMovies = (params: DiscoverParams = {}) =>
  useDiscover('anime-movie', discoverAnimeMovies, params);
export const useDiscoverAnimeTv = (params: DiscoverParams = {}) =>
  useDiscover('anime-tv', discoverAnimeTv, params);

export type DiscoverQuery = ReturnType<typeof useDiscoverMovies>;

/** A person's profile and filmography. An undefined id (bad URL) never hits the network. */
export function usePersonDetails(id: number | undefined): UseQueryResult<PersonDetails> {
  return useQuery({
    queryKey: mediaKeys.person(id ?? 0),
    queryFn: ({ signal }) => getPersonDetails(id ?? 0, { signal }),
    enabled: id !== undefined,
  });
}
