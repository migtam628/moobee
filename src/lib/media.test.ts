import { describe, expect, it } from 'vitest';
import { mediaItem } from '@/test/fixtures';
import { excludeMedia, uniqueMedia } from './media';

describe('excludeMedia', () => {
  it('removes items with the same type and id, but not the same id of another type', () => {
    const movieOne = mediaItem({ id: 1, mediaType: 'movie' });
    const showOne = mediaItem({ id: 1, mediaType: 'tv' });
    const movieTwo = mediaItem({ id: 2, mediaType: 'movie' });

    expect(excludeMedia([movieOne, showOne, movieTwo], [movieOne])).toEqual([showOne, movieTwo]);
  });
});

describe('uniqueMedia', () => {
  it('keeps the first occurrence and the original order', () => {
    const a = mediaItem({ id: 1 });
    const b = mediaItem({ id: 2 });
    expect(uniqueMedia([a, b, { ...a }])).toEqual([a, b]);
  });
});
