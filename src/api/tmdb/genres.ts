import type { Genre } from '@/types/media';
import { tmdbGet } from './client';
import { tmdbGenreListSchema } from './schemas';

/**
 * `/genre/movie/list` and `/genre/tv/list`. TMDB's genre list is effectively static (it changes
 * on the order of once a year, if that), so callers should cache it aggressively — see
 * `useMovieGenres`/`useTvGenres`, which set an infinite `staleTime`.
 */
export async function getMovieGenres(signal?: AbortSignal): Promise<Genre[]> {
  const raw = await tmdbGet('/genre/movie/list', { schema: tmdbGenreListSchema, signal });
  return raw.genres;
}

export async function getTvGenres(signal?: AbortSignal): Promise<Genre[]> {
  const raw = await tmdbGet('/genre/tv/list', { schema: tmdbGenreListSchema, signal });
  return raw.genres;
}
