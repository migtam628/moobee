import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';
import { appRoutes } from '@/app/routes';
import { createQueryClient } from '@/lib/queryClient';
import { toUrlString } from './utils';

export type ApiHandler = (url: URL) => Response | Promise<Response>;

/** Replaces fetch with a fake TMDB proxy routed by `handler`; returns the mock to inspect calls. */
export function stubApi(handler: ApiHandler) {
  const fetchMock = vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(handler(new URL(toUrlString(input), 'http://localhost'))),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** URLs (as parsed `URL`s) of every request the fake API received. */
export const requestedUrls = (fetchMock: ReturnType<typeof stubApi>): URL[] =>
  fetchMock.mock.calls.map(([input]) => new URL(toUrlString(input), 'http://localhost'));

/** Mounts the real route table at `path` inside a fresh query client (no retries, so failures are fast). */
export function renderApp(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, queryClient };
}
