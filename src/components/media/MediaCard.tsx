import { memo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { getMediaTypeLabel } from '@/lib/media';
import { getMediaPath } from '@/lib/routes';
import type { MediaItem } from '@/types/media';
import { PosterImage } from './PosterImage';
import { RatingBadge } from './RatingBadge';
import { WatchlistButton } from './WatchlistButton';

/** Shared with the skeleton so loading and loaded rows have identical geometry (no layout shift). */
export const CARD_WIDTH_CLASSES = 'w-[9.5rem] sm:w-40 md:w-44 lg:w-48 2xl:w-56';

interface MediaCardProps {
  item: MediaItem;
  priority?: boolean;
  /** Fill the parent's width (grids) instead of the fixed row width. */
  fluid?: boolean;
  className?: string;
}

function MediaCardComponent({ item, priority = false, fluid = false, className }: MediaCardProps) {
  const typeLabel = getMediaTypeLabel(item.mediaType);
  const accessibleName = [
    item.title,
    item.year,
    typeLabel,
    item.rating ? `rated ${item.rating.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <article
      className={cn(
        'group/card relative',
        fluid ? 'w-full' : `shrink-0 ${CARD_WIDTH_CLASSES}`,
        className,
      )}
    >
      <Link to={getMediaPath(item)} aria-label={accessibleName} className="block rounded-xl">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-raised ring-1 ring-line transition duration-300 ease-out group-hover/card:-translate-y-1 group-hover/card:shadow-2xl group-hover/card:shadow-black/60 group-hover/card:ring-white/25">
          <PosterImage item={item} priority={priority} />

          <span
            aria-hidden="true"
            className="absolute top-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-fg uppercase backdrop-blur-sm"
          >
            {typeLabel}
          </span>

          {/* Quick details: revealed on hover (pointer devices) and on keyboard focus. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 opacity-0 transition-opacity duration-300 group-focus-within/card:opacity-100 group-hover/card:opacity-100"
          >
            <p className="line-clamp-5 text-xs leading-snug text-fg/90">
              {item.overview || 'No overview available yet.'}
            </p>
          </div>
        </div>

        <div className="mt-2.5 space-y-0.5 px-0.5" aria-hidden="true">
          <h3 className="truncate text-sm font-medium text-fg">{item.title}</h3>
          <p className="flex items-center gap-2 text-xs text-muted">
            <span>{item.year ?? 'TBA'}</span>
            <RatingBadge rating={item.rating} />
          </p>
        </div>
      </Link>

      {/* A sibling of the link, not nested inside it, so this stays a single interactive control. */}
      <WatchlistButton item={item} variant="icon" className="absolute top-2 right-2 z-10" />
    </article>
  );
}

export const MediaCard = memo(MediaCardComponent);
