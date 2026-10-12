import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { cn } from '@/lib/cn';
import type { MediaItem } from '@/types/media';

interface WatchlistButtonProps {
  item: MediaItem;
  /** `pill`: labelled button for a detail page. `icon`: compact quick action for a card. */
  variant?: 'pill' | 'icon';
  className?: string;
}

/** Toggles `item` in the watchlist. Reflects and updates the shared library store directly. */
export function WatchlistButton({ item, variant = 'pill', className }: WatchlistButtonProps) {
  const { isInWatchlist, toggleWatchlist } = useLibrary();
  const saved = isInWatchlist(item);
  const Icon = saved ? BookmarkCheck : Bookmark;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Cards render this as a sibling of the card's link, but stop propagation in case that ever
    // changes — a watchlist toggle should never also trigger navigation.
    event.preventDefault();
    event.stopPropagation();
    toggleWatchlist(item);
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        aria-pressed={saved}
        aria-label={`${saved ? 'Remove from' : 'Add to'} Watchlist: ${item.title}`}
        onClick={handleClick}
        className={cn(
          'grid size-8 place-items-center rounded-full bg-black/70 text-fg backdrop-blur-sm transition hover:bg-black/85',
          className,
        )}
      >
        <Icon aria-hidden="true" className={cn('size-4', saved && 'fill-accent text-accent')} />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-fg transition hover:bg-white/15',
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn('size-4', saved && 'fill-accent text-accent')} />
      {saved ? 'In Watchlist' : 'Add to Watchlist'}
    </button>
  );
}
