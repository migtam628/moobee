import type { ReactNode } from 'react';
import { Film, Loader2, Tv } from 'lucide-react';
import type { DiscoverSort } from '@/api/tmdb';
import { MediaGrid, MediaGridSkeleton } from '@/components/media/MediaGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { DiscoverQuery } from '@/hooks/useMediaQueries';
import type { Genre } from '@/types/media';
import { GenreFilter } from './GenreFilter';
import { SortControl } from './SortControl';

interface MediaBrowseViewProps {
  mediaType: 'movie' | 'tv';
  title: string;
  /** Plain array rather than the full query result — callers that need to filter the list
   * client-side (e.g. the anime page hiding the "Animation" pill) don't have to fight
   * `UseQueryResult`'s discriminated-union shape to do it. */
  genres: Genre[] | undefined;
  discoverQuery: DiscoverQuery;
  genreId: number | undefined;
  sort: DiscoverSort;
  onGenreChange: (genreId: number | undefined) => void;
  onSortChange: (sort: DiscoverSort) => void;
  /** Rendered next to the sort control — e.g. the anime page's movies/series toggle. */
  extraControls?: ReactNode;
}

/**
 * Genre-filtered, sortable, paginated grid shared by `/movies`, `/tv` and `/anime`. Purely
 * presentational — the page owns the query hooks and URL-synced filter state, so this component
 * never has to choose which media type's hooks to call.
 */
export function MediaBrowseView({
  mediaType,
  title,
  genres,
  discoverQuery,
  genreId,
  sort,
  onGenreChange,
  onSortChange,
  extraControls,
}: MediaBrowseViewProps) {
  useDocumentTitle(title);
  const Icon = mediaType === 'movie' ? Film : Tv;
  const results = discoverQuery.data;

  return (
    <div className="page-gutter pt-24 pb-12 sm:pt-28">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {extraControls}
          <SortControl value={sort} onChange={onSortChange} />
        </div>
      </div>

      <GenreFilter
        genres={genres ?? []}
        activeGenreId={genreId}
        onChange={onGenreChange}
        className="mt-5"
      />

      <div className="mt-8">
        {discoverQuery.isPending ? <MediaGridSkeleton /> : null}

        {discoverQuery.isError ? (
          <ErrorState
            title={`Couldn't load ${title.toLowerCase()}`}
            error={discoverQuery.error}
            onRetry={() => {
              void discoverQuery.refetch();
            }}
            isRetrying={discoverQuery.isFetching}
          />
        ) : null}

        {results?.items.length === 0 ? (
          <EmptyState
            icon={<Icon className="size-10" />}
            title="No titles match these filters"
            description="Try a different genre or sort order."
          />
        ) : null}

        {results && results.items.length > 0 ? (
          <MediaGrid items={results.items} eagerCount={6} />
        ) : null}

        {discoverQuery.hasNextPage ? (
          <div className="mt-10 flex flex-col items-center gap-3">
            {discoverQuery.isFetchNextPageError ? (
              <p role="alert" className="text-sm text-danger">
                Couldn't load more titles.
              </p>
            ) : null}
            <button
              type="button"
              disabled={discoverQuery.isFetchingNextPage}
              onClick={() => {
                void discoverQuery.fetchNextPage();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-medium text-fg transition hover:bg-white/15 disabled:opacity-60"
            >
              {discoverQuery.isFetchingNextPage ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : null}
              {discoverQuery.isFetchNextPageError ? 'Try again' : 'Load more'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
