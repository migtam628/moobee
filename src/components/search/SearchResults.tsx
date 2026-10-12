import { Loader2, SearchX, Telescope } from 'lucide-react';
import { MediaGrid, MediaGridSkeleton } from '@/components/media/MediaGrid';
import { PersonCard } from '@/components/media/PersonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { MIN_SEARCH_LENGTH, type SearchQuery } from '@/hooks/useMediaQueries';
import { cn } from '@/lib/cn';
import { pluralize } from '@/lib/format';
import type { PersonSummary } from '@/types/media';

interface SearchResultsProps {
  /** What the user has typed (trimmed). Drives the idle states immediately, without debounce. */
  typedTerm: string;
  /** The debounced term the current query is for. */
  searchTerm: string;
  search: SearchQuery;
}

function describePerson(person: PersonSummary): string | undefined {
  if (person.knownFor.length === 0) return undefined;
  return `Known for ${person.knownFor.slice(0, 2).join(', ')}`;
}

/**
 * Renders exactly one of five states: idle, loading, error, no results, results. The idle state
 * is decided from the raw input so clearing the box responds instantly, while the others follow
 * the debounced query.
 */
export function SearchResults({ typedTerm, searchTerm, search }: SearchResultsProps) {
  if (typedTerm.length < MIN_SEARCH_LENGTH) {
    return (
      <EmptyState
        icon={<Telescope className="size-10" />}
        title={typedTerm.length === 0 ? 'Search MooBee' : 'Keep typing…'}
        description={
          typedTerm.length === 0
            ? 'Find movies, TV shows and people.'
            : `Enter at least ${MIN_SEARCH_LENGTH} characters to search.`
        }
      />
    );
  }

  // Long enough to search, but the debounce hasn't fired yet (or the request is in flight).
  if (searchTerm.length < MIN_SEARCH_LENGTH || search.isPending) return <MediaGridSkeleton />;

  if (search.isError) {
    return (
      <ErrorState
        title="Search failed"
        error={search.error}
        onRetry={() => {
          void search.refetch();
        }}
        isRetrying={search.isFetching}
      />
    );
  }

  const { media, people, totalResults } = search.data;

  if (media.length === 0 && people.length === 0) {
    return (
      <EmptyState
        icon={<SearchX className="size-10" />}
        title={`No results for “${searchTerm}”`}
        description="Check the spelling or try a different title or name."
      />
    );
  }

  // Previous results stay visible (dimmed) while a new term loads, so typing doesn't flash empty.
  const isRefreshing = search.isPlaceholderData || typedTerm !== searchTerm;

  return (
    <div
      aria-busy={isRefreshing}
      className={cn('space-y-10 transition-opacity', isRefreshing && 'opacity-60')}
    >
      <p role="status" className="text-sm text-muted">
        {pluralize(totalResults, 'result')} for “{searchTerm}”
      </p>

      {people.length > 0 ? (
        <section aria-labelledby="search-people">
          <h2 id="search-people" className="mb-4 text-lg font-semibold tracking-tight text-fg">
            People
          </h2>
          <ul className="-mx-1 scrollbar-none flex gap-4 overflow-x-auto px-1 pb-2 sm:gap-5">
            {people.map((person) => (
              <li key={person.id}>
                <PersonCard
                  id={person.id}
                  name={person.name}
                  profilePath={person.profilePath}
                  subtitle={person.knownForDepartment}
                  detail={describePerson(person)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {media.length > 0 ? (
        <section aria-labelledby="search-titles">
          <h2 id="search-titles" className="mb-4 text-lg font-semibold tracking-tight text-fg">
            Movies &amp; TV
          </h2>
          <MediaGrid items={media} eagerCount={6} />
        </section>
      ) : null}

      {search.hasNextPage ? (
        <div className="flex flex-col items-center gap-3">
          {search.isFetchNextPageError ? (
            <p role="alert" className="text-sm text-danger">
              Couldn't load more results.
            </p>
          ) : null}
          <button
            type="button"
            disabled={search.isFetchingNextPage}
            onClick={() => {
              void search.fetchNextPage();
            }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-medium text-fg transition hover:bg-white/15 disabled:opacity-60"
          >
            {search.isFetchingNextPage ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : null}
            {search.isFetchNextPageError ? 'Try again' : 'Load more'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
