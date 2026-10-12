import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '@/config/env';
import { renderApp, stubApi, type ApiHandler } from '@/test/app';
import { jsonResponse, rawMovieDetails, rawSeasonDetails, rawTvDetails } from '@/test/fixtures';
import { createEmbedProvider } from '@/services/playback/embedProvider';
import { playbackProviderRegistry } from '@/services/playback/providerRegistry';
import type { PlaybackProvider } from '@/services/playback/types';

// Importing the app does not register a provider; `authorizedProvider.ts` does, at import time,
// from whatever `VITE_PLAYBACK_PROVIDER_BASE_URL` Vitest loaded. Clear it so these cases do not
// depend on that side effect or on test order.
const registry = playbackProviderRegistry as unknown as { providers: PlaybackProvider[] };

beforeEach(() => {
  registry.providers.length = 0;
});

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

const movieHandler: ApiHandler = (url) =>
  url.pathname.endsWith('/movie/550')
    ? jsonResponse(rawMovieDetails())
    : jsonResponse({ status_message: 'not found' }, { status: 404 });

const tvHandler: ApiHandler = (url) => {
  if (url.pathname.endsWith('/tv/1396')) {
    return jsonResponse(rawTvDetails({ seasons: [{ id: 1, season_number: 1, name: 'Season 1' }] }));
  }
  if (url.pathname.endsWith('/tv/1396/season/1')) {
    return jsonResponse(
      rawSeasonDetails({
        id: 1,
        season_number: 1,
        episodes: [
          { id: 1, episode_number: 1, season_number: 1, name: 'Pilot' },
          { id: 2, episode_number: 2, season_number: 1, name: 'Cat’s in the Bag...' },
        ],
      }),
    );
  }
  return jsonResponse({ status_message: 'not found' }, { status: 404 });
};

describe('movie player page', () => {
  it('shows a "playback unavailable" state instead of a blank player (no provider is registered)', async () => {
    stubApi(movieHandler);
    renderApp('/watch/movie/550');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fight Club' }),
    ).toBeInTheDocument();
    expect(screen.getByText("Playback isn't available yet")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back/ })).toHaveAttribute('href', '/movie/550');
  });

  it('shows "not found" for an unknown movie', async () => {
    stubApi(() => jsonResponse({ status_message: 'nope' }, { status: 404 }));
    renderApp('/watch/movie/999999');
    expect(await screen.findByText("We couldn't find that movie")).toBeInTheDocument();
  });

  it('shows "not found" for an invalid id without calling the API', async () => {
    const fetchMock = stubApi(movieHandler);
    renderApp('/watch/movie/abc');
    expect(await screen.findByText("We couldn't find that movie")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('embeds the configured loopback stream instead of the unavailable state', async () => {
    const base = env.playbackProviderBaseUrl;
    expect(base).toMatch(/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/);
    playbackProviderRegistry.register(createEmbedProvider(base ?? ''));
    stubApi(movieHandler);
    renderApp('/watch/movie/550');

    expect(await screen.findByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument();
    const frame = screen.getByTitle('Fight Club');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', `${base}/movie/550?autoPlay=true&autoplay=1`);
    expect(screen.queryByText("Playback isn't available yet")).not.toBeInTheDocument();
  });

  it('persists the autoplay preference across a remount', async () => {
    stubApi(movieHandler);
    renderApp('/watch/movie/550');
    const toggle = await screen.findByRole('switch', { name: /Autoplay/ });
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(window.localStorage.getItem('moobee:autoplay:v1')).toBe('false');
  });
});

describe('TV player page', () => {
  it('shows episode info, a "playback unavailable" state, and episode navigation', async () => {
    stubApi(tvHandler);
    renderApp('/watch/tv/1396/1/1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Breaking Bad' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Season 1 . Episode 1 . Pilot/)).toBeInTheDocument();
    expect(screen.getByText("Playback isn't available yet")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Next episode/ })).toHaveAttribute(
      'href',
      '/watch/tv/1396/1/2',
    );
  });

  it('shows "not found" when the episode number isn’t in the season', async () => {
    stubApi(tvHandler);
    renderApp('/watch/tv/1396/1/99');
    expect(await screen.findByText("We couldn't find that episode")).toBeInTheDocument();
  });

  it('shows "not found" for invalid route params without calling the API', async () => {
    const fetchMock = stubApi(tvHandler);
    renderApp('/watch/tv/1396/abc/1');
    expect(await screen.findByText("We couldn't find that episode")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
