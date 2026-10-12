import { MediaBrowseView } from '@/components/browse/MediaBrowseView';
import { useBrowseParams } from '@/hooks/useBrowseParams';
import { useDiscoverMovies, useMovieGenres } from '@/hooks/useMediaQueries';

/** `/movies`: every movie genre, filterable and sortable via TMDB's `/discover/movie`. */
export function MoviesPage() {
  const { genreId, sort, setGenreId, setSort } = useBrowseParams();
  const genresQuery = useMovieGenres();
  const discoverQuery = useDiscoverMovies({ genreId, sort });

  return (
    <MediaBrowseView
      mediaType="movie"
      title="Movies"
      genres={genresQuery.data}
      discoverQuery={discoverQuery}
      genreId={genreId}
      sort={sort}
      onGenreChange={setGenreId}
      onSortChange={setSort}
    />
  );
}

export const Component = MoviesPage;
