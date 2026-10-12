import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp, stubApi, type ApiHandler } from '@/test/app';
import { jsonResponse, rawSeasonDetails, rawTvDetails } from '@/test/fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
});

const seasons = [
  { id: 1, season_number: 1, name: 'Season 1', episode_count: 2, air_date: '2008-01-20' },
  { id: 2, season_number: 2, name: 'Season 2', episode_count: 2, air_date: '2009-03-08' },
];

const showHandler: ApiHandler = (url) => {
  if (url.pathname.endsWith('/tv/1396')) {
    return jsonResponse(rawTvDetails({ seasons }));
  }
  if (url.pathname.endsWith('/tv/1396/season/1')) {
    return jsonResponse(
      rawSeasonDetails({ id: 1, season_number: 1, name: 'Season 1', overview: 'It begins.' }),
    );
  }
  if (url.pathname.endsWith('/tv/1396/season/2')) {
    return jsonResponse(
      rawSeasonDetails({
        id: 2,
        season_number: 2,
        name: 'Season 2',
        episodes: [{ id: 99, episode_number: 1, season_number: 2, name: 'S2E1' }],
      }),
    );
  }
  return jsonResponse({ status_message: 'not found' }, { status: 404 });
};

describe('TV season page', () => {
  it('shows the season overview and its episode list', async () => {
    stubApi(showHandler);
    renderApp('/tv/1396/season/1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Season 1' })).toBeInTheDocument();
    expect(screen.getByText('It begins.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Breaking Bad' })).toHaveAttribute('href', '/tv/1396');
    expect(screen.getByText('Pilot')).toBeInTheDocument();
    expect(screen.getByText('Cat’s in the Bag...')).toBeInTheDocument();
  });

  it('highlights the current season in the season strip and links the others', async () => {
    stubApi(showHandler);
    renderApp('/tv/1396/season/1');
    await screen.findByRole('heading', { level: 1, name: 'Season 1' });

    const strip = screen.getByRole('region', { name: 'Seasons' });
    const current = within(strip).getByRole('link', { name: /Season 1/ });
    expect(current).toHaveAttribute('aria-current', 'page');
    const other = within(strip).getByRole('link', { name: /Season 2/ });
    expect(other).toHaveAttribute('href', '/tv/1396/season/2');
  });

  it('navigates to a different season without leaving the page', async () => {
    stubApi(showHandler);
    renderApp('/tv/1396/season/1');
    await screen.findByRole('heading', { level: 1, name: 'Season 1' });

    await userEvent.click(screen.getByRole('link', { name: /Season 2/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Season 2' })).toBeInTheDocument();
    expect(screen.getByText('S2E1')).toBeInTheDocument();
  });

  it('shows "not found" for a season number the show doesn’t have', async () => {
    stubApi(showHandler);
    renderApp('/tv/1396/season/99');
    expect(await screen.findByText("We couldn't find that season")).toBeInTheDocument();
  });

  it('shows "not found" for an invalid id without calling the API', async () => {
    const fetchMock = stubApi(showHandler);
    renderApp('/tv/abc/season/1');
    expect(await screen.findByText("We couldn't find that season")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows "not found" for an invalid season param (valid id) without calling the API', async () => {
    const fetchMock = stubApi(showHandler);
    renderApp('/tv/1396/season/abc');
    expect(await screen.findByText("We couldn't find that season")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
