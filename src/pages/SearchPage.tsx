import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBox } from '@/components/media/SearchBox';
import { SearchResults } from '@/components/search/SearchResults';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSearch } from '@/hooks/useMediaQueries';

/** Wait for the user to pause typing this long before sending a request. */
export const SEARCH_DEBOUNCE_MS = 300;
const MAX_QUERY_LENGTH = 100;

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const urlQuery = (params.get('q') ?? '').slice(0, MAX_QUERY_LENGTH);

  const [value, setValue] = useState(urlQuery);
  const typedTerm = value.trim();
  const searchTerm = useDebouncedValue(typedTerm, SEARCH_DEBOUNCE_MS);
  const search = useSearch(searchTerm);

  // The last term this page and the URL agreed on; tells our own URL writes from outside changes.
  const syncedTerm = useRef(urlQuery.trim());

  // Input -> URL: keep `?q=` in step with the debounced term so results are shareable.
  useEffect(() => {
    if (searchTerm === syncedTerm.current) return;
    syncedTerm.current = searchTerm;
    setParams(searchTerm ? { q: searchTerm } : {}, { replace: true });
  }, [searchTerm, setParams]);

  // URL -> input: back/forward, or another link to /search?q=…, changes what the box shows.
  useEffect(() => {
    if (urlQuery.trim() === syncedTerm.current) return;
    syncedTerm.current = urlQuery.trim();
    setValue(urlQuery);
  }, [urlQuery]);

  useDocumentTitle(searchTerm.length > 0 ? `Search: ${searchTerm}` : 'Search');

  return (
    <div className="page-gutter pt-24 pb-12 sm:pt-28">
      <h1 className="sr-only">Search</h1>
      <div className="mx-auto max-w-2xl">
        <SearchBox value={value} onChange={setValue} autoFocus={urlQuery.length === 0} />
      </div>

      <div className="mt-8 sm:mt-10">
        <SearchResults typedTerm={typedTerm} searchTerm={searchTerm} search={search} />
      </div>
    </div>
  );
}

export const Component = SearchPage;
