import type { MediaPage } from '@/types/media';
import { tmdbGet } from './client';
import { mapMoviePage, mapTvPage } from './mappers';
import type { ListOptions } from './movies';
import { tmdbMoviePageSchema, tmdbTvPageSchema } from './schemas';
import type { TmdbTrendingWindow } from './types';

export interface TrendingOptions extends ListOptions {
  window?: TmdbTrendingWindow;
}

export async function getTrendingMovies({
  window = 'week',
  page = 1,
  signal,
}: TrendingOptions = {}): Promise<MediaPage> {
  const raw = await tmdbGet(`/trending/movie/${window}`, {
    schema: tmdbMoviePageSchema,
    params: { page },
    signal,
  });
  return mapMoviePage(raw);
}

export async function getTrendingTv({
  window = 'week',
  page = 1,
  signal,
}: TrendingOptions = {}): Promise<MediaPage> {
  const raw = await tmdbGet(`/trending/tv/${window}`, {
    schema: tmdbTvPageSchema,
    params: { page },
    signal,
  });
  return mapTvPage(raw);
}
