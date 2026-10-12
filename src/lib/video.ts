/**
 * External video URLs are built from validated ids only, never from strings supplied by an API,
 * so a malformed or malicious value can't inject a different host, path or query.
 */

const YOUTUBE_KEY = /^[A-Za-z0-9_-]{6,32}$/;

/** Privacy-enhanced YouTube embed URL, or undefined if the key is not a plain YouTube id. */
export function getYouTubeEmbedUrl(key: string, { autoplay = true } = {}): string | undefined {
  if (!YOUTUBE_KEY.test(key)) return undefined;
  const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
  if (autoplay) params.set('autoplay', '1');
  return `https://www.youtube-nocookie.com/embed/${key}?${params.toString()}`;
}
