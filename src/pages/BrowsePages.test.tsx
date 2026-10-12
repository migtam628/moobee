import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp, requestedUrls, stubApi, type ApiHandler } from '@/test/app';
import { jsonResponse, rawMovie, rawPage, rawTv } from '@/test/fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
});

const movieHandler: ApiHandler = (url) => {
  if (url.pathname.endsWith('/genre/movie/list')) {
    return jsonResponse({
      genres: [
        { id: 28, name: 'Action' },
        { id: 18, name: 'Drama' },
      ],
    });
  }
  if (url.pathname.endsWith('/discover/movie')) {
    const genre = url.searchParams.get('with_genres');
    if (genre === '28') {
      return jsonResponse(rawPage([rawMovie({ id: 2, title: 'Action Movie' })]));
    }
    return jsonResponse(rawPage([rawMovie({ id: 1, title: 'Popular Movie' })], { total_pages: 2 }));
  }
  return jsonResponse({ status_message: 'not found' }, { status: 404 });
};

describe('Movies browse page', () => {
  it('lists discovered movies and the genre filter', async () => {
    stubApi(movieHandler);
    renderApp('/movies');

    expect(await screen.findByRole('heading', { level: 1, name: 'Movies' })).toBeInTheDocument();
    expect(await screen.findByText('Popular Movie')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('refetches when a genre pill is clicked, and reflects it in the URL', async () => {
    const fetchMock = stubApi(movieHandler);
    const { router } = renderApp('/movies');
    await screen.findByText('Popular Movie');

    await userEvent.click(screen.getByRole('button', { name: 'Action' }));
    expect(await screen.findByText('Action Movie')).toBeInTheDocument();
    expect(screen.queryByText('Popular Movie')).toBeNull();

    expect(router.state.location.search).toBe('?genre=28');
    expect(requestedUrls(fetchMock).some((u) => u.searchParams.get('with_genres') === '28')).toBe(
      true,
    );
  });

  it('changes the sort order via the select and updates the URL', async () => {
    stubApi(movieHandler);
    const { router } = renderApp('/movies');
    await screen.findByText('Popular Movie');

    await userEvent.selectOptions(screen.getByRole('combobox'), 'Top Rated');
    await waitFor(() => expect(router.state.location.search).toBe('?sort=rating'));
  });

  it('shows a "load more" button when another page is available', async () => {
    stubApi(movieHandler);
    renderApp('/movies');
    await screen.findByText('Popular Movie');
    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument();
  });

  it('shows an error state with a working retry', async () => {
    const fetchMock = stubApi(() => jsonResponse({ status_message: 'boom' }, { status: 500 }));
    renderApp('/movies');

    expect(await screen.findByText("Couldn't load movies")).toBeInTheDocument();
    fetchMock.mockClear();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe('TV shows browse page', () => {
  it('lists discovered shows via /discover/tv', async () => {
    stubApi((url) => {
      if (url.pathname.endsWith('/genre/tv/list')) {
        return jsonResponse({ genres: [{ id: 18, name: 'Drama' }] });
      }
      if (url.pathname.endsWith('/discover/tv')) {
        return jsonResponse(rawPage([rawTv({ id: 1, name: 'A Great Show' })]));
      }
      return jsonResponse({ status_message: 'not found' }, { status: 404 });
    });
    renderApp('/tv');

    expect(await screen.findByRole('heading', { level: 1, name: 'TV Shows' })).toBeInTheDocument();
    expect(await screen.findByText('A Great Show')).toBeInTheDocument();
  });
});

const animeHandler: ApiHandler = (url) => {
  if (url.pathname.endsWith('/genre/movie/list')) {
    return jsonResponse({
      genres: [
        { id: 16, name: 'Animation' },
        { id: 14, name: 'Fantasy' },
      ],
    });
  }
  if (url.pathname.endsWith('/genre/tv/list')) {
    return jsonResponse({
      genres: [
        { id: 16, name: 'Animation' },
        { id: 10759, name: 'Action & Adventure' },
      ],
    });
  }
  if (url.pathname.endsWith('/discover/movie')) {
    const genre = url.searchParams.get('with_genres');
    if (genre === '16,14') {
      return jsonResponse(rawPage([rawMovie({ id: 3, title: 'Fantasy Anime Movie' })]));
    }
    return jsonResponse(rawPage([rawMovie({ id: 2, title: 'Anime Movie' })]));
  }
  if (url.pathname.endsWith('/discover/tv')) {
    return jsonResponse(rawPage([rawTv({ id: 5, name: 'Anime Series' })]));
  }
  return jsonResponse({ status_message: 'not found' }, { status: 404 });
};

describe('Anime browse page', () => {
  it('defaults to anime movies, restricted to Animation + Japanese', async () => {
    const fetchMock = stubApi(animeHandler);
    renderApp('/anime');

    expect(await screen.findByRole('heading', { level: 1, name: 'Anime' })).toBeInTheDocument();
    expect(await screen.findByText('Anime Movie')).toBeInTheDocument();
    expect(
      requestedUrls(fetchMock).some(
        (u) =>
          u.pathname.endsWith('/discover/movie') &&
          u.searchParams.get('with_genres') === '16' &&
          u.searchParams.get('with_original_language') === 'ja',
      ),
    ).toBe(true);
    // The base "Animation" genre is the fixed filter, so it isn't offered as its own pill.
    expect(screen.queryByRole('button', { name: 'Animation' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Fantasy' })).toBeInTheDocument();
  });

  it('switches to anime series via the toggle, fetching the TV genre list and /discover/tv', async () => {
    const fetchMock = stubApi(animeHandler);
    renderApp('/anime');
    await screen.findByText('Anime Movie');

    await userEvent.click(screen.getByRole('button', { name: 'Series' }));
    expect(await screen.findByText('Anime Series')).toBeInTheDocument();
    expect(screen.queryByText('Anime Movie')).toBeNull();
    expect(screen.getByRole('button', { name: 'Action & Adventure' })).toBeInTheDocument();
    expect(
      requestedUrls(fetchMock).some(
        (u) =>
          u.pathname.endsWith('/discover/tv') &&
          u.searchParams.get('with_genres') === '16' &&
          u.searchParams.get('with_original_language') === 'ja',
      ),
    ).toBe(true);
  });

  it('ANDs a picked genre with the anime base genre and reflects it in the URL', async () => {
    stubApi(animeHandler);
    const { router } = renderApp('/anime');
    await screen.findByText('Anime Movie');

    await userEvent.click(screen.getByRole('button', { name: 'Fantasy' }));
    expect(await screen.findByText('Fantasy Anime Movie')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?genre=14');
  });

  it('clears the genre filter when switching between movies and series', async () => {
    stubApi(animeHandler);
    const { router } = renderApp('/anime');
    await screen.findByText('Anime Movie');

    await userEvent.click(screen.getByRole('button', { name: 'Fantasy' }));
    await screen.findByText('Fantasy Anime Movie');
    expect(router.state.location.search).toBe('?genre=14');

    await userEvent.click(screen.getByRole('button', { name: 'Series' }));
    await screen.findByText('Anime Series');
    expect(router.state.location.search).toBe('?kind=tv');
  });
});
