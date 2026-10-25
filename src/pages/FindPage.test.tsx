import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { libraryStore } from '@/lib/libraryStore';
import { settingsStore } from '@/lib/settingsStore';
import { renderApp, stubApi, type ApiHandler } from '@/test/app';
import { jsonResponse, mediaItem, rawMovie, rawPage, rawTv } from '@/test/fixtures';
import { toUrlString } from '@/test/utils';

const KEY = 'sk-test-1234567890';

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

const known: Record<string, unknown> = {
  Heat: rawMovie({ id: 949, title: 'Heat', release_date: '1995-12-15' }),
  Alien: rawMovie({ id: 348, title: 'Alien', release_date: '1979-05-25' }),
  'Groundhog Day': rawMovie({ id: 137, title: 'Groundhog Day', release_date: '1993-02-12' }),
};

interface FindBody {
  apiKey: string;
  request: {
    ask: string;
    kind: string;
    count: number;
    taste: string[];
    history: { asked: string; suggested: string[] }[];
  };
}

/** A fake relay and TMDB. `answers` are served in order, one per message sent. */
const withFind = (
  answers: { status?: number; body: unknown }[],
): { handler: ApiHandler; bodies: () => FindBody[] } => {
  const seen: FindBody[] = [];
  let next = 0;
  const handler: ApiHandler = (url) => {
    if (url.pathname === '/api/ai/find') {
      const answer = answers[Math.min(next, answers.length - 1)];
      next += 1;
      return jsonResponse(answer?.body, answer?.status ? { status: answer.status } : {});
    }
    if (url.pathname.endsWith('/search/movie')) {
      const hit = known[url.searchParams.get('query') ?? ''];
      return jsonResponse(rawPage(hit ? [hit] : []));
    }
    if (url.pathname.endsWith('/search/tv')) {
      return url.searchParams.get('query') === 'Severance'
        ? jsonResponse(
            rawPage([rawTv({ id: 95396, name: 'Severance', first_air_date: '2022-02-18' })]),
          )
        : jsonResponse(rawPage([]));
    }
    return jsonResponse({ status_message: 'not found' }, { status: 404 });
  };
  return { handler, bodies: () => seen };
};

const reply = (picks: unknown[], text = 'Here are some ideas.') => ({
  body: { success: true, reply: text, picks },
});
const pick = (title: string, year: number, why: string, type = 'movie') => ({
  title,
  year,
  type,
  reason: why,
});

const cards = () => screen.findAllByRole('article');
const titles = (list: HTMLElement[]) =>
  list.map((card) => within(card).getByRole('heading', { level: 2 }).textContent);
/** Mounts the app at `path` and waits for the (lazy) Find page to show up. */
const open = async (path = '/find', options?: Parameters<typeof renderApp>[1]) => {
  const app = renderApp(path, options);
  await screen.findByRole('heading', { name: 'Find with AI' });
  return app;
};
const typeAndSend = async (text: string) => {
  await userEvent.type(screen.getByLabelText('What are you looking for?'), text);
  await userEvent.click(screen.getByRole('button', { name: 'Send' }));
};

