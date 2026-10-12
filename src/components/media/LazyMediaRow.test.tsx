import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTopRatedMovies } from '@/hooks/useMediaQueries';
import { createQueryClient } from '@/lib/queryClient';
import { jsonResponse, rawMovie, rawPage } from '@/test/fixtures';
import { LazyMediaRow } from './LazyMediaRow';

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

/** Controllable IntersectionObserver: tests decide when the row "scrolls into view". */
function stubIntersectionObserver() {
  const callbacks: ObserverCallback[] = [];
  class FakeObserver {
    constructor(callback: ObserverCallback) {
      callbacks.push(callback);
    }
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  return { reveal: () => callbacks.forEach((callback) => callback([{ isIntersecting: true }])) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LazyMediaRow', () => {
  it('holds its request until the row nears the viewport', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse(rawPage([rawMovie({ id: 9, title: 'Top Film' })]))),
    );
    vi.stubGlobal('fetch', fetchMock);
    const observer = stubIntersectionObserver();

    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <LazyMediaRow title="Top Rated" useList={useTopRatedMovies} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Off-screen: skeleton only, no network.
    expect(screen.getByRole('status', { name: 'Loading titles' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => {
      observer.reveal();
    });

    expect(await screen.findByRole('link', { name: /Top Film/ })).toHaveAttribute(
      'href',
      '/movie/9',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
