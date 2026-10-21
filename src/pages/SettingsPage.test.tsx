import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { libraryStore } from '@/lib/libraryStore';
import { settingsStore } from '@/lib/settingsStore';
import { renderApp, stubApi } from '@/test/app';
import { toUrlString } from '@/test/utils';
import { jsonResponse, mediaItem } from '@/test/fixtures';

afterEach(() => {
  window.localStorage.clear();
});

const KEY = 'sk-test-1234567890';

describe('Settings page', () => {
  it('opens from the header and has its sections', async () => {
    renderApp('/');
    await userEvent.click(await screen.findByRole('link', { name: 'Settings' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    for (const name of ['AI', 'Surprise me', 'Playback', 'Your lists', 'Reset']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
  });

  describe('AI', () => {
    it('keeps the key hidden until asked, and saves it as you type', async () => {
      renderApp('/settings');
      const field = await screen.findByLabelText('API key');
      expect(field).toHaveAttribute('type', 'password');

      await userEvent.type(field, KEY);
      expect(settingsStore.getSnapshot().ai.apiKey).toBe(KEY);
      expect(window.localStorage.getItem('moobee:settings:v1')).toContain(KEY);

      await userEvent.click(screen.getByRole('button', { name: 'Show API key' }));
      expect(field).toHaveAttribute('type', 'text');
      await userEvent.click(screen.getByRole('button', { name: 'Hide API key' }));
      expect(field).toHaveAttribute('type', 'password');
    });

    it('switches provider and shows that provider’s default model', async () => {
      renderApp('/settings');
      const model = await screen.findByLabelText('Model');
      expect(model).toHaveAttribute('placeholder', 'claude-haiku-5-5');

      await userEvent.click(screen.getByRole('button', { name: 'OpenAI' }));
      expect(settingsStore.getSnapshot().ai.provider).toBe('openai');
      expect(model).toHaveAttribute('placeholder', 'gpt-4o-mini');
      expect(screen.getByRole('button', { name: 'OpenAI' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it('cannot test without a key', async () => {
      renderApp('/settings');
      expect(await screen.findByRole('button', { name: 'Test connection' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Remove key' })).toBeNull();
    });

    it('tests the connection and reports that it works', async () => {
      settingsStore.update({ ai: { apiKey: KEY, model: 'my-model' } });
      const fetchMock = stubApi(() => jsonResponse({ success: true, model: 'my-model' }));
      renderApp('/settings');

      await userEvent.click(await screen.findByRole('button', { name: 'Test connection' }));

      expect(await screen.findByText(/Works. Answered by my-model/)).toBeInTheDocument();
      const [url, init] = fetchMock.mock.calls[0] ?? [];
      expect(toUrlString(url as RequestInfo)).toBe('/api/ai/test');
      expect(JSON.parse(init?.body as string)).toEqual({
        provider: 'anthropic',
        model: 'my-model',
        apiKey: KEY,
      });
    });

    it('explains a rejected key without repeating it', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      stubApi(() =>
        jsonResponse({ code: 'AI_KEY_REJECTED', message: `bad ${KEY}` }, { status: 401 }),
      );
      renderApp('/settings');

      await userEvent.click(await screen.findByRole('button', { name: 'Test connection' }));

      const status = await screen.findByText(/rejected this API key/);
      expect(status.textContent).not.toContain(KEY);
    });

    it('forgets an old test result when the key changes', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      stubApi(() => jsonResponse({ success: true, model: 'm' }));
      renderApp('/settings');
      await userEvent.click(await screen.findByRole('button', { name: 'Test connection' }));
      await screen.findByText(/Works/);

      await userEvent.type(screen.getByLabelText('API key'), 'x');
      expect(screen.queryByText(/Works/)).toBeNull();
    });

    it('removes the key', async () => {
      settingsStore.update({ ai: { apiKey: KEY } });
      renderApp('/settings');
      await userEvent.click(await screen.findByRole('button', { name: 'Remove key' }));
      expect(settingsStore.getSnapshot().ai.apiKey).toBe('');
      expect(screen.getByLabelText('API key')).toHaveValue('');
      expect(screen.queryByRole('button', { name: 'Remove key' })).toBeNull();
    });
  });

  describe('Surprise me', () => {
    it('saves what to start on and how many picks to deal', async () => {
      renderApp('/settings');
      const start = await screen.findByRole('group', { name: 'Start on' });
      await userEvent.click(within(start).getByRole('button', { name: 'Anime' }));
      expect(settingsStore.getSnapshot().surprise.kind).toBe('anime');

      const count = screen.getByRole('group', { name: 'Picks at a time' });
      await userEvent.click(within(count).getByRole('button', { name: '5' }));
      expect(settingsStore.getSnapshot().surprise.count).toBe(5);
      expect(within(count).getByRole('button', { name: '5' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it('turns the two switches on and off', async () => {
      renderApp('/settings');
      const skip = await screen.findByRole('switch', { name: 'Skip what I already know' });
      expect(skip).toBeChecked();
      await userEvent.click(skip);
      expect(settingsStore.getSnapshot().surprise.skipSeen).toBe(false);

      const taste = screen.getByRole('switch', { name: 'Match my taste' });
      await userEvent.click(taste);
      expect(settingsStore.getSnapshot().surprise.personalize).toBe(false);
    });
  });

  it('turns autoplay on and off', async () => {
    renderApp('/settings');
    const toggle = await screen.findByRole('switch', { name: /Autoplay/ });
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    expect(window.localStorage.getItem('moobee:autoplay:v1')).toBe('false');
  });

  describe('lists', () => {
    it('shows the counts and disables clearing an empty list', async () => {
      libraryStore.toggleWatchlist(mediaItem({ id: 1 }));
      libraryStore.toggleWatchlist(mediaItem({ id: 2, title: 'Two' }));
      renderApp('/settings');
      expect(await screen.findByText('2 titles')).toBeInTheDocument();
      expect(screen.getAllByText('0 titles')).toHaveLength(2);
      expect(screen.getByRole('button', { name: 'Clear favorites' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Clear watchlist' })).toBeEnabled();
    });

    it('needs a second press to clear a list', async () => {
      libraryStore.toggleWatchlist(mediaItem({ id: 1 }));
      libraryStore.toggleFavorite(mediaItem({ id: 1 }));
      renderApp('/settings');

      await userEvent.click(await screen.findByRole('button', { name: 'Clear watchlist' }));
      expect(libraryStore.getSnapshot().watchlist).toHaveLength(1);

      await userEvent.click(screen.getByRole('button', { name: 'Click again to clear' }));
      expect(libraryStore.getSnapshot().watchlist).toHaveLength(0);
      // The other lists are untouched.
      expect(libraryStore.getSnapshot().favorites).toHaveLength(1);
    });
  });

  it('resets the settings, including the key, but not the lists', async () => {
    settingsStore.update({ ai: { apiKey: KEY, provider: 'openai' }, surprise: { count: 5 } });
    libraryStore.toggleWatchlist(mediaItem({ id: 1 }));
    renderApp('/settings');

    await userEvent.click(await screen.findByRole('button', { name: 'Reset settings' }));
    expect(settingsStore.getSnapshot().ai.apiKey).toBe(KEY);
    await userEvent.click(screen.getByRole('button', { name: 'Click again to reset' }));

    expect(settingsStore.getSnapshot().ai).toEqual({
      provider: 'anthropic',
      model: '',
      apiKey: '',
    });
    expect(settingsStore.getSnapshot().surprise.count).toBe(3);
    expect(libraryStore.getSnapshot().watchlist).toHaveLength(1);
    expect(screen.getByLabelText('API key')).toHaveValue('');
  });
});
