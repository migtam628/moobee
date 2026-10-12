import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { Navbar } from './Navbar';

/** Persistent chrome around every page: skip link, navbar, footer and the mobile tab bar. */
export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-fg"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>

      <Footer />
      <MobileNav />
      <ScrollRestoration />
    </div>
  );
}
