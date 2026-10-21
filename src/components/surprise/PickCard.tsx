import { Shuffle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WatchlistButton } from '@/components/media/WatchlistButton';
import { PosterImage } from '@/components/media/PosterImage';
import { RatingBadge } from '@/components/media/RatingBadge';
import { getMediaTypeLabel } from '@/lib/media';
import { getMediaPath } from '@/lib/routes';
import type { MediaItem } from '@/types/media';

interface PickCardProps {
  item: MediaItem;
  /** Why the AI chose it. Absent for random picks. */
  reason?: string | undefined;
  /** Replaces this pick with another. Absent (or disabled) when the pool has nothing left. */
  onSwap?: (() => void) | undefined;
  canSwap: boolean;
}

/** One pick: poster, title, a line of facts, the AI's reason when there is one, and what to do next. */
export function PickCard({ item, reason, onSwap, canSwap }: PickCardProps) {
  const href = getMediaPath(item);
  const facts = [
    getMediaTypeLabel(item.mediaType),
    item.year === undefined ? undefined : String(item.year),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="flex w-64 max-w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="relative aspect-[2/3] bg-raised">
        <Link to={href} aria-label={`Open ${item.title}`} className="block size-full">
          <PosterImage item={item} />
        </Link>
        <WatchlistButton item={item} variant="icon" className="absolute top-2 right-2" />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h2 className="text-base leading-snug font-semibold text-balance text-fg">
            <Link to={href} className="hover:underline">
              {item.title}
            </Link>
          </h2>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted">
            <span>{facts}</span>
            <RatingBadge rating={item.rating} />
          </p>
        </div>

        {reason ? (
          <p className="flex gap-2 rounded-lg bg-accent/10 p-2.5 text-sm leading-snug text-fg/90">
            <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>{reason}</span>
          </p>
        ) : item.overview ? (
          <p className="line-clamp-3 text-sm leading-snug text-muted">{item.overview}</p>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Link
            to={href}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong"
          >
            Details
          </Link>
          {onSwap ? (
            <button
              type="button"
              onClick={onSwap}
              disabled={!canSwap}
              aria-label={`Swap ${item.title} for another pick`}
              title="Swap for another pick"
              className="grid size-9 place-items-center rounded-full bg-white/10 text-fg transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Shuffle aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
