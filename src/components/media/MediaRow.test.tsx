import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TmdbError } from '@/api/tmdb';
import { mediaItem } from '@/test/fixtures';
import { MediaRow, type MediaRowProps } from './MediaRow';

const renderRow = (props: Partial<MediaRowProps> = {}) =>
  render(
    <MemoryRouter>
      <MediaRow title="Trending Movies" status="success" items={[]} {...props} />
    </MemoryRouter>,
  );

describe('MediaRow', () => {
  it('shows loading skeletons and announces loading', () => {
    renderRow({ status: 'loading', items: undefined });
    expect(screen.getByRole('status', { name: 'Loading titles' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('renders one card per item, keyed by type and id', () => {
    renderRow({
      items: [
        mediaItem({ id: 1, title: 'Movie One' }),
        mediaItem({ id: 1, mediaType: 'tv', title: 'Show One' }),
      ],
    });
    expect(screen.getByRole('heading', { level: 2, name: 'Trending Movies' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Movie One/ })).toHaveAttribute('href', '/movie/1');
    expect(screen.getByRole('link', { name: /Show One/ })).toHaveAttribute('href', '/tv/1');
  });

  it('shows a friendly error with a working retry button', async () => {
    const onRetry = vi.fn();
    renderRow({
      status: 'error',
      items: undefined,
      error: new TmdbError({ kind: 'network', message: 'down' }),
      onRetry,
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't reach the movie database/i);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('never exposes technical error details to the user', () => {
    renderRow({
      status: 'error',
      items: undefined,
      error: new TmdbError({ kind: 'server', message: 'SELECT * FROM secrets', status: 500 }),
    });
    expect(screen.getByRole('alert')).not.toHaveTextContent(/SELECT/);
  });

  it('shows an empty state rather than a blank gap when there are no results', () => {
    renderRow({ items: [], emptyMessage: 'No movies trending.' });
    expect(screen.getByText('No movies trending.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('offers scroll buttons only when there is content', () => {
    const { unmount } = renderRow({ items: [mediaItem()] });
    expect(screen.getByRole('button', { name: 'Scroll Trending Movies left' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Scroll Trending Movies right' }),
    ).toBeInTheDocument();
    unmount();

    renderRow({ status: 'loading', items: undefined });
    expect(screen.queryByRole('button', { name: /scroll/i })).toBeNull();
  });
});
