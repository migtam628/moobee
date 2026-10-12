import { describe, expect, it } from 'vitest';
import { createEmbedProvider } from './embedProvider';
import type { PlaybackRequest } from './types';

const request = (overrides: Partial<PlaybackRequest> = {}): PlaybackRequest => ({
  mediaType: 'movie',
  tmdbId: 550,
  ...overrides,
});

describe('createEmbedProvider', () => {
  it('builds a movie URL as {base}/movie/{tmdbId}', () => {
    const provider = createEmbedProvider('https://player.test');
    expect(provider.getPlaybackUrl(request())).toBe('https://player.test/movie/550');
  });

  it('builds a TV URL as {base}/tv/{tmdbId}/{season}/{episode}', () => {
    const provider = createEmbedProvider('https://player.test');
    expect(
      provider.getPlaybackUrl(request({ mediaType: 'tv', tmdbId: 1396, season: 1, episode: 2 })),
    ).toBe('https://player.test/tv/1396/1/2');
  });

  it('appends autoPlay=true only when autoplay is requested', () => {
    const provider = createEmbedProvider('https://player.test');
    expect(provider.getPlaybackUrl(request({ autoplay: true }))).toBe(
      'https://player.test/movie/550?autoPlay=true',
    );
    expect(provider.getPlaybackUrl(request({ autoplay: false }))).toBe(
      'https://player.test/movie/550',
    );
  });

  it('supports any movie request', () => {
    const provider = createEmbedProvider('https://player.test');
    expect(provider.supports(request())).toBe(true);
  });

  it('does not support a TV request missing season or episode', () => {
    const provider = createEmbedProvider('https://player.test');
    expect(provider.supports(request({ mediaType: 'tv', season: 1 }))).toBe(false);
    expect(provider.supports(request({ mediaType: 'tv', episode: 1 }))).toBe(false);
    expect(provider.supports(request({ mediaType: 'tv' }))).toBe(false);
  });

  it('returns null from getPlaybackUrl for a TV request missing season or episode', () => {
    const provider = createEmbedProvider('https://player.test');
    expect(provider.getPlaybackUrl(request({ mediaType: 'tv' }))).toBeNull();
  });

  it('supports a TV request once both season and episode are present', () => {
    const provider = createEmbedProvider('https://player.test');
    expect(provider.supports(request({ mediaType: 'tv', season: 1, episode: 1 }))).toBe(true);
  });

  it('defaults id/name but accepts overrides', () => {
    expect(createEmbedProvider('https://player.test')).toMatchObject({
      id: 'embed',
      name: 'Playback provider',
    });
    expect(
      createEmbedProvider('https://player.test', { id: 'acme', name: 'Acme Player' }),
    ).toMatchObject({ id: 'acme', name: 'Acme Player' });
  });
});
