import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { libraryStore } from '@/lib/libraryStore';
import { settingsStore } from '@/lib/settingsStore';
import { renderApp, requestedUrls, stubApi, type ApiHandler } from '@/test/app';
import { toUrlString } from '@/test/utils';
import { jsonResponse, mediaItem, rawMovie, rawPage, rawTv } from '@/test/fixtures';

afterEach(() => {
  window.localStorage.clear();
});

const movies = (n = 8) =>
  Array.from({ length: n }, (_, i) =>
    rawMovie({
      id: 100 + i,
      title: `Movie ${String(i)}`,
      release_date: `${String(2000 + i)}-01-01`,
    }),
  );
const shows = (n = 8) =>
  Array.from({ length: n }, (_, i) =>
    rawTv({ id: 200 + i, name: `Show ${String(i)}`, first_air_date: `${String(2010 + i)}-01-01` }),
  );

const api: ApiHandler = (url) => {
  if (url.pathname.endsWith('/discover/movie')) return jsonResponse(rawPage(movies()));
  if (url.pathname.endsWith('/discover/tv')) return jsonResponse(rawPage(shows()));
  return jsonResponse({ status_message: 'not found' }, { status: 404 });
};

const cards = () => screen.findAllByRole('article');
const titles = (list: HTMLElement[]) =>
  list.map((card) => within(card).getByRole('heading', { level: 2 }).textContent);

