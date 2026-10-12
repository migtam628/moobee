import { Tv } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router-dom';
import { getPosterUrl } from '@/api/tmdb/images';
import { cn } from '@/lib/cn';
import { pluralize } from '@/lib/format';
import { paths } from '@/lib/routes';
import type { SeasonSummary } from '@/types/media';

interface SeasonSelectorProps {
  tvId: number;
  seasons: readonly SeasonSummary[];
  /** Highlights the season currently being viewed, if any. */
  activeSeason?: number;
  className?: string;
}

/**
 * Horizontally scrolling row of a show's seasons, each linking to its `/tv/:id/season/:n` page.
 * Renders nothing when a show has no season data (TMDB omits it for a few edge-case entries).
 */
export function SeasonSelector({ tvId, seasons, activeSeason, className }: SeasonSelectorProps) {
  const headingId = useId();
  if (seasons.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className={cn('py-3 sm:py-4', className)}>
      <h2
        id={headingId}
        className="mb-4 page-gutter text-lg font-semibold tracking-tight text-fg sm:text-xl"
      >
        Seasons
      </h2>
      <ul className="scrollbar-none flex page-gutter gap-4 overflow-x-auto overscroll-x-contain pb-3 sm:gap-5">
        {seasons.map((season) => {
          const isActive = season.seasonNumber === activeSeason;
          const poster = getPosterUrl(season.posterPath, 'w185');
          return (
            <li key={season.id} className="w-28 shrink-0 sm:w-32">
              <Link
                to={paths.tvSeason(tvId, season.seasonNumber)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group block rounded-xl outline-offset-2',
                  isActive && 'pointer-events-none',
                )}
              >
                <div
                  className={cn(
                    'relative aspect-[2/3] overflow-hidden rounded-xl bg-raised ring-1 transition duration-300 ease-out',
                    isActive
                      ? 'ring-2 ring-accent'
                      : 'ring-line group-hover:-translate-y-1 group-hover:ring-white/25',
                  )}
                >
                  {poster ? (
                    <img
                      src={poster}
                      alt=""
                      width={185}
                      height={278}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-raised to-surface p-3 text-center">
                      <Tv aria-hidden="true" className="size-6 text-muted" />
                    </div>
                  )}
                </div>
                <p className="mt-2.5 line-clamp-2 text-sm font-medium text-fg">{season.name}</p>
                {season.episodeCount !== undefined ? (
                  <p className="mt-0.5 text-xs text-muted">
                    {pluralize(season.episodeCount, 'episode')}
                  </p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
