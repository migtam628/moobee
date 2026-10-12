import { Clapperboard, Tv } from 'lucide-react';
import { useState } from 'react';
import { getPosterSrcSet, getPosterUrl } from '@/api/tmdb/images';
import type { MediaItem } from '@/types/media';

/** Rendered widths of a card at each breakpoint; keeps the browser from over-fetching. */
const POSTER_SIZES_ATTR =
  '(min-width: 1536px) 224px, (min-width: 1024px) 192px, (min-width: 768px) 176px, (min-width: 640px) 160px, 152px';

interface PosterImageProps {
  item: Pick<MediaItem, 'title' | 'mediaType' | 'posterPath'>;
  /** Set for above-the-fold posters so they are not lazy-loaded. */
  priority?: boolean;
  /**
   * Alt text. Defaults to empty because in cards the poster is decorative (the surrounding link
   * is labelled with the title). Pass real text where the poster stands alone.
   */
  alt?: string;
  /** `sizes` attribute override for posters rendered larger than a card. */
  sizes?: string;
}

/**
 * Poster with graceful degradation: a missing path or a failed load both fall back to a titled
 * placeholder, so a card is never a blank rectangle.
 */
export function PosterImage({
  item,
  priority = false,
  alt = '',
  sizes = POSTER_SIZES_ATTR,
}: PosterImageProps) {
  const [failedPath, setFailedPath] = useState<string | undefined>();
  const src = getPosterUrl(item.posterPath, 'w342');
  const srcSet = getPosterSrcSet(item.posterPath);
  const hasFailed = failedPath !== undefined && failedPath === item.posterPath;

  if (!src || hasFailed) {
    const Icon = item.mediaType === 'movie' ? Clapperboard : Tv;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-raised to-surface p-4 text-center">
        <Icon aria-hidden="true" className="size-8 text-muted" />
        <span className="line-clamp-4 text-sm font-medium text-muted">{item.title}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      {...(srcSet ? { srcSet, sizes } : {})}
      alt={alt}
      width={342}
      height={513}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => {
        setFailedPath(item.posterPath);
      }}
      className="h-full w-full object-cover"
    />
  );
}
