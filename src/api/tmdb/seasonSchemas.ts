import { z } from 'zod';
import { lenientArray, nullableString } from './schemas';

/** `/tv/{id}/season/{season_number}`: one season's episode list. */

const tmdbEpisodeSchema = z.object({
  id: z.number().int(),
  episode_number: z.number().int(),
  season_number: z.number().int(),
  name: z.string().min(1),
  overview: nullableString,
  still_path: nullableString,
  air_date: nullableString,
  runtime: z.number().nullish(),
  vote_average: z.number().nullish(),
  vote_count: z.number().nullish(),
});

export const tmdbSeasonDetailsSchema = z.object({
  id: z.number().int(),
  season_number: z.number().int(),
  name: z.string().min(1),
  overview: nullableString,
  poster_path: nullableString,
  air_date: nullableString,
  episodes: lenientArray(tmdbEpisodeSchema).catch([]),
});
