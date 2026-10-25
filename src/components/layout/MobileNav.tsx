import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { NAV_ITEMS } from './navItems';

/** Bottom tab bar for phones and small tablets. Hidden from `md` up, where the navbar takes over. */
export function MobileNav() {
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="flex">
        {NAV_ITEMS.map(({ label, shortLabel, to, icon: Icon, end }) => (
          <li key={to} className="min-w-0 flex-1">
            <NavLink
              to={to}
              end={end ?? false}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-[0.65rem] font-medium whitespace-nowrap transition-colors',
                  isActive ? 'text-accent' : 'text-muted hover:text-fg',
                )
              }
            >
              <Icon aria-hidden="true" className="size-5" />
              {shortLabel ?? label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
