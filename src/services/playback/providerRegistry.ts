import type { PlaybackProvider, PlaybackRequest } from './types';

/**
 * Central lookup from a `PlaybackRequest` to a playable URL. This is the ONLY thing player pages
 * and components talk to — never a provider, and never a provider-specific URL shape. Swapping,
 * adding or removing a playback source later means changing `authorizedProvider.ts`, not the UI.
 *
 * `authorizedProvider.ts` registers the embed provider when a base URL is configured.
 */
class PlaybackProviderRegistry {
  private readonly providers: PlaybackProvider[] = [];

  register(provider: PlaybackProvider): void {
    this.providers.push(provider);
  }

  /** True once at least one provider is registered. Gates "Play" affordances in the UI. */
  hasAnyProvider(): boolean {
    return this.providers.length > 0;
  }

  /** The first registered provider willing to handle `request`, checked in registration order. */
  resolve(request: PlaybackRequest): PlaybackProvider | undefined {
    return this.providers.find((provider) => provider.supports(request));
  }

  /** A playback URL for `request`, or `null` when no registered provider can serve it. */
  getPlaybackUrl(request: PlaybackRequest): string | null {
    return this.resolve(request)?.getPlaybackUrl(request) ?? null;
  }
}

export const playbackProviderRegistry = new PlaybackProviderRegistry();
