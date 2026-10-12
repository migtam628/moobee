import { Search } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useScrolled } from '@/hooks/useScrolled';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';
import { Logo } from './Logo';
import { NAV_ITEMS } from './navItems';

/** Top links only; Search is a dedicated icon button on the right. */
const PRIMARY_LINKS = NAV_ITEMS.filter((item) => item.to !== paths.search);

export function Navbar() {
  const scrolled = useScrolled();

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow] duration-300',
        // The hairline is an inset shadow, not a border: a border would repeat the gradient
        // background underneath it and show up as a dark line over the hero.
        scrolled
          ? 'bg-canvas/85 shadow-[inset_0_-1px_0_var(--color-line)] backdrop-blur-xl'
          : 'bg-gradient-to-b from-black/60 to-transparent',
      )}
    >
      <div className="flex h-16 page-gutter items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <Logo />

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {PRIMARY_LINKS.map(({ label, to, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end ?? false}
                    className={({ isActive }) =>
                      cn(
                        'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                        isActive ? 'bg-white/10 text-fg' : 'text-muted hover:text-fg',
                      )
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* On phones, search lives in the bottom tab bar instead. */}
        <Link
          to={paths.search}
          aria-label="Search movies and TV"
          className="hidden size-10 place-items-center rounded-full text-fg transition hover:bg-white/10 md:grid"
        >
          <Search aria-hidden="true" className="size-5" />
        </Link>
      </div>
    </header>
  );
}
