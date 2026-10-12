import { useMemo } from 'react';
import { ANIME_BASE_GENRE_ID } from '@/api/tmdb';
import { MediaBrowseView } from '@/components/browse/MediaBrowseView';
import { MediaKindToggle } from '@/components/browse/MediaKindToggle';
import { useBrowseParams } from '@/hooks/useBrowseParams';
import { useMediaKindParam } from '@/hooks/useMediaKindParam';
import {
  useDiscoverAnimeMovies,
  useDiscoverAnimeTv,
  useMovieGenres,
  useTvGenres,
} from '@/hooks/useMediaQueries';

/**
 * `/anime`: anime movies and series (Animation genre restricted to Japanese original language —
 * see `discoverAnimeMovies`/`discoverAnimeTv`), toggled via a `?kind=` param and filtered/sorted
 * the same way `/movies` and `/tv` are. Both kinds' query hooks are mounted unconditionally
 * (rules of hooks) with only the active one's `enabled` flag on, so flipping the toggle doesn't
 * re-mount anything or lose the inactive kind's cache.
 */
export function AnimePage() {
  const { kind, setKind } = useMediaKindParam();
  const { genreId, sort, setGenreId, setSort } = useBrowseParams();
  const isMovies = kind === 'movie';

  const movieGenresQuery = useMovieGenres({ enabled: isMovies });
  const tvGenresQuery = useTvGenres({ enabled: !isMovies });
  const genresQuery = isMovies ? movieGenresQuery : tvGenresQuery;

  const animeMoviesQuery = useDiscoverAnimeMovies({ genreId, sort, enabled: isMovies });
  const animeTvQuery = useDiscoverAnimeTv({ genreId, sort, enabled: !isMovies });
  const discoverQuery = isMovies ? animeMoviesQuery : animeTvQuery;

  // "Animation" is the fixed base filter for every result here, so showing it as a selectable
  // pill alongside the others would be redundant (and picking it as the *only* filter is a no-op).
  const genres = useMemo(
    () => genresQuery.data?.filter((genre) => genre.id !== ANIME_BASE_GENRE_ID),
    [genresQuery.data],
  );

  return (
    <MediaBrowseView
      mediaType={kind}
      title="Anime"
      genres={genres}
      discoverQuery={discoverQuery}
      genreId={genreId}
      sort={sort}
      onGenreChange={setGenreId}
      onSortChange={setSort}
      extraControls={<MediaKindToggle value={kind} onChange={setKind} />}
    />
  );
}

export const Component = AnimePage;
