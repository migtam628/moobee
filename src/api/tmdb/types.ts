import type { z } from 'zod';
import type {
  tmdbMovieDetailsSchema,
  tmdbSeasonSummarySchema,
  tmdbTvDetailsSchema,
} from './detailSchemas';
import type { tmdbPersonCreditSchema, tmdbPersonDetailsSchema } from './personSchemas';
import type {
  tmdbGenreListSchema,
  tmdbGenreSchema,
  tmdbMoviePageSchema,
  tmdbMovieSummarySchema,
  tmdbTvPageSchema,
  tmdbTvSummarySchema,
} from './schemas';
import type { tmdbSearchPageSchema } from './searchSchemas';
import type { tmdbSeasonDetailsSchema } from './seasonSchemas';

/**
 * Raw TMDB models, inferred from the Zod schemas so the runtime validation and the compile-time
 * types can never drift apart.
 *
 * These describe TMDB's wire format (snake_case, nullable fields). UI code must not import them:
 * it consumes the normalized models in `@/types/media` produced by `./mappers`.
 */
export type TmdbGenre = z.output<typeof tmdbGenreSchema>;
export type TmdbMovieSummary = z.output<typeof tmdbMovieSummarySchema>;
export type TmdbTvSummary = z.output<typeof tmdbTvSummarySchema>;
export type TmdbMoviePage = z.output<typeof tmdbMoviePageSchema>;
export type TmdbTvPage = z.output<typeof tmdbTvPageSchema>;
export type TmdbMovieDetails = z.output<typeof tmdbMovieDetailsSchema>;
export type TmdbTvDetails = z.output<typeof tmdbTvDetailsSchema>;
export type TmdbSearchPage = z.output<typeof tmdbSearchPageSchema>;
export type TmdbSeasonSummary = z.output<typeof tmdbSeasonSummarySchema>;
export type TmdbSeasonDetails = z.output<typeof tmdbSeasonDetailsSchema>;
export type TmdbGenreList = z.output<typeof tmdbGenreListSchema>;
export type TmdbPersonCredit = z.output<typeof tmdbPersonCreditSchema>;
export type TmdbPersonDetails = z.output<typeof tmdbPersonDetailsSchema>;

/** Categories exposed by TMDB for list endpoints (`/movie/{category}`). */
export type TmdbMovieCategory = 'popular' | 'top_rated' | 'upcoming' | 'now_playing';
/** Categories exposed by TMDB for list endpoints (`/tv/{category}`). */
export type TmdbTvCategory = 'popular' | 'top_rated' | 'on_the_air';
/** Time window supported by the trending endpoints. */
export type TmdbTrendingWindow = 'day' | 'week';
