import { describe, expect, it } from 'vitest';
import { createImageHelpers } from './images';

const images = createImageHelpers('https://cdn.example.com/t/p/');

describe('image helpers', () => {
  it('builds sized URLs from a CDN base, tolerating a trailing slash', () => {
    expect(images.getPosterUrl('/abc.jpg', 'w342')).toBe(
      'https://cdn.example.com/t/p/w342/abc.jpg',
    );
    expect(images.getBackdropUrl('/abc.jpg', 'w1280')).toBe(
      'https://cdn.example.com/t/p/w1280/abc.jpg',
    );
    expect(images.getProfileUrl('/abc.jpg', 'h632')).toBe(
      'https://cdn.example.com/t/p/h632/abc.jpg',
    );
    expect(images.getLogoUrl('/abc.png', 'w92')).toBe('https://cdn.example.com/t/p/w92/abc.png');
  });

  it('uses sensible default sizes', () => {
    expect(images.getPosterUrl('/abc.jpg')).toContain('/w342/');
    expect(images.getBackdropUrl('/abc.jpg')).toContain('/w1280/');
    expect(images.getProfileUrl('/abc.jpg')).toContain('/w185/');
    expect(images.getLogoUrl('/abc.png')).toContain('/w185/');
  });

  it.each([undefined, null, ''])('returns undefined for a missing path (%s)', (path) => {
    expect(images.getPosterUrl(path)).toBeUndefined();
    expect(images.getBackdropUrl(path)).toBeUndefined();
    expect(images.getPosterSrcSet(path)).toBeUndefined();
  });

  it.each([
    'no-leading-slash.jpg',
    '/../etc/passwd',
    '/a/b.jpg',
    'https://evil.example.com/x.jpg',
    '//evil.example.com/x.jpg',
    '/x.jpg?token=1',
  ])('rejects unsafe path %s so an API value cannot redirect an <img>', (path) => {
    expect(images.getPosterUrl(path)).toBeUndefined();
    expect(images.getBackdropSrcSet(path)).toBeUndefined();
  });

  it('builds a width-descriptor srcset', () => {
    expect(images.getPosterSrcSet('/abc.jpg')).toBe(
      [
        'https://cdn.example.com/t/p/w185/abc.jpg 185w',
        'https://cdn.example.com/t/p/w342/abc.jpg 342w',
        'https://cdn.example.com/t/p/w500/abc.jpg 500w',
      ].join(', '),
    );
    expect(images.getBackdropSrcSet('/abc.jpg', ['w780', 'w1280'])).toBe(
      'https://cdn.example.com/t/p/w780/abc.jpg 780w, https://cdn.example.com/t/p/w1280/abc.jpg 1280w',
    );
  });
});
