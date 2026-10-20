import { Dices, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBackdropSrcSet, getBackdropUrl } from '@/api/tmdb/images';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/cn';
import { getMediaKey, getMediaTypeLabel } from '@/lib/media';
import { getMediaPath, paths } from '@/lib/routes';
import type { MediaItem } from '@/types/media';
import { RatingBadge } from './RatingBadge';

const ROTATION_INTERVAL_MS = 8000;

interface HeroProps {
  /** Featured titles. Each must have a backdrop (see `pickFeatured`). */
  items: readonly MediaItem[];
  /** Small label above the title, e.g. "Trending this week". */
  eyebrow?: string;
}

export function Hero({ items, eyebrow = 'Trending this week' }: HeroProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const count = items.length;
  const autoRotate = count > 1 && !paused && !reducedMotion;

  useEffect(() => {
    if (!autoRotate) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, ROTATION_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [autoRotate, count]);

  const current = items[index % Math.max(count, 1)];
  if (!current) return null;

  const backdropSrc = getBackdropUrl(current.backdropPath, 'w1280');
  const backdropSrcSet = getBackdropSrcSet(current.backdropPath);
  const typeLabel = getMediaTypeLabel(current.mediaType);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured titles"
      className="relative isolate h-[78svh] max-h-[52rem] min-h-[34rem] w-full overflow-hidden bg-surface"
      onMouseEnter={() => {
        setPaused(true);
      }}
      onMouseLeave={() => {
        setPaused(false);
      }}
      onFocus={() => {
        setPaused(true);
      }}
      onBlur={() => {
        setPaused(false);
      }}
    >
      {backdropSrc ? (
        <img
          key={getMediaKey(current)}
          src={backdropSrc}
          {...(backdropSrcSet ? { srcSet: backdropSrcSet, sizes: '100vw' } : {})}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full animate-fade-in object-cover object-[65%_20%] sm:object-[center_20%]"
        />
      ) : null}

      {/* Legibility scrims: darken the left for text, the bottom to blend into the page, the top for the navbar. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-canvas/90 via-canvas/40 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-canvas via-canvas/30 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-canvas/70 to-transparent"
      />

      <div className="flex h-full page-gutter flex-col justify-end pt-24 pb-14 sm:pb-16 lg:pb-20">
        <div
          key={getMediaKey(current)}
          aria-live={autoRotate ? 'off' : 'polite'}
          className="max-w-2xl animate-fade-up"
        >
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold tracking-wide uppercase sm:text-sm">
            <span className="rounded-full bg-accent px-2.5 py-1 text-accent-fg">{eyebrow}</span>
            <span className="text-fg/80">{typeLabel}</span>
            {current.year ? <span className="text-fg/80">{current.year}</span> : null}
            <RatingBadge rating={current.rating} size="md" />
          </div>

          <h2 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance text-fg drop-shadow-lg sm:text-5xl lg:text-6xl">
            {current.title}
          </h2>

          {current.overview ? (
            <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-fg/80 sm:line-clamp-4 sm:text-base">
              {current.overview}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to={getMediaPath(current)}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong"
            >
              <Info aria-hidden="true" className="size-4" />
              View details
              <span className="sr-only">: {current.title}</span>
            </Link>
            <Link
              to={paths.surprise}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-fg backdrop-blur-sm transition hover:bg-white/15"
            >
              <Dices aria-hidden="true" className="size-4" />
              Surprise me
            </Link>
          </div>
        </div>

        {count > 1 ? (
          <div
            role="group"
            aria-label="Choose featured title"
            className="mt-8 flex items-center gap-1"
          >
            {items.map((item, itemIndex) => {
              const active = itemIndex === index % count;
              return (
                <button
                  key={getMediaKey(item)}
                  type="button"
                  aria-label={`Show ${item.title}`}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => {
                    setIndex(itemIndex);
                  }}
                  className="group grid h-6 place-items-center px-1"
                >
                  <span
                    className={cn(
                      'block h-1 rounded-full transition-all duration-300',
                      active ? 'w-8 bg-accent' : 'w-4 bg-white/30 group-hover:bg-white/60',
                    )}
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
