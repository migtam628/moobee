import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Episode, SeasonSummary } from '@/types/media';
import { EpisodeNavigation } from './EpisodeNavigation';

const episode = (episodeNumber: number): Episode => ({
  id: episodeNumber,
  episodeNumber,
  seasonNumber: 1,
  name: `Episode ${episodeNumber}`,
});

const season = (seasonNumber: number): SeasonSummary => ({
  id: seasonNumber,
  seasonNumber,
  name: `Season ${seasonNumber}`,
});

const renderNav = (props: ComponentProps<typeof EpisodeNavigation>) =>
  render(
    <MemoryRouter>
      <EpisodeNavigation {...props} />
    </MemoryRouter>,
  );

describe('EpisodeNavigation', () => {
  it('links to the previous and next episode within the season', () => {
    renderNav({
      tvId: 1396,
      seasonNumber: 1,
      episodes: [episode(1), episode(2), episode(3)],
      currentEpisodeNumber: 2,
      seasons: [season(1)],
    });

    expect(screen.getByRole('link', { name: /Previous/ })).toHaveAttribute(
      'href',
      '/watch/tv/1396/1/1',
    );
    expect(screen.getByRole('link', { name: /Next episode/ })).toHaveAttribute(
      'href',
      '/watch/tv/1396/1/3',
    );
  });

  it('disables "Previous" on the first episode of a season', () => {
    renderNav({
      tvId: 1396,
      seasonNumber: 1,
      episodes: [episode(1), episode(2)],
      currentEpisodeNumber: 1,
      seasons: [season(1)],
    });

    expect(screen.queryByRole('link', { name: /Previous/ })).toBeNull();
    expect(screen.getByText('Previous')).toHaveAttribute('aria-disabled', 'true');
  });

  it('rolls "Next" over into episode 1 of the next season, at the last episode of the current one', () => {
    renderNav({
      tvId: 1396,
      seasonNumber: 1,
      episodes: [episode(1), episode(2)],
      currentEpisodeNumber: 2,
      seasons: [season(1), season(2)],
    });

    expect(screen.getByRole('link', { name: /Next episode/ })).toHaveAttribute(
      'href',
      '/watch/tv/1396/2/1',
    );
  });

  it('disables "Next" at the series finale (no later season exists)', () => {
    renderNav({
      tvId: 1396,
      seasonNumber: 2,
      episodes: [episode(1), episode(2)],
      currentEpisodeNumber: 2,
      seasons: [season(1), season(2)],
    });

    expect(screen.queryByRole('link', { name: /Next episode/ })).toBeNull();
  });

  it('picks the nearest adjacent season, not just any later one', () => {
    renderNav({
      tvId: 1396,
      seasonNumber: 1,
      episodes: [episode(1)],
      currentEpisodeNumber: 1,
      seasons: [season(1), season(2), season(4)],
    });

    expect(screen.getByRole('link', { name: /Next episode/ })).toHaveAttribute(
      'href',
      '/watch/tv/1396/2/1',
    );
  });
});
