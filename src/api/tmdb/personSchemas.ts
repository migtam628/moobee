import { z } from 'zod';
import { lenientArray, nullableString, summaryFields } from './schemas';

/**
 * Schemas for `/person/{id}` requested with `append_to_response=combined_credits,external_ids`.
 * Mirrors the tolerant style of `detailSchemas.ts`: a missing/malformed section degrades the page
 * instead of failing it.
 */

const section = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

/**
 * One entry of `combined_credits.cast`: a movie or TV summary plus the character played. TMDB
 * shapes it like a normal list-endpoint summary (see `summaryFields`) with `media_type` added and
 * only the title/name/date fields for the OTHER media type left null.
 */
export const tmdbPersonCreditSchema = z.object({
  ...summaryFields,
  media_type: z.enum(['movie', 'tv']),
  title: nullableString,
  name: nullableString,
  original_title: nullableString,
  original_name: nullableString,
  release_date: nullableString,
  first_air_date: nullableString,
  character: nullableString,
});

const tmdbCombinedCreditsSchema = z.object({
  cast: lenientArray(tmdbPersonCreditSchema).catch([]),
});

export const tmdbPersonDetailsSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  biography: nullableString,
  birthday: nullableString,
  deathday: nullableString,
  place_of_birth: nullableString,
  profile_path: nullableString,
  known_for_department: nullableString,
  combined_credits: section(tmdbCombinedCreditsSchema),
  external_ids: section(z.object({ imdb_id: nullableString })),
});