describe('Surprise page', () => {
  it('still deals its first hand when React runs the effects twice (StrictMode)', async () => {
    stubApi(api);
    renderApp('/surprise', { strict: true });
    expect(await cards()).toHaveLength(3);
  });

  it('opens with a hand of three picks, movies and series mixed', async () => {
    stubApi(api);
    renderApp('/surprise');

    const list = await cards();
    expect(list).toHaveLength(3);
    const kinds = list.map((card) =>
      within(card)
        .getByText(/^(Movie|TV) ·/)
        .textContent?.slice(0, 2),
    );
    expect(new Set(kinds).size).toBe(2);
    expect(screen.getByRole('button', { name: 'Shuffle again' })).toBeEnabled();
  });

  it('shuffles from the pool without asking TMDB again, and never repeats a pick', async () => {
    const fetchMock = stubApi(api);
    renderApp('/surprise');
    const first = titles(await cards());
    const callsAfterFirst = fetchMock.mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: 'Shuffle again' }));
    await waitFor(() => {
      expect(titles(screen.getAllByRole('article'))).not.toEqual(first);
    });
    const second = titles(screen.getAllByRole('article'));

    expect(second.some((title) => first.includes(title))).toBe(false);
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
  });

  it('asks for more once the pool is used up', async () => {
    const fetchMock = stubApi(api);
    renderApp('/surprise');
    await cards();
    // 16 candidates, 3 dealt per tap: six taps run it dry and the seventh must fetch again.
    for (let tap = 0; tap < 6; tap += 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Shuffle again' }));
      await cards();
    }
    expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('draws only movies when Movies is chosen', async () => {
    const fetchMock = stubApi(api);
    renderApp('/surprise');
    await cards();
    fetchMock.mockClear();

    await userEvent.click(screen.getByRole('button', { name: 'Movies' }));
    await userEvent.click(screen.getByRole('button', { name: 'Shuffle again' }));
    await waitFor(() => {
      expect(requestedUrls(fetchMock).length).toBeGreaterThan(0);
    });

    const urls = requestedUrls(fetchMock).map((url) => url.pathname);
    expect(urls.every((path) => path.endsWith('/discover/movie'))).toBe(true);
    const list = await cards();
    expect(list.every((card) => within(card).queryByText(/^Movie ·/) !== null)).toBe(true);
  });

  it('narrows by mood using the genres of each type', async () => {
    const fetchMock = stubApi(api);
    renderApp('/surprise');
    await cards();
    fetchMock.mockClear();

    await userEvent.click(screen.getByRole('button', { name: 'Make me laugh' }));
    expect(screen.getByRole('button', { name: 'Make me laugh' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Shuffle again' }));
    await waitFor(() => {
      expect(requestedUrls(fetchMock).length).toBe(2);
    });
    expect(
      requestedUrls(fetchMock).every((url) => url.searchParams.get('with_genres') === '35'),
    ).toBe(true);

    // Pressing the mood again takes it off.
    await userEvent.click(screen.getByRole('button', { name: 'Make me laugh' }));
    expect(screen.getByRole('button', { name: 'Make me laugh' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('asks for Japanese animation when Anime is chosen', async () => {
    const fetchMock = stubApi(api);
    renderApp('/surprise');
    await cards();
    fetchMock.mockClear();

    await userEvent.click(screen.getByRole('button', { name: 'Anime' }));
    await userEvent.click(screen.getByRole('button', { name: 'Shuffle again' }));
    await waitFor(() => {
      expect(requestedUrls(fetchMock).length).toBe(2);
    });
    for (const url of requestedUrls(fetchMock)) {
      expect(url.searchParams.get('with_genres')).toBe('16');
      expect(url.searchParams.get('with_original_language')).toBe('ja');
    }
  });

  it('starts on the kind chosen in Settings and deals the number chosen there', async () => {
    settingsStore.update({ surprise: { kind: 'tv', count: 5 } });
    stubApi(api);
    renderApp('/surprise');

    const list = await cards();
    expect(list).toHaveLength(5);
    expect(list.every((card) => within(card).queryByText(/^TV ·/) !== null)).toBe(true);
    expect(screen.getByRole('button', { name: 'Anything' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Series' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves out what is already in My List, and keeps it in when asked to', async () => {
    const onlyThree: ApiHandler = (url) =>
      url.pathname.endsWith('/discover/movie')
        ? jsonResponse(rawPage(movies(4)))
        : jsonResponse(rawPage([]));
    settingsStore.update({ surprise: { kind: 'movie' } });
    libraryStore.toggleWatchlist(mediaItem({ id: 100, title: 'Movie 0' }));
    stubApi(onlyThree);
    renderApp('/surprise');

    const list = await cards();
    expect(titles(list)).not.toContain('Movie 0');
    expect(list).toHaveLength(3);
  });

  it('swaps one pick for another from the pool', async () => {
    stubApi(api);
    renderApp('/surprise');
    const list = await cards();
    const before = titles(list);

    await userEvent.click(within(list[0]!).getByRole('button', { name: /^Swap/ }));

    const after = titles(screen.getAllByRole('article'));
    expect(after[0]).not.toBe(before[0]);
    expect(after.slice(1)).toEqual(before.slice(1));
    expect(before).not.toContain(after[0]);
  });

  it('adds a pick to the watchlist from its card', async () => {
    stubApi(api);
    renderApp('/surprise');
    const [card] = await cards();
    await userEvent.click(within(card!).getByRole('button', { name: /Add to Watchlist/ }));
    expect(libraryStore.getSnapshot().watchlist).toHaveLength(1);
  });

  it('links each pick to its details page', async () => {
    stubApi(api);
    renderApp('/surprise');
    const [card] = await cards();
    const href = within(card!).getByRole('link', { name: 'Details' }).getAttribute('href');
    expect(href).toMatch(/^\/(movie|tv)\/\d+$/);
  });

  it('says so and offers a retry when TMDB fails', async () => {
    stubApi(() => jsonResponse({ status_message: 'nope' }, { status: 500 }));
    renderApp('/surprise');
    expect(await screen.findByText("Couldn't find picks")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again|Retry/ })).toBeInTheDocument();
  });

  describe('without an AI key', () => {
    it('points to Settings instead of showing the AI controls', async () => {
      stubApi(api);
      renderApp('/surprise');
      await cards();
      expect(screen.getByRole('link', { name: 'Add an AI key in Settings' })).toHaveAttribute(
        'href',
        '/settings',
      );
      expect(screen.queryByRole('switch', { name: /Ask AI/ })).toBeNull();
    });
  });

  describe('with an AI key', () => {
    const KEY = 'sk-test-1234567890';
    const withAi =
      (overrides: Partial<{ picks: unknown; status: number }> = {}): ApiHandler =>
      (url) => {
        if (url.pathname === '/api/ai/picks') {
          return jsonResponse(
            overrides.status && overrides.status >= 400
              ? { code: 'AI_KEY_REJECTED', message: 'no' }
              : {
                  success: true,
                  picks: overrides.picks ?? [
                    {
                      title: 'Heat',
                      year: 1995,
                      type: 'movie',
                      reason: 'Cat and mouse, perfectly paced.',
                    },
                    { title: 'Made Up Film', year: 2001, type: 'movie', reason: 'Not real.' },
                    { title: 'Severance', year: 2022, type: 'tv', reason: 'Work, but wrong.' },
                    { title: 'Alien', year: 1979, type: 'movie', reason: 'Space dread.' },
                  ],
                },
            overrides.status ? { status: overrides.status } : {},
          );
        }
        if (url.pathname.endsWith('/search/movie')) {
          const query = url.searchParams.get('query');
          const known: Record<string, unknown> = {
            Heat: rawMovie({ id: 949, title: 'Heat', release_date: '1995-12-15' }),
            Alien: rawMovie({ id: 348, title: 'Alien', release_date: '1979-05-25' }),
          };
          const hit = known[query ?? ''];
          return jsonResponse(rawPage(hit ? [hit] : []));
        }
        if (url.pathname.endsWith('/search/tv')) {
          return url.searchParams.get('query') === 'Severance'
            ? jsonResponse(
                rawPage([rawTv({ id: 95396, name: 'Severance', first_air_date: '2022-02-18' })]),
              )
            : jsonResponse(rawPage([]));
        }
        return api(url);
      };

    it('shows the AI controls', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      stubApi(api);
      renderApp('/surprise');
      await cards();
      expect(screen.getByRole('switch', { name: /Ask AI/ })).toBeChecked();
      expect(screen.getByLabelText(/Anything specific/)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Add an AI key in Settings' })).toBeNull();
    });

    it('asks the AI, shows only the titles TMDB knows, with the AI’s reasons', async () => {
      settingsStore.update({ ai: { apiKey: KEY }, surprise: { count: 3 } });
      libraryStore.toggleFavorite(mediaItem({ id: 1, title: 'Blade Runner', year: 1982 }));
      const fetchMock = stubApi(withAi());
      renderApp('/surprise');
      await cards();

      await userEvent.type(screen.getByLabelText(/Anything specific/), 'tense and smart');
      await userEvent.click(screen.getByRole('button', { name: 'Edge of my seat' }));
      await userEvent.click(screen.getByRole('button', { name: 'Shuffle again (AI)' }));

      await screen.findByText('Cat and mouse, perfectly paced.');
      const list = screen.getAllByRole('article');
      expect(titles(list).sort()).toEqual(['Alien', 'Heat', 'Severance']);
      expect(screen.queryByText('Made Up Film')).toBeNull();
      expect(screen.getByText('Space dread.')).toBeInTheDocument();

      const aiCall = fetchMock.mock.calls.find(([input]) => toUrlString(input) === '/api/ai/picks');
      const body = JSON.parse(aiCall?.[1]?.body as string) as {
        apiKey: string;
        provider: string;
        request: { prompt: string; mood: string; taste: string[]; count: number; kind: string };
      };
      expect(body.apiKey).toBe(KEY);
      expect(body.provider).toBe('anthropic');
      expect(body.request).toMatchObject({
        prompt: 'tense and smart',
        mood: 'Edge of my seat',
        taste: ['Blade Runner (1982)'],
        kind: 'any',
        count: 9,
      });
    });

    it('does not tell the AI about My List when personalizing is off', async () => {
      settingsStore.update({ ai: { apiKey: KEY }, surprise: { personalize: false } });
      libraryStore.toggleFavorite(mediaItem({ id: 1, title: 'Blade Runner', year: 1982 }));
      const fetchMock = stubApi(withAi());
      renderApp('/surprise');
      await cards();
      await userEvent.click(screen.getByRole('button', { name: 'Shuffle again (AI)' }));
      await screen.findByText('Cat and mouse, perfectly paced.');

      const aiCall = fetchMock.mock.calls.find(([input]) => toUrlString(input) === '/api/ai/picks');
      const body = JSON.parse(aiCall?.[1]?.body as string) as {
        request: { taste: string[] };
      };
      expect(body.request.taste).toEqual([]);
    });

    it('falls back to random picks, and says so, when the AI fails', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      stubApi(withAi({ status: 401 }));
      renderApp('/surprise');
      await cards();

      await userEvent.click(screen.getByRole('button', { name: 'Shuffle again (AI)' }));

      expect(await screen.findByText(/random picks instead/)).toBeInTheDocument();
      expect(await cards()).toHaveLength(3);
    });

    it('falls back when none of the AI’s titles check out', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      stubApi(
        withAi({ picks: [{ title: 'Totally Invented', year: 2020, type: 'movie', reason: 'x' }] }),
      );
      renderApp('/surprise');
      await cards();
      await userEvent.click(screen.getByRole('button', { name: 'Shuffle again (AI)' }));
      expect(await screen.findByText(/nothing new that checks out/)).toBeInTheDocument();
      expect(await cards()).toHaveLength(3);
    });

    it('uses random picks when the AI switch is off', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      const fetchMock = stubApi(withAi());
      renderApp('/surprise');
      await cards();
      await userEvent.click(screen.getByRole('switch', { name: /Ask AI/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Shuffle again' }));
      await cards();
      expect(fetchMock.mock.calls.some(([input]) => toUrlString(input) === '/api/ai/picks')).toBe(
        false,
      );
    });
  });
});
