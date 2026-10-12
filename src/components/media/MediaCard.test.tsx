import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { mediaItem } from '@/test/fixtures';
import { MediaCard } from './MediaCard';

const renderCard = (item = mediaItem()) =>
  render(
    <MemoryRouter>
      <MediaCard item={item} />
    </MemoryRouter>,
  );

describe('MediaCard', () => {
  it('links movies to /movie/:id with a descriptive accessible name', () => {
    renderCard();
    const link = screen.getByRole('link', { name: 'Fight Club, 1999, Movie, rated 8.4' });
    expect(link).toHaveAttribute('href', '/movie/550');
  });

  it('links TV shows to /tv/:id, even when a movie shares the same numeric id', () => {
    renderCard(mediaItem({ id: 550, mediaType: 'tv', title: 'Some Show' }));
    expect(screen.getByRole('link', { name: /Some Show/ })).toHaveAttribute('href', '/tv/550');
  });

  it('renders a lazy, responsive poster from the image helper', () => {
    const { container } = renderCard();
    const img = container.querySelector('img');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'),
    );
    expect(img).toHaveAttribute('srcset', expect.stringContaining('185w'));
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('shows a titled placeholder instead of a broken image when there is no poster', () => {
    const { container } = renderCard(mediaItem({ posterPath: undefined }));
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getAllByText('Fight Club').length).toBeGreaterThan(0);
  });

  it('falls back to the placeholder if the image fails to load', async () => {
    const { container } = renderCard();
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    img?.dispatchEvent(new Event('error'));
    await screen.findAllByText('Fight Club');
    expect(container.querySelector('img')).toBeNull();
  });

  it('omits the rating when the title is unrated and shows TBA for an unknown year', () => {
    renderCard(mediaItem({ rating: undefined, year: undefined }));
    expect(screen.queryByRole('img', { name: /rated/i })).toBeNull();
    expect(screen.getByRole('link', { name: 'Fight Club, Movie' })).toBeInTheDocument();
    expect(screen.getByText('TBA')).toBeInTheDocument();
  });

  it('is reachable by keyboard', async () => {
    renderCard();
    await userEvent.tab();
    expect(screen.getByRole('link')).toHaveFocus();
  });
});
