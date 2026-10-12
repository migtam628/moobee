import { z } from 'zod';
import {
  lenientArray,
  nullableString,
  tmdbMovieSummarySchema,
  tmdbTvSummarySchema,
} from './schemas';

/** `/search/multi` mixes movies, TV shows and people, discriminated by `media_type`. */

const searchMovieSchema = tmdbMovieSummarySchema.extend({ media_type: z.literal('movie') });
const searchTvSchema = tmdbTvSummarySchema.extend({ media_type: z.literal('tv') });

const searchPersonSchema = z.object({
  media_type: z.literal('person'),
  id: z.number().int().positive(),
  name: z.string().min(1),
  profile_path: nullableString,
  known_for_department: nullableString,
  known_for: lenientArray(z.object({ title: nullableString, name: nullableString })).catch([]),
});

export const tmdbSearchPageSchema = z.object({
  page: z.number().int().positive(),
  // Unknown media types are dropped by lenientArray rather than failing the page.
  results: lenientArray(
    z.discriminatedUnion('media_type', [searchMovieSchema, searchTvSchema, searchPersonSchema]),
  ),
  total_pages: z.number().int().nonnegative().default(1),
  total_results: z.number().int().nonnegative().default(0),
});
