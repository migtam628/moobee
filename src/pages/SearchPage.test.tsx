import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp, requestedUrls, stubApi, type ApiHandler } from '@/test/app';
import {
  jsonResponse,
  rawPage,
  rawSearchMovie,
  rawSearchPerson,
  rawSearchTv,
} from '@/test/fixtures';
import { SEARCH_DEBOUNCE_MS } from './SearchPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

const searchInput = () => screen.getByRole('searchbox', { name: /search movies/i });
/** The page is a lazy route, so the first lookup must wait for its chunk. */
const findSearchInput = () => screen.findByRole('searchbox', { name: /search movies/i });
const searchRequests = (fetchMock: ReturnType<typeof stubApi>) =>
  requestedUrls(fetchMock).filter((url) => url.pathname.endsWith('/search/multi'));

/** Answers every search with a fixed page, echoing nothing about the query. */
const resultsHandler =
  (results: unknown[], overrides: Record<string, unknown> = {}): ApiHandler =>
  () =>
    jsonResponse(rawPage(results, { total_results: results.length, total_pages: 1, ...overrides }));

const sampleResults = () => [
  rawSearchPerson({ id: 287, name: 'Brad Pitt' }),
  rawSearchMovie({ id: 550, title: 'Fight Club' }),
  rawSearchTv({ id: 1396, name: 'Breaking Bad' }),
];

describe('search page: idle states', () => {
  it('starts idle with a prompt, focuses the box and makes no request', async () => {
    const fetchMock = stubApi(resultsHandler([]));
    renderApp('/search');

    expect(await screen.findByRole('heading', { name: 'Search MooBee' })).toBeInTheDocument();
    await waitFor(() => {
      expect(searchInput()).toHaveFocus();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks for more characters after a single letter, without a request', async () => {
    const fetchMock = stubApi(resultsHandler([]));
    renderApp('/search');
    await userEvent.type(await findSearchInput(), 'a');

    expect(screen.getByRole('heading', { name: 'Keep typing…' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS + 100));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('search page: debouncing', () => {
  it('sends one request for a burst of keystrokes, only after the user pauses', async () => {
    const fetchMock = stubApi(resultsHandler(sampleResults()));
    renderApp('/search');

    await userEvent.type(await findSearchInput(), 'fight club');
    // Ten keystrokes have happened; nothing may have been sent yet.
    expect(searchRequests(fetchMock)).toHaveLength(0);

    expect(await screen.findByRole('link', { name: /Fight Club/ })).toBeInTheDocument();
    const requests = searchRequests(fetchMock);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.searchParams.get('query')).toBe('fight club');
  });

  it('exposes a debounce of at least 300ms', () => {
    expect(SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(300);
  });
});

describe('search page: results', () => {
  it('shows people and movies/TV, with links to the right namespaces', async () => {
    stubApi(resultsHandler(sampleResults()));
    renderApp('/search?q=brad');

    expect(await screen.findByRole('heading', { level: 2, name: 'People' })).toBeInTheDocument();
    const people = screen.getByRole('region', { name: 'People' });
    expect(within(people).getByText('Brad Pitt')).toBeInTheDocument();
    expect(within(people).getByText('Acting')).toBeInTheDocument();
    expect(within(people).getByText('Known for Fight Club, Some Show')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Fight Club/ })).toHaveAttribute('href', '/movie/550');
    expect(screen.getByRole('link', { name: /Breaking Bad/ })).toHaveAttribute('href', '/tv/1396');
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('3 results for “brad”');
  });

  it('searches immediately for a query already in the URL and prefills the box', async () => {
    const fetchMock = stubApi(resultsHandler(sampleResults()));
    renderApp('/search?q=fight');

    expect(await findSearchInput()).toHaveValue('fight');
    expect(await screen.findByRole('link', { name: /Fight Club/ })).toBeInTheDocument();
    expect(searchRequests(fetchMock)).toHaveLength(1);
  });

  it('keeps ?q= in step with what was searched, without adding history entries', async () => {
    stubApi(resultsHandler(sampleResults()));
    const { router } = renderApp('/search');

    await userEvent.type(await findSearchInput(), 'fight');
    await screen.findByRole('link', { name: /Fight Club/ });

    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=fight');
    });
    // A replace, so Back leaves the search page instead of stepping through every keystroke.
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('follows the URL when it changes from outside (e.g. back/forward)', async () => {
    stubApi(resultsHandler(sampleResults()));
    const { router } = renderApp('/search?q=fight');
    await screen.findByRole('link', { name: /Fight Club/ });

    await router.navigate('/search?q=breaking');
    await waitFor(() => {
      expect(searchInput()).toHaveValue('breaking');
    });
  });

  it('loads more pages on demand and merges them without duplicates', async () => {
    const fetchMock = stubApi((url) => {
      const page = Number(url.searchParams.get('page') ?? '1');
      return jsonResponse(
        rawPage(
          page === 1
            ? [rawSearchMovie({ id: 1, title: 'First Film' })]
            : [
                rawSearchMovie({ id: 1, title: 'First Film' }),
                rawSearchMovie({ id: 2, title: 'Second Film' }),
              ],
          { page, total_pages: 2, total_results: 3 },
        ),
      );
    });
    renderApp('/search?q=film');

    await screen.findByRole('link', { name: /First Film/ });
    expect(screen.queryByRole('link', { name: /Second Film/ })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('link', { name: /Second Film/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /First Film/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(searchRequests(fetchMock).map((url) => url.searchParams.get('page'))).toEqual([
      '1',
      '2',
    ]);
  });

  it('clears back to the idle state from the clear button', async () => {
    stubApi(resultsHandler(sampleResults()));
    renderApp('/search?q=fight');
    await screen.findByRole('link', { name: /Fight Club/ });

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(searchInput()).toHaveValue('');
    expect(searchInput()).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Search MooBee' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Fight Club/ })).toBeNull();
  });
});

describe('search page: loading, empty and error states', () => {
  it('shows a loading skeleton while the request is in flight', async () => {
    let release: (response: Response) => void = () => undefined;
    stubApi(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    renderApp('/search?q=fight');

    expect(await screen.findByRole('status', { name: 'Loading results' })).toBeInTheDocument();
    release(jsonResponse(rawPage(sampleResults(), { total_results: 3, total_pages: 1 })));
    expect(await screen.findByRole('link', { name: /Fight Club/ })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading results' })).toBeNull();
  });

  it('shows a no-results message naming the query', async () => {
    stubApi(resultsHandler([]));
    renderApp('/search?q=zzzzqx');
    expect(
      await screen.findByRole('heading', { name: 'No results for “zzzzqx”' }),
    ).toBeInTheDocument();
  });

  it('shows a readable, retryable error', async () => {
    let failing = true;
    stubApi((url) =>
      failing
        ? jsonResponse({ status_message: 'boom' }, { status: 500 })
        : resultsHandler(sampleResults())(url),
    );
    renderApp('/search?q=fight');

    expect(await screen.findByRole('alert')).toHaveTextContent('Search failed');

    failing = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('link', { name: /Fight Club/ })).toBeInTheDocument();
  });

  it('handles a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderApp('/search?q=fight');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /couldn't reach the movie database/i,
    );
  });

  it('ignores malformed results instead of breaking the page', async () => {
    stubApi(
      resultsHandler([
        { media_type: 'movie', id: 'not-a-number' },
        { media_type: 'collection', id: 3, name: 'Unknown kind' },
        rawSearchMovie({ id: 550, title: 'Fight Club' }),
      ]),
    );
    renderApp('/search?q=fight');
    expect(await screen.findByRole('link', { name: /Fight Club/ })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });
});
