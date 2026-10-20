import { env } from '@/config/env';
import type { MediaPage } from '@/types/media';
import { tmdbGet } from './client';
import { mapMoviePage, mapTvPage } from './mappers';
import { tmdbMoviePageSchema, tmdbTvPageSchema } from './schemas';

/** Sort orders offered by the browse pages. Translated to TMDB's `sort_by` per media type below,
 * so the UI never has to know TMDB's parameter names. */
export type DiscoverSort = 'popularity' | 'rating' | 'newest';

export interface DiscoverOptions {
  page?: number;
  /** Restrict to one TMDB genre id. Omit (or leave undefined) for "All genres". */
  genreId?: number | undefined;
  sort?: DiscoverSort;
  signal?: AbortSignal | undefined;
}

/** TMDB requires a minimum vote count when sorting by rating, or single-vote 10/10s float to the
 * top ahead of anything actually well-reviewed. */
const MIN_VOTES_FOR_RATING_SORT = 50;

function sortParams(sort: DiscoverSort, dateSortKey: 'primary_release_date' | 'first_air_date') {
  switch (sort) {
    case 'rating':
      return { sort_by: 'vote_average.desc', 'vote_count.gte': MIN_VOTES_FOR_RATING_SORT };
    case 'newest':
      return { sort_by: `${dateSortKey}.desc` };
    case 'popularity':
      return { sort_by: 'popularity.desc' };
  }
}

/** `/discover/movie`, genre-filtered and sortable. */
export async function discoverMovies({
  page = 1,
  genreId,
  sort = 'popularity',
  signal,
}: DiscoverOptions = {}): Promise<MediaPage> {
  const raw = await tmdbGet('/discover/movie', {
    schema: tmdbMoviePageSchema,
    params: {
      page,
      region: env.tmdbRegion,
      with_genres: genreId,
      ...sortParams(sort, 'primary_release_date'),
    },
    signal,
  });
  return mapMoviePage(raw);
}

/** `/discover/tv`, genre-filtered and sortable. */
export async function discoverTv({
  page = 1,
  genreId,
  sort = 'popularity',
  signal,
}: DiscoverOptions = {}): Promise<MediaPage> {
  const raw = await tmdbGet('/discover/tv', {
    schema: tmdbTvPageSchema,
    params: { page, with_genres: genreId, ...sortParams(sort, 'first_air_date') },
    signal,
  });
  return mapTvPage(raw);
}

/**
 * TMDB has no first-class "anime" flag. The conventional way to approximate it — the same one
 * most metadata-driven apps use — is the "Animation" genre restricted to a Japanese original
 * language. It's an approximation (it can miss non-Japanese-language anime co-productions and
 * include some non-anime Japanese animation), not an authoritative classification.
 */
export const ANIME_BASE_GENRE_ID = 16;
const ANIME_ORIGINAL_LANGUAGE = 'ja';

/** ANDs the anime base genre with an optional extra genre the user picked (TMDB: comma = AND). */
function withAnimeGenre(genreId: number | undefined): string {
  return genreId ? `${ANIME_BASE_GENRE_ID},${genreId}` : String(ANIME_BASE_GENRE_ID);
}

/** `/discover/movie` restricted to anime. */
export async function discoverAnimeMovies({
  page = 1,
  genreId,
  sort = 'popularity',
  signal,
}: DiscoverOptions = {}): Promise<MediaPage> {
  const raw = await tmdbGet('/discover/movie', {
    schema: tmdbMoviePageSchema,
    params: {
      page,
      region: env.tmdbRegion,
      with_genres: withAnimeGenre(genreId),
      with_original_language: ANIME_ORIGINAL_LANGUAGE,
      ...sortParams(sort, 'primary_release_date'),
    },
    signal,
  });
  return mapMoviePage(raw);
}

/** `/discover/tv` restricted to anime. */
export async function discoverAnimeTv({
  page = 1,
  genreId,
  sort = 'popularity',
  signal,
}: DiscoverOptions = {}): Promise<MediaPage> {
  const raw = await tmdbGet('/discover/tv', {
    schema: tmdbTvPageSchema,
    params: {
      page,
      with_genres: withAnimeGenre(genreId),
      with_original_language: ANIME_ORIGINAL_LANGUAGE,
      ...sortParams(sort, 'first_air_date'),
    },
    signal,
  });
  return mapTvPage(raw);
}

export interface PoolOptions {
  mediaType: 'movie' | 'tv';
  /** Japanese animation, see `ANIME_BASE_GENRE_ID`. */
  anime: boolean;
  /** TMDB `with_genres`: `|` between ids means any of them. */
  genres?: string | undefined;
  page: number;
  signal?: AbortSignal | undefined;
}

/** Well-liked titles only: enough votes that the score means something, and a decent score. */
const POOL_MIN_VOTES = { movie: 300, tv: 150 } as const;
const POOL_MIN_RATING = 6.3;

/**
 * One page of popular, well-rated titles for the "Surprise me" pool, optionally narrowed by
 * genre and to anime. Picking a random `page` is what makes the picks differ from visit to visit.
 */
export async function discoverPool({
  mediaType,
  anime,
  genres,
  page,
  signal,
}: PoolOptions): Promise<MediaPage> {
  const params = {
    page,
    sort_by: 'popularity.desc',
    'vote_count.gte': POOL_MIN_VOTES[mediaType],
    'vote_average.gte': POOL_MIN_RATING,
    include_adult: false,
    with_genres: anime
      ? genres
        ? `${ANIME_BASE_GENRE_ID},${genres}`
        : String(ANIME_BASE_GENRE_ID)
      : genres,
    with_original_language: anime ? ANIME_ORIGINAL_LANGUAGE : undefined,
  };
  if (mediaType === 'movie') {
    const raw = await tmdbGet('/discover/movie', {
      schema: tmdbMoviePageSchema,
      params: { ...params, region: env.tmdbRegion },
      signal,
    });
    return mapMoviePage(raw);
  }
  const raw = await tmdbGet('/discover/tv', { schema: tmdbTvPageSchema, params, signal });
  return mapTvPage(raw);
}
