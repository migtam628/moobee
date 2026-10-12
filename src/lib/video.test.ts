import { describe, expect, it } from 'vitest';
import { getYouTubeEmbedUrl } from './video';

describe('getYouTubeEmbedUrl', () => {
  it('builds a privacy-enhanced embed URL', () => {
    const url = new URL(getYouTubeEmbedUrl('SUXWAEX2jlg') ?? '');
    expect(url.origin).toBe('https://www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/SUXWAEX2jlg');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('rel')).toBe('0');
  });

  it('can disable autoplay', () => {
    expect(getYouTubeEmbedUrl('SUXWAEX2jlg', { autoplay: false })).not.toContain('autoplay');
  });

  it.each(['', 'short', '../../etc', 'abc def ghi', 'a'.repeat(40), 'key?x=1', 'key#frag'])(
    'refuses the unsafe key %j',
    (key) => {
      expect(getYouTubeEmbedUrl(key)).toBeUndefined();
    },
  );
});
