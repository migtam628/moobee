import { Compass, User } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { TmdbError } from '@/api/tmdb';
import { getProfileUrl } from '@/api/tmdb/images';
import { MediaGrid } from '@/components/media/MediaGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePersonDetails } from '@/hooks/useMediaQueries';
import { formatAirDate } from '@/lib/format';
import { parseRouteId, paths } from '@/lib/routes';

function NotFound() {
  return (
    <div className="page-gutter pt-28">
      <EmptyState
        icon={<Compass className="size-10" />}
        title="We couldn't find that person"
        description="They may have been removed, or the link may be wrong."
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

function PersonSkeleton() {
  return (
    <div role="status" aria-label="Loading person" className="page-gutter pt-24 pb-12 sm:pt-32">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <Skeleton className="size-40 shrink-0 rounded-full sm:size-48" />
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

/** "Sep 21, 2026" for a living person, "Sep 21, 1926 – Sep 21, 2026" once they've died. */
function describeLifespan(birthday?: string, deathday?: string): string | undefined {
  const born = formatAirDate(birthday);
  if (!born) return undefined;
  const died = formatAirDate(deathday);
  return died ? `${born} – ${died}` : `Born ${born}`;
}

/** `/person/:id`: a cast member's photo, biography and the titles they're best known for. */
export function PersonPage() {
  const { id: idParam } = useParams();
  const id = parseRouteId(idParam);
  const query = usePersonDetails(id);
  const person = query.data;

  useDocumentTitle(person?.name);

  if (id === undefined) return <NotFound />;

  if (query.isError) {
    if (query.error instanceof TmdbError && query.error.kind === 'not_found') return <NotFound />;
    return (
      <div className="page-gutter pt-28">
        <ErrorState
          title="Couldn't load this person"
          error={query.error}
          onRetry={() => {
            void query.refetch();
          }}
          isRetrying={query.isFetching}
        />
      </div>
    );
  }

  if (!person) return <PersonSkeleton />;

  const photo = getProfileUrl(person.profilePath, 'h632');
  const lifespan = describeLifespan(person.birthday, person.deathday);

  return (
    <div className="page-gutter pt-24 pb-12 sm:pt-32">
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="size-40 shrink-0 overflow-hidden rounded-full bg-raised ring-1 ring-line sm:size-48">
          {photo ? (
            <img src={photo} alt="" width={185} height={185} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-muted">
              <User aria-hidden="true" className="size-1/3" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{person.name}</h1>
          <p className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-muted sm:justify-start">
            {person.knownForDepartment ? <span>{person.knownForDepartment}</span> : null}
            {lifespan ? <span>{lifespan}</span> : null}
            {person.placeOfBirth ? <span>{person.placeOfBirth}</span> : null}
          </p>
          {person.biography ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-fg/85">{person.biography}</p>
          ) : null}
        </div>
      </div>

      {person.filmography.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-fg sm:text-xl">
            Known for
          </h2>
          <MediaGrid items={person.filmography} eagerCount={6} />
        </section>
      ) : null}
    </div>
  );
}

export const Component = PersonPage;
