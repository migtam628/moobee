import { Clapperboard, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStillUrl } from '@/api/tmdb/images';
import { RatingBadge } from '@/components/media/RatingBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatAirDate, formatRuntime } from '@/lib/format';
import { paths } from '@/lib/routes';
import { playbackProviderRegistry } from '@/services/playback/providerRegistry';
import type { Episode } from '@/types/media';

interface EpisodeRowProps {
  tvId: number;
  seasonNumber: number;
  episode: Episode;
  canPlay: boolean;
}

function EpisodeRow({ tvId, seasonNumber, episode, canPlay }: EpisodeRowProps) {
  const still = getStillUrl(episode.stillPath, 'w300');
  const runtime = formatRuntime(episode.runtimeMinutes);
  const airDate = formatAirDate(episode.airDate);

  return (
    <li className="flex gap-4 rounded-xl p-2 transition hover:bg-white/[0.04] sm:gap-5 sm:p-3">
      <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-raised ring-1 ring-line sm:w-44">
        {still ? (
          <img
            src={still}
            alt=""
            width={300}
            height={169}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center">
            <Clapperboard aria-hidden="true" className="size-6 text-muted" />
          </div>
        )}

        {canPlay ? (
          <Link
            to={paths.watchTv(tvId, seasonNumber, episode.episodeNumber)}
            aria-label={`Play episode ${episode.episodeNumber}, ${episode.name}`}
            className="group/play absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/40 focus-visible:bg-black/40"
          >
            <Play
              aria-hidden="true"
              className="size-8 fill-white text-white opacity-0 transition-opacity group-hover/play:opacity-100 group-focus-visible/play:opacity-100"
            />
          </Link>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-muted tabular-nums">
            {episode.episodeNumber}
          </span>
          <h3 className="truncate text-sm font-medium text-fg sm:text-base">{episode.name}</h3>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {airDate ? <span>{airDate}</span> : null}
          {runtime ? <span>{runtime}</span> : null}
          <RatingBadge rating={episode.rating} />
        </p>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-fg/80 sm:line-clamp-3">
          {episode.overview ?? 'No overview available yet.'}
        </p>
      </div>
    </li>
  );
}

interface EpisodeSelectorProps {
  tvId: number;
  seasonNumber: number;
  episodes: readonly Episode[];
  className?: string;
}

/**
 * Vertical episode list for a season. Each episode only gets a "Play" affordance once a playback
 * provider is registered (see `src/services/playback`) — today that's never, so the list is
 * purely informational.
 */
export function EpisodeSelector({ tvId, seasonNumber, episodes, className }: EpisodeSelectorProps) {
  if (episodes.length === 0) {
    return (
      <EmptyState
        compact
        title="No episodes listed"
        description="TMDB doesn't have episode data for this season yet."
        className={className}
      />
    );
  }

  const canPlay = playbackProviderRegistry.hasAnyProvider();

  return (
    <ul className={className}>
      {episodes.map((episode) => (
        <EpisodeRow
          key={episode.id}
          tvId={tvId}
          seasonNumber={seasonNumber}
          episode={episode}
          canPlay={canPlay}
        />
      ))}
    </ul>
  );
}
