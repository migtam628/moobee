import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { appRoutes } from '@/app/routes';
import { createQueryClient } from '@/lib/queryClient';
import { jsonResponse, rawMovie, rawPage, rawTv } from '@/test/fixtures';
import { toUrlString } from '@/test/utils';

type Handler = (url: URL) => Response | Promise<Response>;

/** Routes fake TMDB proxy responses by path, and records every request made. */
function stubApi(handler: Handler) {
  const fetchMock = vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(handler(new URL(toUrlString(input), 'http://localhost'))),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const okHandler: Handler = (url) => {
  if (url.pathname.endsWith('/trending/movie/week')) {
    return jsonResponse(
      rawPage([
        rawMovie({ id: 1, title: 'Trending One' }),
        rawMovie({ id: 2, title: 'Trending Two' }),
        // No backdrop: must never be picked for the hero.
        rawMovie({ id: 3, title: 'No Backdrop', backdrop_path: null }),
      ]),
    );
  }
  if (url.pathname.endsWith('/movie/popular')) {
    return jsonResponse(rawPage([rawMovie({ id: 10, title: 'Popular Movie' })]));
  }
  if (url.pathname.endsWith('/tv/popular')) {
    return jsonResponse(rawPage([rawTv({ id: 20, name: 'Popular Show' })]));
  }
  if (url.pathname.endsWith('/movie/top_rated')) {
    return jsonResponse(rawPage([rawMovie({ id: 30, title: 'Top Rated Movie' })]));
  }
  if (url.pathname.endsWith('/movie/now_playing')) {
    return jsonResponse(rawPage([rawMovie({ id: 40, title: 'Now Playing Movie' })]));
  }
  if (url.pathname.endsWith('/movie/upcoming')) {
    return jsonResponse(rawPage([rawMovie({ id: 50, title: 'Upcoming Movie' })]));
  }
  if (url.pathname.endsWith('/genre/movie/list')) {
    return jsonResponse({ genres: [{ id: 28, name: 'Action' }] });
  }
  if (url.pathname.endsWith('/discover/movie')) {
    return jsonResponse(rawPage([rawMovie({ id: 60, title: 'Discover Movie' })]));
  }
  return jsonResponse({ status_message: 'unexpected path' }, { status: 404 });
};

function renderHome() {
  const router = createMemoryRouter(appRoutes, { initialEntries: ['/'] });
  const queryClient = createQueryClient();
  // Keep failure tests fast: no retry backoff.
  queryClient.setDefaultOptions({ queries: { retry: false } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomePage', () => {
  it('loads the hero and all six rows from the API', async () => {
    stubApi(okHandler);
    renderHome();

    // Skeletons first…
    expect(
      await screen.findByRole('status', { name: 'Loading featured title' }),
    ).toBeInTheDocument();

    // …then real content.
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Trending One' }),
    ).toBeInTheDocument();
    for (const name of [
      'Trending Movies',
      'Popular Movies',
      'Popular TV',
      'Top Rated',
      'Now Playing',
      'Upcoming',
    ]) {
      expect(await screen.findByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(await screen.findByRole('link', { name: /Popular Show/ })).toHaveAttribute(
      'href',
      '/tv/20',
    );
    expect(await screen.findByRole('link', { name: /Popular Movie/ })).toHaveAttribute(
      'href',
      '/movie/10',
    );
    expect(await screen.findByRole('link', { name: /Top Rated Movie/ })).toHaveAttribute(
      'href',
      '/movie/30',
    );
  });

  it('has exactly one h1', async () => {
    stubApi(okHandler);
    renderHome();
    await screen.findByRole('heading', { level: 2, name: 'Trending One' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('only features titles that have a backdrop', async () => {
    stubApi(okHandler);
    renderHome();
    const hero = await screen.findByRole('region', { name: 'Featured titles' });
    // Two dots for two backdrop-bearing titles; the backdrop-less one is excluded.
    const dots = within(hero).getAllByRole('button', { name: /^Show / });
    expect(dots.map((dot) => dot.getAttribute('aria-label'))).toEqual([
      'Show Trending One',
      'Show Trending Two',
    ]);
  });

  it('lets the user switch the featured title', async () => {
    stubApi(okHandler);
    renderHome();
    await screen.findByRole('heading', { level: 2, name: 'Trending One' });
    await userEvent.click(screen.getByRole('button', { name: 'Show Trending Two' }));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Trending Two' }),
    ).toBeInTheDocument();
  });

  it('shares one trending request between the hero and the row', async () => {
    const fetchMock = stubApi(okHandler);
    renderHome();
    await screen.findByRole('heading', { level: 2, name: 'Trending One' });
    await screen.findByRole('link', { name: /Popular Show/ });

    const trendingCalls = fetchMock.mock.calls.filter(([input]) =>
      toUrlString(input).includes('/trending/movie/week'),
    );
    expect(trendingCalls).toHaveLength(1);
  });

  it('shows per-row errors without taking down the rest of the page', async () => {
    stubApi((url) =>
      url.pathname.endsWith('/tv/popular')
        ? jsonResponse({ status_message: 'boom' }, { status: 500 })
        : okHandler(url),
    );
    renderHome();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load Popular TV");
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Trending One' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Popular Movie/ })).toBeInTheDocument();
  });

  it('recovers when the user retries a failed row', async () => {
    let tvShouldFail = true;
    stubApi((url) =>
      url.pathname.endsWith('/tv/popular') && tvShouldFail
        ? jsonResponse({ status_message: 'boom' }, { status: 500 })
        : okHandler(url),
    );
    renderHome();

    await screen.findByRole('alert');
    tvShouldFail = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('link', { name: /Popular Show/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a readable error, never a blank page, when everything fails', async () => {
    stubApi(() => jsonResponse({ success: false, code: 'TMDB_NOT_CONFIGURED' }, { status: 503 }));
    renderHome();

    // Hero + six rows. Rows settle at slightly different times, so wait for the full count.
    await waitFor(() => {
      expect(screen.getAllByRole('alert')).toHaveLength(7);
    });
    const alerts = screen.getAllByRole('alert');
    expect(alerts[0]).toHaveTextContent(/not configured/i);
    expect(screen.getByRole('link', { name: 'MooBee home' })).toBeInTheDocument();
  });

  it('handles a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderHome();
    const alerts = await screen.findAllByRole('alert');
    expect(alerts[0]).toHaveTextContent(/couldn't reach the movie database/i);
  });

  it('copes with empty results', async () => {
    stubApi(() => jsonResponse(rawPage([])));
    renderHome();
    await waitFor(() => {
      expect(screen.getAllByText('Nothing here yet')).toHaveLength(6);
    });
    expect(screen.queryByRole('region', { name: 'Featured titles' })).toBeNull();
  });
});

describe('routing', () => {
  it('shows the app shell and the movies browse page', async () => {
    stubApi(okHandler);
    const { router } = renderHome();
    await router.navigate('/movies');
    expect(await screen.findByRole('heading', { level: 1, name: 'Movies' })).toBeInTheDocument();
    expect(await screen.findByText('Discover Movie')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });

  it('renders a 404 page for unknown routes', async () => {
    stubApi(okHandler);
    const { router } = renderHome();
    await router.navigate('/does/not/exist');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});
