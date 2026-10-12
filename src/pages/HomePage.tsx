import { useMemo } from 'react';
import { Hero } from '@/components/media/Hero';
import { LazyMediaRow } from '@/components/media/LazyMediaRow';
import { MediaQueryRow } from '@/components/media/MediaQueryRow';
import { HeroSkeleton } from '@/components/media/MediaSkeletons';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  useNowPlayingMovies,
  usePopularMovies,
  usePopularTv,
  useTopRatedMovies,
  useTrendingMovies,
  useUpcomingMovies,
} from '@/hooks/useMediaQueries';
import { pickFeatured } from '@/lib/media';

export function HomePage() {
  const trending = useTrendingMovies();
  const popularMovies = usePopularMovies();
  const popularTv = usePopularTv();

  // The hero reuses the trending query, so it shares one cache entry and one request with the row.
  const featured = useMemo(() => pickFeatured(trending.data ?? []), [trending.data]);

  return (
    <>
      <h1 className="sr-only">MooBee: discover trending movies and TV</h1>

      {trending.isPending ? <HeroSkeleton /> : null}

      {trending.isError ? (
        <div className="page-gutter pt-24">
          <ErrorState
            title="Couldn't load featured titles"
            error={trending.error}
            onRetry={() => {
              void trending.refetch();
            }}
            isRetrying={trending.isFetching}
          />
        </div>
      ) : null}

      {trending.isSuccess && featured.length > 0 ? <Hero items={featured} /> : null}

      {/* No featured title (e.g. an empty response): keep content clear of the fixed navbar. */}
      {trending.isSuccess && featured.length === 0 ? (
        <div className="h-20" aria-hidden="true" />
      ) : null}

      <div className="pt-2 pb-4">
        <MediaQueryRow title="Trending Movies" query={trending} eagerCount={6} />
        <MediaQueryRow title="Popular Movies" query={popularMovies} />
        <MediaQueryRow title="Popular TV" query={popularTv} />
        {/* Below the fold: requests start only when the row nears the viewport. */}
        <LazyMediaRow title="Top Rated" useList={useTopRatedMovies} />
        <LazyMediaRow title="Now Playing" useList={useNowPlayingMovies} />
        <LazyMediaRow title="Upcoming" useList={useUpcomingMovies} />
      </div>
    </>
  );
}

export const Component = HomePage;
