import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { libraryStore } from '@/lib/libraryStore';

afterEach(() => {
  cleanup();
  // The watchlist/favorites/recently-viewed store loads once at import time; without this a
  // watchlist toggle in one test would otherwise leak into every test that runs after it.
  // Guarded: some test files (e.g. the server proxy) run in Vitest's `node` environment, which
  // has no `window`.
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    libraryStore.resetForTests();
  }
});

// jsdom has no ResizeObserver; MediaRow uses one to keep its scroll buttons in sync.
// Assigned directly (not via vi.stubGlobal) so per-test `vi.unstubAllGlobals()` keeps it.
globalThis.ResizeObserver = class ResizeObserverStub implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// jsdom does not implement scrolling; react-router's ScrollRestoration calls scrollTo on navigation.
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
}

// jsdom does not implement matchMedia; components that read media queries need a stub.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }),
  });
}
