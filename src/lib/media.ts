import type { MediaItem, MediaType } from '@/types/media';

/** Stable React key. Movie and TV ids overlap, so the id alone is NOT unique across types. */
export const getMediaKey = (item: Pick<MediaItem, 'id' | 'mediaType'>): string =>
  `${item.mediaType}:${item.id}`;

export const getMediaTypeLabel = (mediaType: MediaType): string =>
  mediaType === 'movie' ? 'Movie' : 'TV';

/** "8.1" — always one decimal so ratings line up visually. */
export const formatRating = (rating: number): string => rating.toFixed(1);

/**
 * Chooses hero candidates: titles that have a backdrop and a synopsis, so the hero never shows
 * a blank image or an empty description.
 */
export function pickFeatured(items: readonly MediaItem[], limit = 5): MediaItem[] {
  return items
    .filter((item) => Boolean(item.backdropPath) && item.overview.length > 0)
    .slice(0, limit);
}

/** Drops duplicates (same type + id) while preserving order. */
export function uniqueMedia(items: readonly MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getMediaKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Items from `items` that are not in `exclude` (same type + id). Used to keep "similar" from repeating "recommended". */
export function excludeMedia(
  items: readonly MediaItem[],
  exclude: readonly MediaItem[],
): MediaItem[] {
  const excluded = new Set(exclude.map(getMediaKey));
  return items.filter((item) => !excluded.has(getMediaKey(item)));
}

/**
 * Strips an item down to plain `MediaItem` fields. Used before persisting to `localStorage`
 * (watchlist, favorites, recently viewed): a `MovieDetails`/`TvDetails` object carries cast,
 * recommendations and similar-title arrays that would otherwise bloat every saved entry.
 */
export function toMediaItem(item: MediaItem): MediaItem {
  const {
    id,
    mediaType,
    imdbId,
    title,
    originalTitle,
    overview,
    posterPath,
    backdropPath,
    releaseDate,
    year,
    rating,
    voteCount,
    popularity,
    genres,
    genreIds,
    originalLanguage,
  } = item;

  return {
    id,
    mediaType,
    title,
    overview,
    ...(imdbId ? { imdbId } : {}),
    ...(originalTitle ? { originalTitle } : {}),
    ...(posterPath ? { posterPath } : {}),
    ...(backdropPath ? { backdropPath } : {}),
    ...(releaseDate ? { releaseDate } : {}),
    ...(year !== undefined ? { year } : {}),
    ...(rating !== undefined ? { rating } : {}),
    ...(voteCount !== undefined ? { voteCount } : {}),
    ...(popularity !== undefined ? { popularity } : {}),
    ...(genres ? { genres } : {}),
    ...(genreIds ? { genreIds } : {}),
    ...(originalLanguage ? { originalLanguage } : {}),
  };
}
