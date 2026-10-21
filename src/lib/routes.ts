import type { MediaDetails, MediaItem } from '@/types/media';

/** Central list of app URLs so paths are never hand-built in components. */
export const paths = {
  home: '/',
  movies: '/movies',
  tv: '/tv',
  anime: '/anime',
  search: '/search',
  searchFor: (query: string) => `/search?q=${encodeURIComponent(query)}`,
  movie: (id: number) => `/movie/${id}`,
  tvShow: (id: number) => `/tv/${id}`,
  tvSeason: (id: number, seasonNumber: number) => `/tv/${id}/season/${seasonNumber}`,
  watchMovie: (id: number) => `/watch/movie/${id}`,
  watchTv: (id: number, seasonNumber: number, episodeNumber: number) =>
    `/watch/tv/${id}/${seasonNumber}/${episodeNumber}`,
  watchlist: '/watchlist',
  surprise: '/surprise',
  settings: '/settings',
  /** Not linked from the public nav. Password-protected upload into MooBee Stream. */
  upload: '/upload',
  person: (id: number) => `/person/${id}`,
} as const;

export const getMediaPath = (item: Pick<MediaItem, 'id' | 'mediaType'>): string =>
  item.mediaType === 'movie' ? paths.movie(item.id) : paths.tvShow(item.id);

/**
 * Where a "Play" button for `details` should send the viewer. For a movie this is always
 * knowable; for a show it's the first episode of its first regular season (falling back to
 * season 0 / "Specials" for the rare show that only has one). Undefined only when a show has no
 * season data at all.
 */
export function getWatchPath(details: MediaDetails): string | undefined {
  if (details.mediaType === 'movie') return paths.watchMovie(details.id);
  const firstSeason =
    details.seasons.find((season) => season.seasonNumber > 0) ?? details.seasons[0];
  return firstSeason ? paths.watchTv(details.id, firstSeason.seasonNumber, 1) : undefined;
}

/**
 * Parses a `:id` route param. Only plain positive integers are accepted, so `12abc`, `1e3`,
 * `-5`, ` 7` and absurdly large values never reach the API. Returns undefined when invalid.
 */
export function parseRouteId(param: string | undefined): number | undefined {
  if (!param || !/^[1-9]\d{0,9}$/.test(param)) return undefined;
  return Number(param);
}

/**
 * Parses a `:season` route param. Unlike `parseRouteId`, `0` is valid — TMDB's convention for
 * "Specials" — so this only rejects negative numbers, decimals and other non-numeric input.
 */
export function parseSeasonNumber(param: string | undefined): number | undefined {
  if (!param || !/^\d{1,9}$/.test(param)) return undefined;
  return Number(param);
}
