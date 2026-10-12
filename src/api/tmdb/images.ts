import { env } from '@/config/env';

/**
 * TMDB image URL helpers. Components never concatenate image URLs themselves.
 *
 * Every helper returns `undefined` for a missing path so callers can render a placeholder.
 * Paths are validated before being appended to the CDN base, so an unexpected value from the
 * API (for example one containing `../` or a full external URL) can never redirect an <img>.
 */

export const POSTER_SIZES = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'] as const;
export const BACKDROP_SIZES = ['w300', 'w780', 'w1280', 'original'] as const;
export const PROFILE_SIZES = ['w45', 'w185', 'h632', 'original'] as const;
export const LOGO_SIZES = ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'] as const;
/** Episode thumbnails. TMDB calls these "stills". */
export const STILL_SIZES = ['w92', 'w185', 'w300', 'original'] as const;

export type PosterSize = (typeof POSTER_SIZES)[number];
export type BackdropSize = (typeof BACKDROP_SIZES)[number];
export type ProfileSize = (typeof PROFILE_SIZES)[number];
export type LogoSize = (typeof LOGO_SIZES)[number];
export type StillSize = (typeof STILL_SIZES)[number];

/** Sizes expressed as a width, usable as `srcset` descriptors. */
type WidthSize = `w${number}`;

/** TMDB image paths look like `/kqjL17yufvn9OVLyXYpvtyrFfak.jpg`. */
const SAFE_IMAGE_PATH = /^\/[A-Za-z0-9._-]+$/;

const widthOf = (size: WidthSize): number => Number(size.slice(1));

export function createImageHelpers(baseUrl: string) {
  const cdn = baseUrl.replace(/\/+$/, '');

  function buildUrl(size: string, path: string | null | undefined): string | undefined {
    if (!path || !SAFE_IMAGE_PATH.test(path)) return undefined;
    return `${cdn}/${size}${path}`;
  }

  function buildSrcSet(
    sizes: readonly WidthSize[],
    path: string | null | undefined,
  ): string | undefined {
    if (!path || !SAFE_IMAGE_PATH.test(path)) return undefined;
    return sizes.map((size) => `${cdn}/${size}${path} ${widthOf(size)}w`).join(', ');
  }

  return {
    getPosterUrl: (path: string | null | undefined, size: PosterSize = 'w342') =>
      buildUrl(size, path),
    getBackdropUrl: (path: string | null | undefined, size: BackdropSize = 'w1280') =>
      buildUrl(size, path),
    getProfileUrl: (path: string | null | undefined, size: ProfileSize = 'w185') =>
      buildUrl(size, path),
    getLogoUrl: (path: string | null | undefined, size: LogoSize = 'w185') => buildUrl(size, path),
    getStillUrl: (path: string | null | undefined, size: StillSize = 'w300') =>
      buildUrl(size, path),

    /** `srcset` string for responsive posters, e.g. `…/w185/x.jpg 185w, …/w342/x.jpg 342w`. */
    getPosterSrcSet: (
      path: string | null | undefined,
      sizes: readonly ('w154' | 'w185' | 'w342' | 'w500' | 'w780')[] = ['w185', 'w342', 'w500'],
    ) => buildSrcSet(sizes, path),
    /** `srcset` string for responsive backdrops. */
    getBackdropSrcSet: (
      path: string | null | undefined,
      sizes: readonly ('w300' | 'w780' | 'w1280')[] = ['w780', 'w1280'],
    ) => buildSrcSet(sizes, path),
  };
}

const helpers = createImageHelpers(env.tmdbImageBaseUrl);

export const {
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  getLogoUrl,
  getStillUrl,
  getPosterSrcSet,
  getBackdropSrcSet,
} = helpers;
