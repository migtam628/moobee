import { ChevronLeft, ChevronRight, Film } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { getMediaKey } from '@/lib/media';
import type { MediaItem } from '@/types/media';
import { MediaCard } from './MediaCard';
import { MediaRowSkeleton } from './MediaSkeletons';

export interface MediaRowProps {
  title: string;
  status: 'loading' | 'error' | 'success';
  items?: readonly MediaItem[] | undefined;
  error?: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  emptyMessage?: string;
  /** Marks the first N posters as eager (above-the-fold rows only). */
  eagerCount?: number;
}

/** Tracks whether a horizontal scroller can move further in each direction. */
function useScrollEdges(itemCount: number) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ canScrollLeft: false, canScrollRight: false });

  const update = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) return;
    const maxScroll = element.scrollWidth - element.clientWidth;
    setEdges({
      canScrollLeft: element.scrollLeft > 4,
      canScrollRight: element.scrollLeft < maxScroll - 4,
    });
  }, []);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [update, itemCount]);

  return { scrollerRef, ...edges, update };
}

export function MediaRow({
  title,
  status,
  items,
  error,
  onRetry,
  isRetrying,
  emptyMessage = 'Nothing to show here right now.',
  eagerCount = 0,
}: MediaRowProps) {
  const headingId = useId();
  const itemCount = items?.length ?? 0;
  const { scrollerRef, canScrollLeft, canScrollRight, update } = useScrollEdges(itemCount);

  const scrollByPage = (direction: -1 | 1) => {
    const element = scrollerRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: 'smooth' });
  };

  const showControls = status === 'success' && itemCount > 0;

  return (
    <section aria-labelledby={headingId} className="py-3 sm:py-4">
      <div className="mb-3 flex page-gutter items-center justify-between gap-4">
        <h2 id={headingId} className="text-lg font-semibold tracking-tight text-fg sm:text-xl">
          {title}
        </h2>

        {showControls ? (
          <div className="hidden gap-2 md:flex">
            <button
              type="button"
              aria-label={`Scroll ${title} left`}
              disabled={!canScrollLeft}
              onClick={() => {
                scrollByPage(-1);
              }}
              className="grid size-9 place-items-center rounded-full bg-white/8 text-fg transition hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-white/8"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              aria-label={`Scroll ${title} right`}
              disabled={!canScrollRight}
              onClick={() => {
                scrollByPage(1);
              }}
              className="grid size-9 place-items-center rounded-full bg-white/8 text-fg transition hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-white/8"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </div>
        ) : null}
      </div>

      {status === 'loading' ? <MediaRowSkeleton /> : null}

      {status === 'error' ? (
        <div className="page-gutter">
          <ErrorState
            compact
            title={`Couldn't load ${title}`}
            error={error}
            {...(onRetry ? { onRetry } : {})}
            {...(isRetrying === undefined ? {} : { isRetrying })}
          />
        </div>
      ) : null}

      {status === 'success' && itemCount === 0 ? (
        <div className="page-gutter">
          <EmptyState
            compact
            icon={<Film className="size-6" />}
            title="Nothing here yet"
            description={emptyMessage}
          />
        </div>
      ) : null}

      {showControls && items ? (
        <ul
          ref={scrollerRef}
          onScroll={update}
          className="scrollbar-none flex snap-x snap-proximity page-gutter gap-3 overflow-x-auto overscroll-x-contain pt-1 pb-3 sm:gap-4"
        >
          {items.map((item, index) => (
            <li key={getMediaKey(item)} className="snap-start">
              <MediaCard item={item} priority={index < eagerCount} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