describe('Find with AI page', () => {
  describe('without an AI key', () => {
    it('explains what is needed and points to Settings, with no message box', async () => {
      stubApi(() => jsonResponse({}, { status: 404 }));
      await open();
      expect(screen.getByRole('heading', { name: 'Find with AI' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Add an AI key in Settings' })).toHaveAttribute(
        'href',
        '/settings',
      );
      expect(screen.getByRole('link', { name: 'Surprise me' })).toHaveAttribute(
        'href',
        '/surprise',
      );
      expect(screen.queryByLabelText('What are you looking for?')).toBeNull();
    });
  });

  describe('with an AI key', () => {
    it('shows a way to start and no answers yet', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      stubApi(() => jsonResponse({}, { status: 404 }));
      await open();
      expect(screen.getByLabelText('What are you looking for?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /relives the same day/ })).toBeInTheDocument();
      expect(screen.queryByRole('article')).toBeNull();
    });

    it('sends the message and the key, then shows the reply and only the titles TMDB knows', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      libraryStore.toggleFavorite(mediaItem({ id: 1, title: 'Blade Runner', year: 1982 }));
      const { handler } = withFind([
        reply(
          [
            pick('Heat', 1995, 'Cat and mouse, perfectly paced.'),
            pick('Made Up Film', 2001, 'Not real.'),
            pick('Severance', 2022, 'Work, but wrong.', 'tv'),
          ],
          'Two crime thrillers and a strange office.',
        ),
      ]);
      const fetchMock = stubApi(handler);
      await open();

      await typeAndSend('a tense thriller');

      expect(await screen.findByText('Two crime thrillers and a strange office.')).toBeVisible();
      expect(titles(await cards()).sort()).toEqual(['Heat', 'Severance']);
      expect(screen.getByText('Cat and mouse, perfectly paced.')).toBeInTheDocument();
      expect(screen.queryByText('Made Up Film')).toBeNull();
      expect(screen.getByText('a tense thriller')).toBeInTheDocument();
      expect(screen.getByLabelText('What are you looking for?')).toHaveValue('');

      const call = fetchMock.mock.calls.find(([input]) => toUrlString(input) === '/api/ai/find');
      const body = JSON.parse(call?.[1]?.body as string) as FindBody;
      expect(body.apiKey).toBe(KEY);
      expect(body.request).toMatchObject({
        ask: 'a tense thriller',
        kind: 'any',
        count: 8,
        history: [],
        taste: ['Blade Runner (1982)'],
      });
    });

    it('sends a follow-up with the earlier ask and what was shown, and never shows a title twice', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      const { handler } = withFind([
        reply([pick('Heat', 1995, 'First answer.')]),
        reply([pick('Heat', 1995, 'Again.'), pick('Alien', 1979, 'Space dread.')]),
      ]);
      const fetchMock = stubApi(handler);
      await open();

      await typeAndSend('a tense thriller');
      await screen.findByText('First answer.');
      await typeAndSend('older and scarier');
      await screen.findByText('Space dread.');

      // Heat is shown once: the second answer's repeat is dropped.
      expect(titles(await cards())).toEqual(['Heat', 'Alien']);
      expect(screen.queryByText('Again.')).toBeNull();

      const calls = fetchMock.mock.calls.filter(([input]) => toUrlString(input) === '/api/ai/find');
      const second = JSON.parse(calls[1]?.[1]?.body as string) as FindBody;
      expect(second.request.ask).toBe('older and scarier');
      expect(second.request.history).toEqual([{ asked: 'a tense thriller', suggested: ['Heat'] }]);
    });

    it('passes the chosen kind', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      const { handler } = withFind([reply([pick('Heat', 1995, 'Ok.')])]);
      const fetchMock = stubApi(handler);
      await open();

      await userEvent.click(screen.getByRole('button', { name: 'Anime' }));
      await typeAndSend('robots');
      await screen.findByText('Ok.');

      const call = fetchMock.mock.calls.find(([input]) => toUrlString(input) === '/api/ai/find');
      expect((JSON.parse(call?.[1]?.body as string) as FindBody).request.kind).toBe('anime');
    });

    it('sends an example in one tap', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      const { handler } = withFind([
        reply([pick('Groundhog Day', 1993, 'The same day, again.')], 'That sounds like this one.'),
      ]);
      const fetchMock = stubApi(handler);
      await open();

      await userEvent.click(screen.getByRole('button', { name: /relives the same day/ }));

      expect(await screen.findByText('The same day, again.')).toBeInTheDocument();
      const call = fetchMock.mock.calls.find(([input]) => toUrlString(input) === '/api/ai/find');
      expect((JSON.parse(call?.[1]?.body as string) as FindBody).request.ask).toMatch(
        /relives the same day/,
      );
    });

    it('shows the AI’s question when it needs more to go on', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      const { handler } = withFind([reply([], 'Do you feel like a movie or a series?')]);
      stubApi(handler);
      await open();

      await typeAndSend('something good');

      expect(await screen.findByText('Do you feel like a movie or a series?')).toBeVisible();
      expect(screen.queryByRole('article')).toBeNull();
    });

    it('says so when none of the AI’s titles can be found', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      const { handler } = withFind([reply([pick('Made Up Film', 2001, 'Not real.')])]);
      stubApi(handler);
      await open();

      await typeAndSend('anything');

      expect(await screen.findByText(/Nothing new came up/)).toBeInTheDocument();
      expect(screen.queryByRole('article')).toBeNull();
    });

    it('explains a rejected key and lets the viewer try again', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      const { handler } = withFind([
        { status: 401, body: { success: false, code: 'AI_KEY_REJECTED', message: 'no' } },
        reply([pick('Heat', 1995, 'Worked this time.')]),
      ]);
      stubApi(handler);
      await open();

      await typeAndSend('a tense thriller');
      expect(await screen.findByText(/rejected this API key/)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /Try again|Retry/ }));
      expect(await screen.findByText('Worked this time.')).toBeInTheDocument();
      expect(screen.queryByText(/rejected this API key/)).toBeNull();
      // The retry replaced the failed message; it did not stack a second copy of the ask.
      expect(screen.getAllByText('a tense thriller')).toHaveLength(1);
    });

    it('ignores an empty message', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      const fetchMock = stubApi(() => jsonResponse({}, { status: 404 }));
      await open();
      await userEvent.type(screen.getByLabelText('What are you looking for?'), '   ');
      expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('starts over', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      const { handler } = withFind([reply([pick('Heat', 1995, 'First answer.')])]);
      stubApi(handler);
      await open();
      await typeAndSend('a tense thriller');
      await screen.findByText('First answer.');

      await userEvent.click(screen.getByRole('button', { name: 'Start over' }));

      expect(screen.queryByRole('article')).toBeNull();
      expect(screen.getByRole('button', { name: /relives the same day/ })).toBeInTheDocument();
    });

    it('keeps the conversation when the viewer opens a title and comes back', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      const { handler } = withFind([reply([pick('Heat', 1995, 'First answer.')])]);
      stubApi(handler);
      const { router } = await open();
      await typeAndSend('a tense thriller');
      await screen.findByText('First answer.');

      await router.navigate('/watchlist');
      await router.navigate('/find');

      expect(await screen.findByText('First answer.')).toBeInTheDocument();
      expect(titles(await cards())).toEqual(['Heat']);
    });

    it('fills the box from ?ask= without sending it', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      const fetchMock = stubApi(() => jsonResponse({}, { status: 404 }));
      await open('/find?ask=the%20one%20with%20the%20boat');
      expect(screen.getByLabelText('What are you looking for?')).toHaveValue(
        'the one with the boat',
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not tell the AI about My List when personalizing is off', async () => {
      settingsStore.update({ ai: { apiKey: KEY }, surprise: { personalize: false } });
      libraryStore.toggleFavorite(mediaItem({ id: 1, title: 'Blade Runner', year: 1982 }));
      const { handler } = withFind([reply([pick('Heat', 1995, 'Ok.')])]);
      const fetchMock = stubApi(handler);
      await open();
      await typeAndSend('anything');
      await waitFor(() => {
        expect(screen.getAllByRole('article')).toHaveLength(1);
      });
      const call = fetchMock.mock.calls.find(([input]) => toUrlString(input) === '/api/ai/find');
      expect((JSON.parse(call?.[1]?.body as string) as FindBody).request.taste).toEqual([]);
    });
  });
});
