import type { PlaybackProvider, PlaybackRequest } from './types';

/**
 * A `PlaybackProvider` for any embed source that follows the common iframe-embed URL
 * convention: `{base}/movie/{id}` for movies, `{base}/tv/{id}/{season}/{episode}` for TV, with
 * `autoPlay=true` appended when autoplay is requested. This is the shape most third-party embed
 * players use.
 *
 * `baseUrl` is the only thing that changes when a real, authorized provider is wired in — see
 * `authorizedProvider.ts`. If that provider's URL convention turns out to differ (a different
 * path shape, a different autoplay parameter name/casing, IMDb ids instead of TMDB ids, ...),
 * adjust `buildPath`/`buildUrl` below; nothing outside this file needs to change either way,
 * since everything else talks to the registry, never to a provider directly.
 */
export interface EmbedProviderOptions {
  id?: string;
  name?: string;
}

function buildPath(request: PlaybackRequest): string | null {
  if (request.mediaType === 'movie') return `/movie/${request.tmdbId}`;
  if (request.season === undefined || request.episode === undefined) return null;
  return `/tv/${request.tmdbId}/${request.season}/${request.episode}`;
}

export function createEmbedProvider(
  baseUrl: string,
  { id = 'embed', name = 'Playback provider' }: EmbedProviderOptions = {},
): PlaybackProvider {
  return {
    id,
    name,
    supports(request) {
      return buildPath(request) !== null;
    },
    getPlaybackUrl(request) {
      const path = buildPath(request);
      if (path === null) return null;
      const url = new URL(`${baseUrl}${path}`);
      if (request.autoplay) url.searchParams.set('autoPlay', 'true');
      return url.toString();
    },
  };
}
