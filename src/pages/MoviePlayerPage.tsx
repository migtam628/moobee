import { Compass } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { TmdbError } from '@/api/tmdb';
import { AutoplayToggle } from '@/components/player/AutoplayToggle';
import { PlaybackUnavailable } from '@/components/player/PlaybackUnavailable';
import { PlayerHeader } from '@/components/player/PlayerHeader';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { useAutoplayPreference } from '@/hooks/useAutoplayPreference';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useMovieDetails } from '@/hooks/useMediaQueries';
import { parseRouteId, paths } from '@/lib/routes';
import { playbackProviderRegistry } from '@/services/playback/providerRegistry';

function NotFound() {
  return (
    <div className="page-gutter pt-28">
      <EmptyState
        icon={<Compass className="size-10" />}
        title="We couldn't find that movie"
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

/** `/watch/movie/:id`. Asks the playback registry for a URL; never embeds anything itself. */
export function MoviePlayerPage() {
  const { id: idParam } = useParams();
  const id = parseRouteId(idParam);
  const query = useMovieDetails(id);
  const [autoplay, setAutoplay] = useAutoplayPreference();

  useDocumentTitle(query.data ? `Watch ${query.data.title}` : undefined);

  if (id === undefined) return <NotFound />;
  if (query.isPending) return <PlayerSkeleton />;

  if (query.isError) {
    if (query.error instanceof TmdbError && query.error.kind === 'not_found') return <NotFound />;
    return (
      <div className="page-gutter pt-24 sm:pt-32">
        <ErrorState
          title="Couldn't load this movie"
          error={query.error}
          onRetry={() => {
            void query.refetch();
          }}
          isRetrying={query.isFetching}
        />
      </div>
    );
  }

  const movie = query.data;
  const playbackUrl = playbackProviderRegistry.getPlaybackUrl({
    mediaType: 'movie',
    tmdbId: movie.id,
    imdbId: movie.imdbId,
    autoplay,
  });

  return (
    <div className="page-gutter pt-24 pb-10 sm:pt-32">
      <PlayerHeader
        backTo={paths.movie(movie.id)}
        title={movie.title}
        subtitle={movie.year ? String(movie.year) : undefined}
      />

      {playbackUrl ? (
        <VideoPlayer src={playbackUrl} title={movie.title} autoplay={autoplay} />
      ) : (
        <PlaybackUnavailable />
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <AutoplayToggle autoplay={autoplay} onChange={setAutoplay} />
      </div>

      {movie.overview ? (
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-fg/80">{movie.overview}</p>
      ) : null}
    </div>
  );
}

export const Component = MoviePlayerPage;
