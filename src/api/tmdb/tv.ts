import { env } from '@/config/env';
import type { MediaPage, SeasonDetails, TvDetails } from '@/types/media';
import { tmdbGet } from './client';
import { mapSeasonDetails, mapTvDetails } from './detailMappers';
import { tmdbTvDetailsSchema } from './detailSchemas';
import { mapTvPage } from './mappers';
import { videoLanguages, type DetailsOptions, type ListOptions } from './movies';
import { tmdbTvPageSchema } from './schemas';
import { tmdbSeasonDetailsSchema } from './seasonSchemas';
import type { TmdbTvCategory } from './types';

export async function getTvByCategory(
  category: TmdbTvCategory,
  { page = 1, signal }: ListOptions = {},
): Promise<MediaPage> {
  const raw = await tmdbGet(`/tv/${category}`, {
    schema: tmdbTvPageSchema,
    params: { page },
    signal,
  });
  return mapTvPage(raw);
}

export const getPopularTv = (options?: ListOptions) => getTvByCategory('popular', options);
export const getTopRatedTv = (options?: ListOptions) => getTvByCategory('top_rated', options);
export const getOnTheAirTv = (options?: ListOptions) => getTvByCategory('on_the_air', options);

const TV_APPENDED_SECTIONS = [
  'credits',
  'videos',
  'recommendations',
  'similar',
  'watch/providers',
  'content_ratings',
  'external_ids',
].join(',');

export async function getTvDetails(
  id: number,
  { signal, region = env.tmdbRegion }: DetailsOptions = {},
): Promise<TvDetails> {
  const raw = await tmdbGet(`/tv/${id}`, {
    schema: tmdbTvDetailsSchema,
    params: {
      append_to_response: TV_APPENDED_SECTIONS,
      include_video_language: videoLanguages(env.tmdbLanguage),
    },
    signal,
  });
  return mapTvDetails(raw, { region });
}

export interface SeasonOptions {
  signal?: AbortSignal | undefined;
}

/** A season's episode list. `seasonNumber` 0 is TMDB's convention for "Specials". */
export async function getTvSeason(
  tvId: number,
  seasonNumber: number,
  { signal }: SeasonOptions = {},
): Promise<SeasonDetails> {
  const raw = await tmdbGet(`/tv/${tvId}/season/${seasonNumber}`, {
    schema: tmdbSeasonDetailsSchema,
    signal,
  });
  return mapSeasonDetails(raw);
}
