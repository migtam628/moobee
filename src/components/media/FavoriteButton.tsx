import { Heart } from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';
import { cn } from '@/lib/cn';
import type { MediaItem } from '@/types/media';

interface FavoriteButtonProps {
  item: MediaItem;
  /** `sm` is the compact size used in the player page's action row. */
  size?: 'md' | 'sm';
  className?: string;
}

/** Toggles `item` as a favorite. A labelled button, used on detail pages. */
export function FavoriteButton({ item, size = 'md', className }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useLibrary();
  const saved = isFavorite(item);

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => {
        toggleFavorite(item);
      }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-white/10 text-sm font-semibold text-fg transition hover:bg-white/15',
        size === 'sm' ? 'px-4 py-2' : 'px-6 py-3',
        className,
      )}
    >
      <Heart aria-hidden="true" className={cn('size-4', saved && 'fill-danger text-danger')} />
      {saved ? 'Favorited' : 'Favorite'}
    </button>
  );
}
