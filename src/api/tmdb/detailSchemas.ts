import { z } from 'zod';
import {
  lenientArray,
  nullableString,
  summaryFields,
  tmdbGenreSchema,
  tmdbMoviePageSchema,
  tmdbTvPageSchema,
} from './schemas';

/**
 * Schemas for `/movie/{id}` and `/tv/{id}` requested with `append_to_response`.
 *
 * Every appended section is tolerated independently: if `credits` (say) comes back malformed,
 * the page still renders with the rest, minus the cast. Only the core title fields are required.
 */

/** A section that becomes `undefined` when missing or malformed instead of failing the response. */
const section = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

const tmdbCastSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  character: nullableString,
  profile_path: nullableString,
  order: z.number().nullish(),
});

const tmdbCrewSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  job: nullableString,
});

const tmdbCreditsSchema = z.object({
  cast: lenientArray(tmdbCastSchema).catch([]),
  crew: lenientArray(tmdbCrewSchema).catch([]),
});

const tmdbVideoSchema = z.object({
  id: z.string(),
  key: z.string(),
  site: z.string(),
  type: z.string(),
  name: nullableString,
  official: z.boolean().nullish(),
});

const tmdbVideosSchema = z.object({ results: lenientArray(tmdbVideoSchema).catch([]) });

const tmdbProviderSchema = z.object({
  provider_id: z.number().int(),
  provider_name: z.string().min(1),
  logo_path: nullableString,
  display_priority: z.number().nullish(),
});

const providerList = lenientArray(tmdbProviderSchema).catch([]);

const tmdbRegionProvidersSchema = z.object({
  link: nullableString,
  flatrate: providerList,
  free: providerList,
  ads: providerList,
  rent: providerList,
  buy: providerList,
});

const tmdbWatchProvidersSchema = z.object({
  results: z.record(z.string(), tmdbRegionProvidersSchema.optional().catch(undefined)).catch({}),
});

const tmdbReleaseDatesSchema = z.object({
  results: lenientArray(
    z.object({
      iso_3166_1: z.string(),
      release_dates: lenientArray(
        z.object({ certification: nullableString, type: z.number().nullish() }),
      ).catch([]),
    }),
  ).catch([]),
});

const tmdbContentRatingsSchema = z.object({
  results: lenientArray(z.object({ iso_3166_1: z.string(), rating: nullableString })).catch([]),
});

const tmdbExternalIdsSchema = z.object({ imdb_id: nullableString });

const tmdbPersonRefSchema = z.object({ id: z.number().int(), name: z.string().min(1) });

/** One entry of a TV show's `seasons` list (no episodes; those come from the season endpoint). */
export const tmdbSeasonSummarySchema = z.object({
  id: z.number().int(),
  season_number: z.number().int(),
  name: z.string().min(1),
  overview: nullableString,
  poster_path: nullableString,
  air_date: nullableString,
  episode_count: z.number().nullish(),
  vote_average: z.number().nullish(),
});

/** Fields shared by movie and TV details responses. */
const detailBase = {
  ...summaryFields,
  tagline: nullableString,
  status: nullableString,
  genres: lenientArray(tmdbGenreSchema).catch([]),
  credits: section(tmdbCreditsSchema),
  videos: section(tmdbVideosSchema),
  'watch/providers': section(tmdbWatchProvidersSchema),
  external_ids: section(tmdbExternalIdsSchema),
};

export const tmdbMovieDetailsSchema = z.object({
  ...detailBase,
  title: z.string().min(1),
  original_title: nullableString,
  release_date: nullableString,
  runtime: z.number().nullish(),
  imdb_id: nullableString,
  release_dates: section(tmdbReleaseDatesSchema),
  recommendations: section(tmdbMoviePageSchema),
  similar: section(tmdbMoviePageSchema),
});

export const tmdbTvDetailsSchema = z.object({
  ...detailBase,
  name: z.string().min(1),
  original_name: nullableString,
  first_air_date: nullableString,
  last_air_date: nullableString,
  in_production: z.boolean().nullish(),
  number_of_seasons: z.number().nullish(),
  number_of_episodes: z.number().nullish(),
  episode_run_time: lenientArray(z.number()).catch([]),
  created_by: lenientArray(tmdbPersonRefSchema).catch([]),
  networks: lenientArray(tmdbPersonRefSchema).catch([]),
  content_ratings: section(tmdbContentRatingsSchema),
  recommendations: section(tmdbTvPageSchema),
  similar: section(tmdbTvPageSchema),
  seasons: lenientArray(tmdbSeasonSummarySchema).catch([]),
});
