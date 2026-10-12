import { env } from '@/config/env';
import type { MediaPage, MovieDetails } from '@/types/media';
import { tmdbGet } from './client';
import { mapMovieDetails } from './detailMappers';
import { tmdbMovieDetailsSchema } from './detailSchemas';
import { mapMoviePage } from './mappers';
import { tmdbMoviePageSchema } from './schemas';
import type { TmdbMovieCategory } from './types';

export interface ListOptions {
  page?: number;
  signal?: AbortSignal | undefined;
}

export async function getMoviesByCategory(
  category: TmdbMovieCategory,
  { page = 1, signal }: ListOptions = {},
): Promise<MediaPage> {
  const raw = await tmdbGet(`/movie/${category}`, {
    schema: tmdbMoviePageSchema,
    params: { page },
    signal,
  });
  return mapMoviePage(raw);
}

export const getPopularMovies = (options?: ListOptions) => getMoviesByCategory('popular', options);
export const getTopRatedMovies = (options?: ListOptions) =>
  getMoviesByCategory('top_rated', options);
export const getUpcomingMovies = (options?: ListOptions) =>
  getMoviesByCategory('upcoming', options);
export const getNowPlayingMovies = (options?: ListOptions) =>
  getMoviesByCategory('now_playing', options);

export interface DetailsOptions {
  signal?: AbortSignal | undefined;
  /** ISO 3166-1 country for certification and watch providers. Defaults to the app region. */
  region?: string;
}

/** Sections fetched in the same request (one round trip instead of seven). */
const MOVIE_APPENDED_SECTIONS = [
  'credits',
  'videos',
  'recommendations',
  'similar',
  'watch/providers',
  'release_dates',
  'external_ids',
].join(',');

/** Include trailers in the UI language plus untagged ones; TMDB otherwise hides many trailers. */
export const videoLanguages = (language: string): string =>
  `${language.split('-')[0] ?? 'en'},null`;

export async function getMovieDetails(
  id: number,
  { signal, region = env.tmdbRegion }: DetailsOptions = {},
): Promise<MovieDetails> {
  const raw = await tmdbGet(`/movie/${id}`, {
    schema: tmdbMovieDetailsSchema,
    params: {
      append_to_response: MOVIE_APPENDED_SECTIONS,
      include_video_language: videoLanguages(env.tmdbLanguage),
    },
    signal,
  });
  return mapMovieDetails(raw, { region });
}
