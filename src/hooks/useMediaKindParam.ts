import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type MediaKind = 'movie' | 'tv';

function parseKind(raw: string | null): MediaKind {
  return raw === 'tv' ? 'tv' : 'movie';
}

export interface MediaKindParam {
  kind: MediaKind;
  setKind: (kind: MediaKind) => void;
}

/**
 * Keeps a "movies vs. series" toggle in the URL (`?kind=`), the same pattern `useBrowseParams`
 * uses for `?genre=`/`?sort=`. `movie` (the default) is omitted from the URL to keep the plain
 * link clean. Reused by any page that browses two media types from one URL — currently just the
 * anime page.
 */
export function useMediaKindParam(): MediaKindParam {
  const [params, setParams] = useSearchParams();
  const kind = parseKind(params.get('kind'));

  const setKind = useCallback(
    (nextKind: MediaKind) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextKind === 'movie') next.delete('kind');
          else next.set('kind', nextKind);
          // A genre pill selected for one kind's genre list rarely means the same thing (or
          // exists at all) in the other's, so switching kind clears it rather than risking a
          // silently-wrong filter.
          next.delete('genre');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { kind, setKind };
}
