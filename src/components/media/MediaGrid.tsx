import { getMediaKey } from '@/lib/media';
import type { MediaItem } from '@/types/media';
import { MediaCard } from './MediaCard';
import { Skeleton } from '@/components/ui/LoadingSkeleton';

/** Column sizing shared by the grid and its skeleton so loading and loaded states line up. */
const GRID_CLASSES =
  'grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-3 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] sm:gap-x-4 sm:gap-y-8 lg:grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))]';

interface MediaGridProps {
  items: readonly MediaItem[];
  /** Marks the first N posters as eager (above-the-fold only). */
  eagerCount?: number;
}

/** Wrapping grid of cards, for result pages where a horizontal row would hide content. */
export function MediaGrid({ items, eagerCount = 0 }: MediaGridProps) {
  return (
    <ul className={GRID_CLASSES}>
      {items.map((item, index) => (
        <li key={getMediaKey(item)}>
          <MediaCard item={item} fluid priority={index < eagerCount} />
        </li>
      ))}
    </ul>
  );
}

export function MediaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading results" className={GRID_CLASSES}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <Skeleton className="aspect-[2/3] rounded-xl" />
          <Skeleton className="mt-2.5 h-3.5 w-4/5" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
