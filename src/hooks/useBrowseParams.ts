import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { DiscoverSort } from '@/api/tmdb';

const SORTS: readonly DiscoverSort[] = ['popularity', 'rating', 'newest'];

function parseGenreId(raw: string | null): number | undefined {
  if (!raw || !/^[1-9]\d*$/.test(raw)) return undefined;
  return Number(raw);
}

function parseSort(raw: string | null): DiscoverSort {
  return (SORTS as readonly string[]).includes(raw ?? '') ? (raw as DiscoverSort) : 'popularity';
}

export interface BrowseParams {
  genreId: number | undefined;
  sort: DiscoverSort;
  setGenreId: (genreId: number | undefined) => void;
  setSort: (sort: DiscoverSort) => void;
}

/**
 * Keeps a browse page's genre/sort filters in the URL (`?genre=`, `?sort=`) — the same pattern
 * `SearchPage` uses for `?q=` — so a filtered view is shareable and survives back/forward
 * navigation. `popularity` (the default sort) is omitted from the URL to keep plain `/movies`
 * links clean.
 */
export function useBrowseParams(): BrowseParams {
  const [params, setParams] = useSearchParams();
  const genreId = parseGenreId(params.get('genre'));
  const sort = parseSort(params.get('sort'));

  const setGenreId = useCallback(
    (nextGenreId: number | undefined) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextGenreId === undefined) next.delete('genre');
          else next.set('genre', String(nextGenreId));
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setSort = useCallback(
    (nextSort: DiscoverSort) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextSort === 'popularity') next.delete('sort');
          else next.set('sort', nextSort);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { genreId, sort, setGenreId, setSort };
}
