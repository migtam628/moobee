import { describe, expect, it } from 'vitest';
import { getSafeExternalUrl } from './url';

const HOSTS = ['www.themoviedb.org'] as const;

describe('getSafeExternalUrl', () => {
  it('accepts https URLs on an allowed host', () => {
    expect(getSafeExternalUrl('https://www.themoviedb.org/movie/1/watch', HOSTS)).toBe(
      'https://www.themoviedb.org/movie/1/watch',
    );
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://www.themoviedb.org/movie/1',
    'https://evil.example/movie/1',
    'https://www.themoviedb.org.evil.example/',
    'https://evil.example/?u=https://www.themoviedb.org/',
    '//www.themoviedb.org/movie/1',
    'not a url',
    '',
  ])('rejects %j', (value) => {
    expect(getSafeExternalUrl(value, HOSTS)).toBeUndefined();
  });

  it('rejects missing values', () => {
    expect(getSafeExternalUrl(undefined, HOSTS)).toBeUndefined();
    expect(getSafeExternalUrl(null, HOSTS)).toBeUndefined();
  });

  it('accepts http only for an allowlisted loopback host', () => {
    expect(getSafeExternalUrl('http://127.0.0.1:8080/movie/550', ['127.0.0.1'])).toBe(
      'http://127.0.0.1:8080/movie/550',
    );
    expect(getSafeExternalUrl('http://localhost:8080/tv/1/1/1', ['localhost'])).toBe(
      'http://localhost:8080/tv/1/1/1',
    );
  });

  it('rejects http loopback when that host is not allowlisted, and rejects LAN http', () => {
    expect(getSafeExternalUrl('http://127.0.0.1:8080/movie/550', HOSTS)).toBeUndefined();
    expect(getSafeExternalUrl('http://192.168.1.20/movie/550', ['192.168.1.20'])).toBeUndefined();
  });
});
