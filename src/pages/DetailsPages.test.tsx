import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp, requestedUrls, stubApi, type ApiHandler } from '@/test/app';
import { jsonResponse, rawMovieDetails, rawTvDetails } from '@/test/fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
});

const movieHandler =
  (overrides: Record<string, unknown> = {}): ApiHandler =>
  (url) =>
    url.pathname.endsWith('/movie/550')
      ? jsonResponse(rawMovieDetails(overrides))
      : jsonResponse({ status_message: 'not found' }, { status: 404 });

describe('movie details page', () => {
  it('shows the hero facts, cast, providers and related rows', async () => {
    stubApi(movieHandler());
    renderApp('/movie/550');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fight Club' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Poster for Fight Club' })).toBeInTheDocument();
    // Scoped to the hero: related cards on the page also show a year and a rating.
    const hero = screen.getByRole('region', { name: 'Fight Club' });
    expect(within(hero).getByText('Mischief. Mayhem. Soap.')).toBeInTheDocument();
    expect(within(hero).getByText('R')).toBeInTheDocument();
    expect(within(hero).getByText('1999')).toBeInTheDocument();
    expect(within(hero).getByText('2h 19m')).toBeInTheDocument();
    expect(within(hero).getByRole('img', { name: 'Rated 8.4 out of 10' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Genres' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(screen.getByText('David Fincher')).toBeInTheDocument();
    expect(screen.getByText('The Narrator')).toBeInTheDocument();

    const providers = screen.getByRole('region', { name: 'Where to watch' });
    expect(within(providers).getByText('StreamCo')).toBeInTheDocument();
    expect(within(providers).getByText(/Data provided by JustWatch/)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Pulp Fiction/ })).toHaveAttribute(
      'href',
      '/movie/680',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Similar movies' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Se7en/ })).toHaveAttribute('href', '/movie/807');
  });

  it('makes exactly one request, with the appended sections', async () => {
    const fetchMock = stubApi(movieHandler());
    renderApp('/movie/550');
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' });

    const urls = requestedUrls(fetchMock).filter((url) => url.pathname.includes('/movie/550'));
    expect(urls).toHaveLength(1);
    expect(urls[0]?.searchParams.get('append_to_response')).toContain('credits');
  });

  it('sets the document title', async () => {
    stubApi(movieHandler());
    renderApp('/movie/550');
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' });
    expect(document.title).toBe('Fight Club · MooBee');
  });

  it('does not repeat recommended titles under "Similar"', async () => {
    stubApi(
      movieHandler({
        similar: {
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [
            { ...JSON.parse(JSON.stringify(rawMovieDetails().recommendations.results[0])) },
          ],
        },
      }),
    );
    renderApp('/movie/550');
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' });

    expect(screen.getAllByRole('link', { name: /Pulp Fiction/ })).toHaveLength(1);
    expect(screen.queryByRole('heading', { level: 2, name: 'Similar movies' })).toBeNull();
  });

  it('opens the trailer in a privacy-enhanced embed and closes it with Escape', async () => {
    stubApi(movieHandler());
    renderApp('/movie/550');
    const button = await screen.findByRole('button', { name: /Watch trailer/ });

    await userEvent.click(button);
    const dialog = screen.getByRole('dialog');
    const frame = within(dialog).getByTitle('Trailer for Fight Club');
    expect(frame.getAttribute('src')).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/SUXWAEX2jlg\?/,
    );

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('degrades gracefully when optional data is missing', async () => {
    stubApi(
      movieHandler({
        videos: { results: [] },
        credits: { cast: [], crew: [] },
        'watch/providers': { results: {} },
        recommendations: { page: 1, results: [], total_pages: 0, total_results: 0 },
        similar: undefined,
        tagline: '',
        runtime: null,
        release_dates: undefined,
        poster_path: null,
        backdrop_path: null,
      }),
    );
    renderApp('/movie/550');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fight Club' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Watch trailer/ })).toBeNull();
    expect(screen.queryByRole('heading', { level: 2, name: 'Cast' })).toBeNull();
    expect(screen.queryByRole('heading', { level: 2, name: 'More like this' })).toBeNull();
    expect(screen.getByText(/No streaming information is available/)).toBeInTheDocument();
  });

  it('shows a loading state first', async () => {
    stubApi(movieHandler());
    renderApp('/movie/550');
    expect(await screen.findByRole('status', { name: 'Loading details' })).toBeInTheDocument();
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' });
    expect(screen.queryByRole('status', { name: 'Loading details' })).toBeNull();
  });

  it('shows "not found" for an unknown movie, not a generic error', async () => {
    stubApi(() => jsonResponse({ status_message: 'nope' }, { status: 404 }));
    renderApp('/movie/999999');
    expect(await screen.findByText("We couldn't find that movie")).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });

  it.each(['abc', '0', '-3', '12abc', '1e3'])(
    'shows "not found" for the invalid id "%s" without calling the API',
    async (id) => {
      const fetchMock = stubApi(movieHandler());
      renderApp(`/movie/${id}`);
      expect(await screen.findByText("We couldn't find that movie")).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('shows a retryable error on server failure', async () => {
    let failing = true;
    stubApi((url) =>
      failing ? jsonResponse({ status_message: 'boom' }, { status: 500 }) : movieHandler()(url),
    );
    renderApp('/movie/550');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load this movie");

    failing = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fight Club' }),
    ).toBeInTheDocument();
  });

  it('shows a configuration hint-free readable error when the proxy has no token', async () => {
    stubApi(() => jsonResponse({ success: false, code: 'TMDB_NOT_CONFIGURED' }, { status: 503 }));
    renderApp('/movie/550');
    expect(await screen.findByRole('alert')).toHaveTextContent(/not configured/i);
  });

  it('navigates from a related title to its own details page', async () => {
    stubApi((url) => {
      if (url.pathname.endsWith('/movie/550')) return jsonResponse(rawMovieDetails());
      if (url.pathname.endsWith('/movie/680')) {
        return jsonResponse(
          rawMovieDetails({
            id: 680,
            title: 'Pulp Fiction',
            tagline: 'Just because you are a character.',
          }),
        );
      }
      return jsonResponse({}, { status: 404 });
    });
    const { router } = renderApp('/movie/550');

    await userEvent.click(await screen.findByRole('link', { name: /Pulp Fiction/ }));
    expect(router.state.location.pathname).toBe('/movie/680');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pulp Fiction' }),
    ).toBeInTheDocument();
  });
});

