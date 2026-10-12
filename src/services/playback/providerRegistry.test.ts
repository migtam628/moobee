import { beforeEach, describe, expect, it, vi } from 'vitest';
import { playbackProviderRegistry } from './providerRegistry';
import type { PlaybackProvider, PlaybackRequest } from './types';

// `playbackProviderRegistry` is a module-level singleton with no reset method (there's no
// production need to unregister a provider), so tests reach into its private list directly to
// start each case from empty rather than leaking providers across tests.
const registry = playbackProviderRegistry as unknown as { providers: PlaybackProvider[] };

beforeEach(() => {
  registry.providers.length = 0;
});

const request = (overrides: Partial<PlaybackRequest> = {}): PlaybackRequest => ({
  mediaType: 'movie',
  tmdbId: 550,
  ...overrides,
});

describe('playbackProviderRegistry', () => {
  it('has no providers registered by default', () => {
    expect(playbackProviderRegistry.hasAnyProvider()).toBe(false);
    expect(playbackProviderRegistry.getPlaybackUrl(request())).toBeNull();
  });

  it('resolves a request to the first provider that supports it', () => {
    const movieProvider: PlaybackProvider = {
      id: 'movies',
      name: 'Movies',
      supports: (req) => req.mediaType === 'movie',
      getPlaybackUrl: (req) => `https://player.test/movie/${req.tmdbId}`,
    };
    const tvProvider: PlaybackProvider = {
      id: 'tv',
      name: 'TV',
      supports: (req) => req.mediaType === 'tv',
      getPlaybackUrl: (req) => `https://player.test/tv/${req.tmdbId}/${req.season}/${req.episode}`,
    };
    playbackProviderRegistry.register(movieProvider);
    playbackProviderRegistry.register(tvProvider);

    expect(playbackProviderRegistry.hasAnyProvider()).toBe(true);
    expect(playbackProviderRegistry.resolve(request())).toBe(movieProvider);
    expect(playbackProviderRegistry.getPlaybackUrl(request())).toBe(
      'https://player.test/movie/550',
    );
    expect(
      playbackProviderRegistry.getPlaybackUrl(
        request({ mediaType: 'tv', tmdbId: 1396, season: 1, episode: 2 }),
      ),
    ).toBe('https://player.test/tv/1396/1/2');
  });

  it('checks providers in registration order and stops at the first match', () => {
    const supports = vi.fn(() => true);
    const first: PlaybackProvider = {
      id: 'first',
      name: 'First',
      supports,
      getPlaybackUrl: () => 'https://player.test/first',
    };
    const second: PlaybackProvider = {
      id: 'second',
      name: 'Second',
      supports: vi.fn(() => true),
      getPlaybackUrl: () => 'https://player.test/second',
    };
    playbackProviderRegistry.register(first);
    playbackProviderRegistry.register(second);

    expect(playbackProviderRegistry.resolve(request())?.id).toBe('first');
    expect(second.supports).not.toHaveBeenCalled();
  });

  it('falls through to the next provider when one declines the request', () => {
    playbackProviderRegistry.register({
      id: 'movies-only',
      name: 'Movies only',
      supports: (req) => req.mediaType === 'movie',
      getPlaybackUrl: () => 'https://player.test/movie',
    });
    playbackProviderRegistry.register({
      id: 'anything',
      name: 'Anything',
      supports: () => true,
      getPlaybackUrl: () => 'https://player.test/anything',
    });

    expect(playbackProviderRegistry.getPlaybackUrl(request({ mediaType: 'tv' }))).toBe(
      'https://player.test/anything',
    );
  });

  it('returns null, not undefined-crashing, when a supporting provider still can’t build a URL', () => {
    playbackProviderRegistry.register({
      id: 'picky',
      name: 'Picky',
      supports: () => true,
      getPlaybackUrl: () => null,
    });
    expect(playbackProviderRegistry.getPlaybackUrl(request())).toBeNull();
  });
});
