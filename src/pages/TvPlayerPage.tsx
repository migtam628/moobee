import { Compass } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { TmdbError } from '@/api/tmdb';
import { AutoplayToggle } from '@/components/player/AutoplayToggle';
import { EpisodeNavigation } from '@/components/player/EpisodeNavigation';
import { PlaybackUnavailable } from '@/components/player/PlaybackUnavailable';
import { PlayerHeader } from '@/components/player/PlayerHeader';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { useAutoplayPreference } from '@/hooks/useAutoplayPreference';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useTvDetails, useTvSeason } from '@/hooks/useMediaQueries';
import { parseRouteId, parseSeasonNumber, paths } from '@/lib/routes';
import { playbackProviderRegistry } from '@/services/playback/providerRegistry';

function NotFound() {
  return (
    <div className="page-gutter pt-28">
      <EmptyState
        icon={<Compass className="size-10" />}
        title="We couldn't find that episode"
        description="It may have been removed, or the link may be wrong."
        action={
          <Link
            to={paths.home}
            className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong"
          >
            Back to home
          </Link>
        }
      />
    </div>
  );
}

function PlayerSkeleton() {
  return (
    <div role="status" aria-label="Loading player" className="page-gutter pt-24 pb-10 sm:pt-32">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-4 h-7 w-1/2" />
      <Skeleton className="mt-6 aspect-video w-full rounded-xl" />
    </div>
  );
}

/**
 * `/watch/tv/:id/:season/:episode`. Two queries feed this page — the show (for its title and
 * season list) and the season (for the episode itself and its neighbours) — but, like the movie
 * player, it only ever asks the playback registry for a URL; it never builds one.
 */
export function TvPlayerPage() {
  const { id: idParam, season: seasonParam, episode: episodeParam } = useParams();
  const tvId = parseRouteId(idParam);
  const seasonNumber = parseSeasonNumber(seasonParam);
  const episodeNumber = parseRouteId(episodeParam);
  const isValidRoute =
    tvId !== undefined && seasonNumber !== undefined && episodeNumber !== undefined;

  // Both gated on the whole route, not just their own params: an invalid id/season/episode means
  // this page renders `NotFound` regardless, so there's no reason to fetch anything.
  const showQuery = useTvDetails(isValidRoute ? tvId : undefined);
  const seasonQuery = useTvSeason(
    isValidRoute ? tvId : undefined,
    isValidRoute ? seasonNumber : undefined,
  );
  const [autoplay, setAutoplay] = useAutoplayPreference();

  const show = showQuery.data;
  const season = seasonQuery.data;
  const episode = season?.episodes.find((ep) => ep.episodeNumber === episodeNumber);

  useDocumentTitle(
    show && episode ? `Watch ${show.title} — S${seasonNumber} E${episodeNumber}` : show?.title,
  );

  if (!isValidRoute) return <NotFound />;

  const isNotFoundError = (error: unknown) =>
    error instanceof TmdbError && error.kind === 'not_found';

  if (showQuery.isError && isNotFoundError(showQuery.error)) return <NotFound />;
  if (seasonQuery.isError && isNotFoundError(seasonQuery.error)) return <NotFound />;

  if (showQuery.isError || seasonQuery.isError) {
    return (
      <div className="page-gutter pt-24 sm:pt-32">
        <ErrorState
          title="Couldn't load this episode"
          error={showQuery.error ?? seasonQuery.error}
          onRetry={() => {
            void showQuery.refetch();
            void seasonQuery.refetch();
          }}
          isRetrying={showQuery.isFetching || seasonQuery.isFetching}
        />
      </div>
    );
  }

  if (!show || !season) return <PlayerSkeleton />;
  // The season loaded but this episode number isn't in it (e.g. a stale/guessed URL).
  if (!episode) return <NotFound />;

  const playbackUrl = playbackProviderRegistry.getPlaybackUrl({
    mediaType: 'tv',
    tmdbId: show.id,
    imdbId: show.imdbId,
    season: seasonNumber,
    episode: episodeNumber,
    autoplay,
  });

  return (
    <div className="page-gutter pt-24 pb-10 sm:pt-32">
      <PlayerHeader
        backTo={paths.tvSeason(show.id, seasonNumber)}
        title={show.title}
        subtitle={`Season ${seasonNumber} · Episode ${episodeNumber} · ${episode.name}`}
      />

      {playbackUrl ? (
        <VideoPlayer
          src={playbackUrl}
          title={`${show.title} — S${seasonNumber} E${episodeNumber}`}
          autoplay={autoplay}
        />
      ) : (
        <PlaybackUnavailable />
      )}

      <EpisodeNavigation
        tvId={show.id}
        seasonNumber={seasonNumber}
        episodes={season.episodes}
        currentEpisodeNumber={episodeNumber}
        seasons={show.seasons}
        className="mt-4"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <AutoplayToggle autoplay={autoplay} onChange={setAutoplay} />
      </div>

      {episode.overview ? (
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-fg/80">{episode.overview}</p>
      ) : null}
    </div>
  );
}

export const Component = TvPlayerPage;
