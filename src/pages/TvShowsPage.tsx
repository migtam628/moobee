import { MediaBrowseView } from '@/components/browse/MediaBrowseView';
import { useBrowseParams } from '@/hooks/useBrowseParams';
import { useDiscoverTv, useTvGenres } from '@/hooks/useMediaQueries';

/** `/tv`: every TV genre, filterable and sortable via TMDB's `/discover/tv`. */
export function TvShowsPage() {
  const { genreId, sort, setGenreId, setSort } = useBrowseParams();
  const genresQuery = useTvGenres();
  const discoverQuery = useDiscoverTv({ genreId, sort });

  return (
    <MediaBrowseView
      mediaType="tv"
      title="TV Shows"
      genres={genresQuery.data}
      discoverQuery={discoverQuery}
      genreId={genreId}
      sort={sort}
      onGenreChange={setGenreId}
      onSortChange={setSort}
    />
  );
}

export const Component = TvShowsPage;
