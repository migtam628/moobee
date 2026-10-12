import type { RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageLoader } from '@/components/ui/PageLoader';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';

/**
 * Route table, kept separate from the router instance so tests can mount it in a memory router.
 * Pages are lazy-loaded (route-level code splitting); each page module exports `Component`.
 */
export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    // Rendered while the initial lazy route chunk loads (also silences React Router's warning).
    HydrateFallback: PageLoader,
    children: [
      { index: true, lazy: () => import('@/pages/HomePage') },

      { path: 'search', lazy: () => import('@/pages/SearchPage') },
      { path: 'movies', lazy: () => import('@/pages/MoviesPage') },
      { path: 'tv', lazy: () => import('@/pages/TvShowsPage') },
      { path: 'anime', lazy: () => import('@/pages/AnimePage') },
      { path: 'movie/:id', lazy: () => import('@/pages/MoviePage') },
      { path: 'tv/:id', lazy: () => import('@/pages/TvPage') },
      { path: 'tv/:id/season/:season', lazy: () => import('@/pages/TvSeasonPage') },
      { path: 'person/:id', lazy: () => import('@/pages/PersonPage') },
      { path: 'watch/movie/:id', lazy: () => import('@/pages/MoviePlayerPage') },
      { path: 'watch/tv/:id/:season/:episode', lazy: () => import('@/pages/TvPlayerPage') },
      { path: 'watchlist', lazy: () => import('@/pages/WatchlistPage') },
      { path: 'upload', lazy: () => import('@/pages/UploadPage') },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