describe('tv details page', () => {
  const tvHandler =
    (overrides: Record<string, unknown> = {}): ApiHandler =>
    (url) =>
      url.pathname.endsWith('/tv/1396')
        ? jsonResponse(rawTvDetails(overrides))
        : jsonResponse({ status_message: 'not found' }, { status: 404 });

  it('shows years, seasons, creators, network and status', async () => {
    stubApi(tvHandler());
    renderApp('/tv/1396');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Breaking Bad' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2008–2013')).toBeInTheDocument();
    expect(screen.getByText('5 seasons')).toBeInTheDocument();
    expect(screen.getByText('62 episodes')).toBeInTheDocument();
    expect(screen.getByText('TV-MA')).toBeInTheDocument();
    expect(screen.getByText('Vince Gilligan')).toBeInTheDocument();
    expect(screen.getByText('AMC')).toBeInTheDocument();
    expect(screen.getByText('Ended')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Similar shows' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Better Call Saul/ })).toHaveAttribute(
      'href',
      '/tv/60059',
    );
  });

  it('uses the TV namespace: a movie id does not resolve as a show', async () => {
    const fetchMock = stubApi((url) =>
      url.pathname.endsWith('/movie/1396')
        ? jsonResponse(rawMovieDetails({ id: 1396 }))
        : jsonResponse({ status_message: 'not found' }, { status: 404 }),
    );
    renderApp('/tv/1396');

    expect(await screen.findByText("We couldn't find that show")).toBeInTheDocument();
    expect(requestedUrls(fetchMock).every((url) => url.pathname.includes('/tv/1396'))).toBe(true);
  });
});
