import { Compass, Info } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TmdbError } from '@/api/tmdb';
import { EpisodeNavigation } from '@/components/player/EpisodeNavigation';
import { PlaybackUnavailable } from '@/components/player/PlaybackUnavailable';
import { DescriptionBox } from '@/components/player/DescriptionBox';
import { SeasonSelect } from '@/components/player/SeasonSelect';
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
import { useTvDetails, useTvSeason } from '@/hooks/useMediaQueries';
import { formatRuntime } from '@/lib/format';
import { excludeMedia } from '@/lib/media';
import { parseRouteId, parseSeasonNumber, paths } from '@/lib/routes';
import { describeStats, episodeUpNextItems, isAnime, mediaUpNextItems } from '@/lib/watch';
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
  const [theater, toggleTheater] = usePlayerView();
  // The season the Up next list shows. It follows what is playing until the viewer picks another
  // one, and is forgotten (by `forSeason`) as soon as playback moves to a different season.
  const [pickedSeason, setPickedSeason] = useState<{ forSeason: number; value: number }>();

  const listSeasonNumber =
    pickedSeason && pickedSeason.forSeason === seasonNumber ? pickedSeason.value : seasonNumber;
  // Same cache entry as `seasonQuery` until the viewer picks another season in the list.
  const listQuery = useTvSeason(
    isValidRoute ? tvId : undefined,
    isValidRoute ? listSeasonNumber : undefined,
  );

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

  if (!show || !season) return <WatchSkeleton />;
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

  const runtime = formatRuntime(episode.runtimeMinutes ?? show.episodeRuntimeMinutes);

  const episodeList = listQuery.data;
  const emptyEpisodes = listQuery.isError
    ? "Couldn't load this season's episodes."
    : listQuery.isPending
      ? 'Loading episodes…'
      : 'No episodes listed for this season.';

  const tabs: UpNextTab[] = [
    {
      id: 'episodes',
      label: 'Episodes',
      items: episodeList
        ? episodeUpNextItems(show.id, episodeList.episodes, { seasonNumber, episodeNumber })
        : [],
      toolbar: (
        <SeasonSelect
          seasons={show.seasons}
          value={listSeasonNumber ?? seasonNumber}
          onChange={(value) => {
            setPickedSeason({ forSeason: seasonNumber, value });
          }}
        />
      ),
      emptyText: emptyEpisodes,
    },
    {
      id: 'recommended',
      label: 'More like this',
      items: mediaUpNextItems(show.recommendations),
      emptyText: 'No recommendations for this show yet.',
    },
    {
      id: 'similar',
      label: 'Similar',
      items: mediaUpNextItems(excludeMedia(show.similar, show.recommendations)),
      emptyText: 'No similar shows yet.',
    },
  ];

  return (
    <WatchLayout
      theater={theater}
      player={
        playbackUrl ? (
          <VideoPlayer
            src={playbackUrl}
            title={`${show.title} — S${seasonNumber} E${episodeNumber}`}
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
          title={episode.name}
          channelName={show.title}
          channelHref={paths.tvShow(show.id)}
          channelDetail={`Season ${seasonNumber} · Episode ${episodeNumber}`}
          channelPosterPath={show.posterPath}
          actions={
            <>
              <EpisodeNavigation
                tvId={show.id}
                seasonNumber={seasonNumber}
                episodes={season.episodes}
                currentEpisodeNumber={episodeNumber}
                seasons={show.seasons}
                className="gap-2"
              />
              <WatchlistButton item={show} size="sm" />
              <FavoriteButton item={show} size="sm" />
              <ShareButton />
              <Link
                to={paths.tvSeason(show.id, seasonNumber)}
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
              lead: `S${seasonNumber} E${episodeNumber}`,
              rating: episode.rating ?? show.rating,
              voteCount: episode.rating === undefined ? show.voteCount : episode.voteCount,
              date: episode.airDate,
            })}
            tags={[...show.genres.map((genre) => genre.name), ...(isAnime(show) ? ['Anime'] : [])]}
            overview={episode.overview?.trim() ? episode.overview : show.overview}
            tagline={show.tagline}
            details={[
              ...(show.creators.length > 0
                ? [{ label: 'Created by', value: show.creators.join(', ') }]
                : []),
              ...(show.networks.length > 0
                ? [{ label: 'Network', value: show.networks.join(', ') }]
                : []),
              ...(runtime ? [{ label: 'Runtime', value: runtime }] : []),
              ...(show.status ? [{ label: 'Status', value: show.status }] : []),
            ]}
            cast={show.cast}
          />
        </WatchInfo>
      }
      side={<UpNext tabs={tabs} autoplay={autoplay} onAutoplayChange={setAutoplay} />}
    />
  );
}

export const Component = TvPlayerPage;
