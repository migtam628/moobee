import { describe, expect, it } from 'vitest';
import { EnvError, parseEnv } from './env';

describe('parseEnv', () => {
  it('applies safe defaults: proxy transport, official CDN, no API key', () => {
    expect(parseEnv({})).toEqual({
      tmdbProxyUrl: '/api/tmdb',
      tmdbApiBaseUrl: 'https://api.themoviedb.org/3',
      tmdbImageBaseUrl: 'https://image.tmdb.org/t/p',
      tmdbLanguage: 'en-US',
      tmdbRegion: 'US',
      tmdbApiKey: undefined,
      playbackProviderBaseUrl: undefined,
    });
  });

  it('treats empty values from a half-filled .env as unset', () => {
    const env = parseEnv({
      VITE_TMDB_API_KEY: '',
      VITE_TMDB_PROXY_URL: '  ',
      VITE_TMDB_LANGUAGE: '',
    });
    expect(env.tmdbApiKey).toBeUndefined();
    expect(env.tmdbProxyUrl).toBe('/api/tmdb');
    expect(env.tmdbLanguage).toBe('en-US');
  });

  it('strips trailing slashes so URLs can be joined predictably', () => {
    const env = parseEnv({
      VITE_TMDB_PROXY_URL: 'https://api.example.com/tmdb///',
      VITE_TMDB_IMAGE_BASE_URL: 'https://img.example.com/t/p/',
    });
    expect(env.tmdbProxyUrl).toBe('https://api.example.com/tmdb');
    expect(env.tmdbImageBaseUrl).toBe('https://img.example.com/t/p');
  });

  it('accepts overrides and the opt-in dev API key', () => {
    const env = parseEnv({ VITE_TMDB_API_KEY: ' key123 ', VITE_TMDB_LANGUAGE: 'es-MX' });
    expect(env.tmdbApiKey).toBe('key123');
    expect(env.tmdbLanguage).toBe('es-MX');
  });

  it.each(['javascript:alert(1)', 'data:text/html,hi', 'ftp://example.com', 'relative/path'])(
    'rejects an unsafe or malformed URL: %s',
    (value) => {
      expect(() => parseEnv({ VITE_TMDB_IMAGE_BASE_URL: value })).toThrow(EnvError);
    },
  );

  it('normalizes the region to an upper-case country code', () => {
    expect(parseEnv({ VITE_TMDB_REGION: 'mx' }).tmdbRegion).toBe('MX');
  });

  it.each(['USA', 'U', '12', 'U$'])('rejects a malformed region: %s', (value) => {
    expect(() => parseEnv({ VITE_TMDB_REGION: value })).toThrow(EnvError);
  });

  it('leaves the playback provider base URL unset by default', () => {
    expect(parseEnv({}).playbackProviderBaseUrl).toBeUndefined();
  });

  it('accepts and trims an https playback provider base URL', () => {
    const env = parseEnv({ VITE_PLAYBACK_PROVIDER_BASE_URL: 'https://player.example.com///' });
    expect(env.playbackProviderBaseUrl).toBe('https://player.example.com');
  });

  it.each(['http://127.0.0.1:8080///', 'http://localhost:8080/'])(
    'accepts http playback only on loopback: %s',
    (value) => {
      const env = parseEnv({ VITE_PLAYBACK_PROVIDER_BASE_URL: value });
      expect(env.playbackProviderBaseUrl).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):8080$/);
    },
  );

  it.each([
    'http://player.example.com',
    'http://192.168.1.20:8080',
    'http://10.0.0.5',
    'http://localhost.example.com',
    'javascript:alert(1)',
    'player.example.com',
  ])('rejects a non-loopback or unsafe playback provider base URL: %s', (value) => {
    expect(() => parseEnv({ VITE_PLAYBACK_PROVIDER_BASE_URL: value })).toThrow(EnvError);
  });
});
