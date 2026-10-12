import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';
import type { Episode, SeasonSummary } from '@/types/media';

interface EpisodeNavigationProps {
  tvId: number;
  seasonNumber: number;
  /** The current season's episodes, ascending by episode number. */
  episodes: readonly Episode[];
  currentEpisodeNumber: number;
  /** The show's full season list, used to roll over into the next season. */
  seasons: readonly SeasonSummary[];
  className?: string;
}

function findAdjacentSeason(
  seasons: readonly SeasonSummary[],
  seasonNumber: number,
  direction: 'previous' | 'next',
): number | undefined {
  const candidates = seasons
    .map((season) => season.seasonNumber)
    .filter((n) => (direction === 'next' ? n > seasonNumber : n < seasonNumber))
    .sort((a, b) => (direction === 'next' ? a - b : b - a));
  return candidates[0];
}

/**
 * Previous/next controls for the TV player. Stays within the current season when possible;
 * rolling into an adjacent season lands on its first or last-known episode number. There's no
 * guarantee that number exists until its own season data loads, but every TMDB season starts
 * numbering at 1, so "next season, episode 1" is always a safe link.
 */
export function EpisodeNavigation({
  tvId,
  seasonNumber,
  episodes,
  currentEpisodeNumber,
  seasons,
  className,
}: EpisodeNavigationProps) {
  const currentIndex = episodes.findIndex((ep) => ep.episodeNumber === currentEpisodeNumber);
  const previousInSeason = currentIndex > 0 ? episodes[currentIndex - 1] : undefined;
  const nextInSeason =
    currentIndex !== -1 && currentIndex < episodes.length - 1
      ? episodes[currentIndex + 1]
      : undefined;

  const previousHref = previousInSeason
    ? paths.watchTv(tvId, seasonNumber, previousInSeason.episodeNumber)
    : undefined;

  let nextHref: string | undefined;
  if (nextInSeason) {
    nextHref = paths.watchTv(tvId, seasonNumber, nextInSeason.episodeNumber);
  } else {
    const nextSeason = findAdjacentSeason(seasons, seasonNumber, 'next');
    nextHref = nextSeason !== undefined ? paths.watchTv(tvId, nextSeason, 1) : undefined;
  }

  const buttonClasses = (enabled: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition',
      enabled
        ? 'bg-white/10 text-fg hover:bg-white/15'
        : 'cursor-not-allowed bg-white/5 text-muted/50',
    );

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      {previousHref ? (
        <Link to={previousHref} className={buttonClasses(true)}>
          <ChevronLeft aria-hidden="true" className="size-4" />
          Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={buttonClasses(false)}>
          <ChevronLeft aria-hidden="true" className="size-4" />
          Previous
        </span>
      )}

      {nextHref ? (
        <Link to={nextHref} className={buttonClasses(true)}>
          Next episode
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span aria-disabled="true" className={buttonClasses(false)}>
          Next episode
          <ChevronRight aria-hidden="true" className="size-4" />
        </span>
      )}
    </div>
  );
}
