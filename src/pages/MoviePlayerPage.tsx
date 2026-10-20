import { Compass, Info } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { TmdbError } from '@/api/tmdb';
import { PlaybackUnavailable } from '@/components/player/PlaybackUnavailable';
import { DescriptionBox } from '@/components/player/DescriptionBox';
import { ShareButton } from '@/components/player/ShareButton';
import { UpNext, type UpNextTab } from '@/components/player/UpNext';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { WatchInfo } from '@/components/player/WatchInfo';
import { WatchLayout } from '@/components/player/WatchLayout';
import { WatchSkeleton } from '@/components/player/WatchSkeleton';
import { FavoriteButton } from '@/components/media/FavoriteButton';
import { WatchlistButton } from '@/components/media/WatchlistButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAutoplayPreference } from '@/hooks/useAutoplayPreference';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePlayerView } from '@/hooks/usePlayerView';
import { useMovieDetails } from '@/hooks/useMediaQueries';
import { formatRuntime } from '@/lib/format';
import { excludeMedia } from '@/lib/media';
import { parseRouteId, paths } from '@/lib/routes';
import { describeStats, isAnime, mediaUpNextItems } from '@/lib/watch';
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

/** `/watch/movie/:id`. Asks the playback registry for a URL; never embeds anything itself. */
export function MoviePlayerPage() {
  const { id: idParam } = useParams();
  const id = parseRouteId(idParam);
  const query = useMovieDetails(id);
  const [autoplay, setAutoplay] = useAutoplayPreference();
  const [theater, toggleTheater] = usePlayerView();

  useDocumentTitle(query.data ? `Watch ${query.data.title}` : undefined);

  if (id === undefined) return <NotFound />;
  if (query.isPending) return <WatchSkeleton />;

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

  const director = movie.directors[0];
  const channelDetail = [
    movie.year === undefined ? undefined : String(movie.year),
    formatRuntime(movie.runtimeMinutes),
    movie.certification,
  ]
    .filter(Boolean)
    .join(' · ');

  const tabs: UpNextTab[] = [
    {
      id: 'recommended',
      label: 'More like this',
      items: mediaUpNextItems(movie.recommendations),
      emptyText: 'No recommendations for this movie yet.',
    },
    {
      id: 'similar',
      label: 'Similar',
      items: mediaUpNextItems(excludeMedia(movie.similar, movie.recommendations)),
      emptyText: 'No similar movies yet.',
    },
  ];

  return (
    <WatchLayout
      theater={theater}
      player={
        playbackUrl ? (
          <VideoPlayer
            src={playbackUrl}
            title={movie.title}
            autoplay={autoplay}
            theater={theater}
            onToggleTheater={toggleTheater}
          />
        ) : (
          <PlaybackUnavailable />
        )
      }
      info={
        <WatchInfo
          title={movie.title}
          channelName={director ? `Directed by ${director}` : 'Movie'}
          channelHref={paths.movie(movie.id)}
          channelDetail={channelDetail || undefined}
          channelPosterPath={movie.posterPath}
          actions={
            <>
              <WatchlistButton item={movie} size="sm" />
              <FavoriteButton item={movie} size="sm" />
              <ShareButton />
              <Link
                to={paths.movie(movie.id)}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-white/15"
              >
                <Info aria-hidden="true" className="size-4" />
                Details
              </Link>
            </>
          }
        >
          <DescriptionBox
            stats={describeStats({
              rating: movie.rating,
              voteCount: movie.voteCount,
              date: movie.releaseDate,
            })}
            tags={[
              ...movie.genres.map((genre) => genre.name),
              ...(isAnime(movie) ? ['Anime'] : []),
            ]}
            overview={movie.overview}
            tagline={movie.tagline}
            details={[
              ...(movie.directors.length > 0
                ? [{ label: 'Directed by', value: movie.directors.join(', ') }]
                : []),
              ...(formatRuntime(movie.runtimeMinutes)
                ? [{ label: 'Runtime', value: formatRuntime(movie.runtimeMinutes) ?? '' }]
                : []),
              ...(movie.status ? [{ label: 'Status', value: movie.status }] : []),
            ]}
            cast={movie.cast}
          />
        </WatchInfo>
      }
      side={<UpNext tabs={tabs} autoplay={autoplay} onAutoplayChange={setAutoplay} />}
    />
  );
}

export const Component = MoviePlayerPage;
