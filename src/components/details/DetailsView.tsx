import type { UseQueryResult } from '@tanstack/react-query';
import { Compass } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TmdbError } from '@/api/tmdb';
import { CastList } from '@/components/media/CastList';
import { MediaRow } from '@/components/media/MediaRow';
import { WatchProviderList } from '@/components/media/WatchProviderList';
import { SeasonSelector } from '@/components/tv/SeasonSelector';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLibrary } from '@/hooks/useLibrary';
import { excludeMedia, getMediaKey } from '@/lib/media';
import { paths } from '@/lib/routes';
import type { MediaDetails, MediaItem } from '@/types/media';
import { DetailsHero } from './DetailsHero';
import { DetailsSkeleton } from './DetailsSkeleton';

interface DetailsViewProps {
  query: UseQueryResult<MediaDetails>;
  /** False when the URL's `:id` is not a valid id; the request is never made in that case. */
  isValidId: boolean;
  /** Noun used in messages: "movie" or "show". */
  noun: 'movie' | 'show';
}

function NotFound({ noun }: { noun: string }) {
  return (
    <div className="page-gutter pt-28">
      <EmptyState
        icon={<Compass className="size-10" />}
        title={`We couldn't find that ${noun}`}
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

function RelatedRow({ title, items }: { title: string; items: readonly MediaItem[] }) {
  // Unlike home rows, an empty related list is simply omitted rather than announced.
  if (items.length === 0) return null;
  return <MediaRow title={title} status="success" items={items} />;
}

/**
 * Loading / error / not-found / success shell shared by the movie and TV pages. It only knows
 * the normalized `MediaDetails` model, so it works for either media type.
 */
export function DetailsView({ query, isValidId, noun }: DetailsViewProps) {
  useDocumentTitle(query.data?.title);

  const { recordRecentlyViewed } = useLibrary();
  const loadedDetails = query.isSuccess ? query.data : undefined;
  // Keyed on the id, not the query object: a background refetch produces a new object with the
  // same title/poster, and that should not bump "recently viewed" back to the top every time.
  useEffect(() => {
    if (loadedDetails) recordRecentlyViewed(loadedDetails);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on identity, not the object
  }, [loadedDetails ? getMediaKey(loadedDetails) : undefined, recordRecentlyViewed]);

  if (!isValidId) return <NotFound noun={noun} />;
  if (query.isPending) return <DetailsSkeleton />;

  if (query.isError) {
    if (query.error instanceof TmdbError && query.error.kind === 'not_found') {
      return <NotFound noun={noun} />;
    }
    return (
      <div className="page-gutter pt-28">
        <ErrorState
          title={`Couldn't load this ${noun}`}
          error={query.error}
          onRetry={() => {
            void query.refetch();
          }}
          isRetrying={query.isFetching}
        />
      </div>
    );
  }

  const details = query.data;
  const similar = excludeMedia(details.similar, details.recommendations);
  const similarTitle = details.mediaType === 'movie' ? 'Similar movies' : 'Similar shows';

  return (
    <>
      {/* Keyed so navigating between titles resets local state such as an open trailer. */}
      <DetailsHero key={getMediaKey(details)} details={details} />

      <div className="pb-6">
        <CastList cast={details.cast} />

        {details.mediaType === 'tv' ? (
          <SeasonSelector tvId={details.id} seasons={details.seasons} />
        ) : null}

        <div className="page-gutter py-6">
          <WatchProviderList providers={details.providers} className="max-w-3xl" />
        </div>

        <RelatedRow title="More like this" items={details.recommendations} />
        <RelatedRow title={similarTitle} items={similar} />
      </div>
    </>
  );
}
