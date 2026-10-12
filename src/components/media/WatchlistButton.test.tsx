import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { libraryStore } from '@/lib/libraryStore';
import { mediaItem } from '@/test/fixtures';
import { FavoriteButton } from './FavoriteButton';
import { WatchlistButton } from './WatchlistButton';

afterEach(() => {
  window.localStorage.clear();
  libraryStore.resetForTests();
});

describe('WatchlistButton', () => {
  it('adds and removes the item from the shared watchlist store', async () => {
    const item = mediaItem();
    render(<WatchlistButton item={item} />);

    const button = screen.getByRole('button', { name: 'Add to Watchlist' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(button);
    expect(screen.getByRole('button', { name: 'In Watchlist' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(libraryStore.getSnapshot().watchlist).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'In Watchlist' }));
    expect(screen.getByRole('button', { name: 'Add to Watchlist' })).toBeInTheDocument();
    expect(libraryStore.getSnapshot().watchlist).toEqual([]);
  });

  it('reflects state already in the store on mount (e.g. set by another card)', () => {
    const item = mediaItem();
    libraryStore.toggleWatchlist(item);
    render(<WatchlistButton item={item} />);
    expect(screen.getByRole('button', { name: 'In Watchlist' })).toBeInTheDocument();
  });

  it('does not propagate its click (safe to render inside a link)', async () => {
    const item = mediaItem();
    let bubbled = false;
    render(
      <div
        onClick={() => {
          bubbled = true;
        }}
      >
        <WatchlistButton item={item} variant="icon" />
      </div>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(bubbled).toBe(false);
  });
});

describe('FavoriteButton', () => {
  it('toggles independently of the watchlist', async () => {
    const item = mediaItem();
    render(<FavoriteButton item={item} />);

    await userEvent.click(screen.getByRole('button', { name: 'Favorite' }));
    expect(libraryStore.getSnapshot().favorites).toHaveLength(1);
    expect(libraryStore.getSnapshot().watchlist).toEqual([]);
  });
});
