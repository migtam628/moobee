import { screen, within } from '@testing-library/react';
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
    expect(screen.getByRole('link', { name: /Details/ })).toHaveAttribute('href', '/movie/550');
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

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fight Club' }),
    ).toBeInTheDocument();
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

    // The episode is the title, and the show is the "channel" above its description.
    expect(await screen.findByRole('heading', { level: 1, name: 'Pilot' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Breaking Bad/ })).toHaveAttribute('href', '/tv/1396');
    expect(screen.getByText('Season 1 · Episode 1')).toBeInTheDocument();
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

describe('watch page layout', () => {
  const useLoopbackProvider = () => {
    const base = env.playbackProviderBaseUrl;
    expect(base).toMatch(/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/);
    playbackProviderRegistry.register(createEmbedProvider(base ?? ''));
  };

  it('puts the player in theater mode without reloading the stream, and remembers it', async () => {
    useLoopbackProvider();
    stubApi(movieHandler);
    renderApp('/watch/movie/550');

    const frame = await screen.findByTitle('Fight Club');
    const button = screen.getByRole('button', { name: 'Theater mode' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(button);
    expect(screen.getByRole('button', { name: 'Theater mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(window.localStorage.getItem('moobee:player-theater:v1')).toBe('true');
    // Same element: the frame was re-placed with CSS, not rebuilt, so the video keeps playing.
    expect(screen.getByTitle('Fight Club')).toBe(frame);
    expect(frame.isConnected).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Theater mode' }));
    expect(window.localStorage.getItem('moobee:player-theater:v1')).toBe('false');
  });

  it('opens in theater when it was left that way, and toggles with the t key', async () => {
    window.localStorage.setItem('moobee:player-theater:v1', 'true');
    stubApi(movieHandler);
    renderApp('/watch/movie/550');

    const unavailable = await screen.findByText("Playback isn't available yet");
    expect(unavailable.closest('[class*="lg:col-span-2"]')).not.toBeNull();

    await userEvent.keyboard('t');
    expect(window.localStorage.getItem('moobee:player-theater:v1')).toBe('false');
    expect(unavailable.closest('[class*="lg:col-span-2"]')).toBeNull();
  });

  it('ignores the t key while typing', async () => {
    stubApi(movieHandler);
    renderApp('/watch/movie/550');
    await screen.findByRole('heading', { level: 1, name: 'Fight Club' });

    const field = document.createElement('input');
    document.body.append(field);
    field.focus();
    await userEvent.keyboard('t');
    field.remove();
    expect(window.localStorage.getItem('moobee:player-theater:v1')).not.toBe('true');
  });

  it('lists what to watch next, with a chip for similar titles', async () => {
    stubApi(movieHandler);
    renderApp('/watch/movie/550');

    const next = await screen.findByRole('complementary', { name: 'Up next' });
    expect(within(next).getByRole('link', { name: /Pulp Fiction/ })).toHaveAttribute(
      'href',
      '/movie/680',
    );
    expect(within(next).queryByRole('link', { name: /Se7en/ })).toBeNull();

    await userEvent.click(within(next).getByRole('button', { name: 'Similar' }));
    expect(within(next).getByRole('link', { name: /Se7en/ })).toHaveAttribute('href', '/movie/807');
  });

  it('shows the movie like a video page: director, facts, tags, and the credits when opened', async () => {
    stubApi(movieHandler);
    renderApp('/watch/movie/550');

    expect(await screen.findByText(/Directed by David Fincher/)).toBeInTheDocument();
    expect(screen.getByText('#Drama')).toBeInTheDocument();
    expect(screen.queryByText('Edward Norton')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: '…more' }));
    expect(screen.getByRole('link', { name: 'Edward Norton' })).toHaveAttribute(
      'href',
      '/person/819',
    );
  });

  it('copies the page address with Share', async () => {
    const user = userEvent.setup();
    stubApi(movieHandler);
    renderApp('/watch/movie/550');

    await user.click(await screen.findByRole('button', { name: /Share/ }));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(window.location.href);
  });

  it('saves to the watchlist and favorites from the action row', async () => {
    stubApi(movieHandler);
    renderApp('/watch/movie/550');

    const watchlist = await screen.findByRole('button', { name: /Add to Watchlist/ });
    await userEvent.click(watchlist);
    expect(screen.getByRole('button', { name: /In Watchlist/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Favorite' }));
    expect(screen.getByRole('button', { name: 'Favorited' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('TV watch page list', () => {
  const twoSeasons: ApiHandler = (url) => {
    if (url.pathname.endsWith('/tv/1396')) {
      return jsonResponse(
        rawTvDetails({
          seasons: [
            { id: 1, season_number: 1, name: 'Season 1' },
            { id: 2, season_number: 2, name: 'Season 2' },
          ],
        }),
      );
    }
    if (url.pathname.endsWith('/tv/1396/season/1')) {
      return jsonResponse(
        rawSeasonDetails({
          id: 1,
          season_number: 1,
          episodes: [
            { id: 1, episode_number: 1, season_number: 1, name: 'Pilot', runtime: 58 },
            { id: 2, episode_number: 2, season_number: 1, name: 'Cat’s in the Bag...' },
          ],
        }),
      );
    }
    if (url.pathname.endsWith('/tv/1396/season/2')) {
      return jsonResponse(
        rawSeasonDetails({
          id: 2,
          season_number: 2,
          episodes: [{ id: 21, episode_number: 1, season_number: 2, name: 'Seven Thirty-Seven' }],
        }),
      );
    }
    return jsonResponse({ status_message: 'not found' }, { status: 404 });
  };

  it('lists the season with the playing episode marked', async () => {
    stubApi(twoSeasons);
    renderApp('/watch/tv/1396/1/1');

    const next = await screen.findByRole('complementary', { name: 'Up next' });
    const playing = await within(next).findByRole('link', { name: /1\. Pilot/ });
    expect(playing).toHaveAttribute('aria-current', 'true');
    expect(within(playing).getByText('58m')).toBeInTheDocument();
    expect(within(next).getByRole('link', { name: /2\. Cat’s in the Bag/ })).toHaveAttribute(
      'href',
      '/watch/tv/1396/1/2',
    );
  });

  it('shows another season in the list without changing what is playing', async () => {
    stubApi(twoSeasons);
    renderApp('/watch/tv/1396/1/1');

    const next = await screen.findByRole('complementary', { name: 'Up next' });
    await userEvent.selectOptions(await within(next).findByLabelText('Season'), '2');

    const other = await within(next).findByRole('link', { name: /Seven Thirty-Seven/ });
    expect(other).toHaveAttribute('href', '/watch/tv/1396/2/1');
    expect(other).not.toHaveAttribute('aria-current');
    expect(within(next).queryByRole('link', { name: /Cat’s in the Bag/ })).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Pilot' })).toBeInTheDocument();
  });

  it('offers recommended shows next to the episodes', async () => {
    stubApi(twoSeasons);
    renderApp('/watch/tv/1396/1/1');

    const next = await screen.findByRole('complementary', { name: 'Up next' });
    await userEvent.click(await within(next).findByRole('button', { name: 'More like this' }));
    expect(within(next).getByRole('link', { name: /Better Call Saul/ })).toHaveAttribute(
      'href',
      '/tv/60059',
    );
  });
});
