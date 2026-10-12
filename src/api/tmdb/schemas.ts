import { z } from 'zod';

/**
 * Zod schemas describing the parts of the TMDB v3 API that MooBee consumes.
 *
 * They are intentionally lenient (optional/nullable where TMDB is inconsistent, unknown keys
 * are dropped) so a harmless upstream change does not blank the UI, while still guaranteeing
 * the fields the mappers rely on. Raw TMDB shapes never leave `src/api/tmdb`.
 */

/** TMDB sends `null`, a missing key, or an empty string for absent values. */
export const nullableString = z.string().nullish();

export const tmdbGenreSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const summaryFields = {
  id: z.number().int().positive(),
  overview: z.string().nullish(),
  poster_path: nullableString,
  backdrop_path: nullableString,
  vote_average: z.number().nullish(),
  vote_count: z.number().nullish(),
  popularity: z.number().nullish(),
  genre_ids: z.array(z.number().int()).nullish(),
  original_language: nullableString,
};

/** An item from `/movie/{category}` or `/trending/movie/{window}`. */
export const tmdbMovieSummarySchema = z.object({
  ...summaryFields,
  title: z.string().min(1),
  original_title: nullableString,
  release_date: nullableString,
});

/** An item from `/tv/{category}` or `/trending/tv/{window}`. */
export const tmdbTvSummarySchema = z.object({
  ...summaryFields,
  name: z.string().min(1),
  original_name: nullableString,
  first_air_date: nullableString,
});

/**
 * A `results` array that drops individual malformed entries instead of failing the whole page.
 * One bad record from upstream should cost one card, not the entire row.
 */
export function lenientArray<T extends z.ZodType>(itemSchema: T) {
  return z.array(z.unknown()).transform((entries): z.output<T>[] => {
    const valid: z.output<T>[] = [];
    let dropped = 0;
    for (const entry of entries) {
      const parsed = itemSchema.safeParse(entry);
      if (parsed.success) valid.push(parsed.data);
      else dropped += 1;
    }
    if (dropped > 0 && import.meta.env.DEV) {
      console.warn(`[tmdb] dropped ${dropped} malformed result(s) that failed schema validation`);
    }
    return valid;
  });
}

export function paginatedSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    page: z.number().int().positive(),
    results: lenientArray(itemSchema),
    total_pages: z.number().int().nonnegative().default(1),
    total_results: z.number().int().nonnegative().default(0),
  });
}

export const tmdbMoviePageSchema = paginatedSchema(tmdbMovieSummarySchema);
export const tmdbTvPageSchema = paginatedSchema(tmdbTvSummarySchema);

/** `/genre/movie/list` and `/genre/tv/list`. */
export const tmdbGenreListSchema = z.object({
  genres: lenientArray(tmdbGenreSchema).catch([]),
});
