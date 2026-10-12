import type { MediaItem, MediaPage } from '@/types/media';
import type { TmdbMoviePage, TmdbMovieSummary, TmdbTvPage, TmdbTvSummary } from './types';

/**
 * Raw TMDB -> normalized MediaItem. This is the only place that knows TMDB's field names
 * (`release_date` vs `first_air_date`, `title` vs `name`, ...).
 */

export const nonEmpty = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
};

/** Extracts the year from an ISO date, ignoring TMDB's empty strings and malformed values. */
export function parseYear(date: string | null | undefined): number | undefined {
  const match = /^(\d{4})(?:-\d{2}-\d{2})?$/.exec(date?.trim() ?? '');
  return match?.[1] ? Number(match[1]) : undefined;
}

export const roundToTenth = (value: number): number => Math.round(value * 10) / 10;

/** Fields TMDB shares between movie and TV summaries. */
interface CommonFields {
  id: number;
  overview?: string | null | undefined;
  poster_path?: string | null | undefined;
  backdrop_path?: string | null | undefined;
  vote_average?: number | null | undefined;
  vote_count?: number | null | undefined;
  popularity?: number | null | undefined;
  genre_ids?: number[] | null | undefined;
  original_language?: string | null | undefined;
}

export function mapCommonFields(raw: CommonFields) {
  const posterPath = nonEmpty(raw.poster_path);
  const backdropPath = nonEmpty(raw.backdrop_path);
  const originalLanguage = nonEmpty(raw.original_language);
  const voteCount = raw.vote_count ?? 0;
  // A 0.0 average with zero votes means "unrated", not "terrible". Don't show a score.
  const rating =
    voteCount > 0 && typeof raw.vote_average === 'number'
      ? roundToTenth(raw.vote_average)
      : undefined;

  return {
    id: raw.id,
    overview: raw.overview?.trim() ?? '',
    ...(posterPath ? { posterPath } : {}),
    ...(backdropPath ? { backdropPath } : {}),
    ...(rating !== undefined ? { rating } : {}),
    ...(voteCount > 0 ? { voteCount } : {}),
    ...(typeof raw.popularity === 'number' ? { popularity: raw.popularity } : {}),
    ...(raw.genre_ids && raw.genre_ids.length > 0 ? { genreIds: raw.genre_ids } : {}),
    ...(originalLanguage ? { originalLanguage } : {}),
  };
}

export function mapMovieSummary(raw: TmdbMovieSummary): MediaItem {
  const releaseDate = nonEmpty(raw.release_date);
  const originalTitle = nonEmpty(raw.original_title);
  const year = parseYear(releaseDate);

  return {
    ...mapCommonFields(raw),
    mediaType: 'movie',
    title: raw.title,
    ...(originalTitle ? { originalTitle } : {}),
    ...(releaseDate ? { releaseDate } : {}),
    ...(year !== undefined ? { year } : {}),
  };
}

export function mapTvSummary(raw: TmdbTvSummary): MediaItem {
  const releaseDate = nonEmpty(raw.first_air_date);
  const originalTitle = nonEmpty(raw.original_name);
  const year = parseYear(releaseDate);

  return {
    ...mapCommonFields(raw),
    mediaType: 'tv',
    title: raw.name,
    ...(originalTitle ? { originalTitle } : {}),
    ...(releaseDate ? { releaseDate } : {}),
    ...(year !== undefined ? { year } : {}),
  };
}

export function mapMoviePage(raw: TmdbMoviePage): MediaPage {
  return {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    items: raw.results.map(mapMovieSummary),
  };
}

export function mapTvPage(raw: TmdbTvPage): MediaPage {
  return {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    items: raw.results.map(mapTvSummary),
  };
}
