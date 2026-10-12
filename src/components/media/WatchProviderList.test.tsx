import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { WatchProviders } from '@/types/media';
import { WatchProviderList } from './WatchProviderList';

const providers = (overrides: Partial<WatchProviders> = {}): WatchProviders => ({
  region: 'US',
  link: 'https://www.themoviedb.org/movie/550/watch?locale=US',
  subscription: [{ id: 8, name: 'StreamCo', logoPath: '/s.jpg' }],
  free: [],
  rent: [{ id: 2, name: 'RentIt' }],
  buy: [],
  ...overrides,
});

describe('WatchProviderList', () => {
  it('groups providers and shows only non-empty groups', () => {
    render(<WatchProviderList providers={providers()} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Stream' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Rent' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Free' })).toBeNull();
    expect(screen.queryByRole('heading', { level: 3, name: 'Buy' })).toBeNull();
    expect(screen.getByText('StreamCo')).toBeInTheDocument();
  });

  it('always credits JustWatch', () => {
    render(<WatchProviderList providers={providers()} />);
    expect(screen.getByText(/Data provided by JustWatch/)).toBeInTheDocument();
    render(<WatchProviderList providers={undefined} />);
    expect(screen.getAllByText(/Data provided by JustWatch/)).toHaveLength(2);
  });

  it('opens the full availability page safely in a new tab', () => {
    render(<WatchProviderList providers={providers()} />);
    const link = screen.getByRole('link', { name: /All options/ });
    expect(link).toHaveAttribute('href', 'https://www.themoviedb.org/movie/550/watch?locale=US');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it.each([
    'javascript:alert(1)',
    'https://evil.example/watch',
    'http://www.themoviedb.org/movie/550/watch',
  ])('drops an unsafe link: %s', (link) => {
    render(<WatchProviderList providers={providers({ link })} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('StreamCo')).toBeInTheDocument();
  });

  it('explains when nothing is available', () => {
    render(<WatchProviderList providers={undefined} />);
    expect(screen.getByText(/No streaming information is available/)).toBeInTheDocument();
  });
});
