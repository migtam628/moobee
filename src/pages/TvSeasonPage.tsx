import { ArrowLeft, Compass } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { TmdbError } from '@/api/tmdb';
import { EpisodeSelector } from '@/components/tv/EpisodeSelector';
import { SeasonSelector } from '@/components/tv/SeasonSelector';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useTvDetails, useTvSeason } from '@/hooks/useMediaQueries';
import { formatAirDate } from '@/lib/format';
import { parseRouteId, parseSeasonNumber, paths } from '@/lib/routes';

function NotFound() {
  return (
    <div className="page-gutter pt-28">
      <EmptyState
        icon={<Compass className="size-10" />}
        title="We couldn't find that season"
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

function SeasonPageSkeleton() {
  return (
    <div role="status" aria-label="Loading season" className="page-gutter pt-28 pb-8 sm:pt-36">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-9 w-2/3 sm:h-11" />
      <Skeleton className="mt-3 h-4 w-1/3" />
      <div className="mt-8 space-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex gap-4 sm:gap-5">
            <Skeleton className="aspect-video w-32 shrink-0 rounded-lg sm:w-44" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Episode list for one season of a show, with a strip to jump between the show's other seasons. */
export function TvSeasonPage() {
  const { id: idParam, season: seasonParam } = useParams();
  const tvId = parseRouteId(idParam);
  const seasonNumber = parseSeasonNumber(seasonParam);
  const isValidRoute = tvId !== undefined && seasonNumber !== undefined;

  // Gated on the whole route, not just their own params: an invalid id/season means this page
  // renders `NotFound` regardless, so there's no reason to fetch anything.
  const showQuery = useTvDetails(isValidRoute ? tvId : undefined);
  const seasonQuery = useTvSeason(
    isValidRoute ? tvId : undefined,
    isValidRoute ? seasonNumber : undefined,
  );
  const show = showQuery.data;
  const season = seasonQuery.data;

  useDocumentTitle(show && season ? `${season.name} · ${show.title}` : show?.title);

  if (!isValidRoute) return <NotFound />;

  const isNotFoundError = (error: unknown) =>
    error instanceof TmdbError && error.kind === 'not_found';

  if (showQuery.isError && isNotFoundError(showQuery.error)) return <NotFound />;
  if (seasonQuery.isError && isNotFoundError(seasonQuery.error)) return <NotFound />;

  if (showQuery.isError || seasonQuery.isError) {
    return (
      <div className="page-gutter pt-28">
        <ErrorState
          title="Couldn't load this season"
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

  if (!show || !season) return <SeasonPageSkeleton />;

  const airDate = formatAirDate(season.airDate);

  return (
    <div className="pt-24 pb-8 sm:pt-32">
      <div className="page-gutter">
        <Link
          to={paths.tvShow(tvId)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-fg"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {show.title}
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-balance text-fg sm:text-3xl">
          {season.name}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {airDate ? <span>{airDate}</span> : null}
          <span>
            {season.episodes.length === 1 ? '1 episode' : `${season.episodes.length} episodes`}
          </span>
        </p>
        {season.overview ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg/85">{season.overview}</p>
        ) : null}
      </div>

      <SeasonSelector
        tvId={tvId}
        seasons={show.seasons}
        activeSeason={seasonNumber}
        className="mt-6"
      />

      <div className="mt-6 page-gutter">
        <EpisodeSelector tvId={tvId} seasonNumber={seasonNumber} episodes={season.episodes} />
      </div>
    </div>
  );
}

export const Component = TvSeasonPage;
