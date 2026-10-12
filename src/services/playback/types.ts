import type { MediaType } from '@/types/media';

/**
 * A normalized ask for "give me somewhere to play this". Built from the app's own `MediaItem`
 * fields, never from a raw TMDB or provider response, so a provider never needs to know how the
 * metadata was fetched.
 */
export interface PlaybackRequest {
  mediaType: MediaType;
  tmdbId: number;
  imdbId?: string;
  /** TV only. */
  season?: number;
  /** TV only. */
  episode?: number;
  autoplay?: boolean;
}

/**
 * A single playback source. `getPlaybackUrl` returning `null` means "this provider was asked for
 * something it turns out it can't serve" (as distinct from `supports` returning `false`, which
 * means "don't even ask me").
 */
export interface PlaybackProvider {
  /** Stable identifier, e.g. for logging or a future provider-preference setting. */
  id: string;
  /** Shown in the UI when more than one provider is available. */
  name: string;
  supports(request: PlaybackRequest): boolean;
  getPlaybackUrl(request: PlaybackRequest): string | null;
}
