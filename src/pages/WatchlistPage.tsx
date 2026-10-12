import { Bookmark, Heart, History, type LucideIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { MediaGrid } from '@/components/media/MediaGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLibrary } from '@/hooks/useLibrary';
import { cn } from '@/lib/cn';
import type { LibraryEntry } from '@/types/library';

type TabId = 'watchlist' | 'favorites' | 'recent';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
}

const TABS: readonly Tab[] = [
  {
    id: 'watchlist',
    label: 'Watchlist',
    icon: Bookmark,
    emptyTitle: 'Your watchlist is empty',
    emptyDescription: 'Titles you add to your watchlist will show up here.',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: Heart,
    emptyTitle: 'No favorites yet',
    emptyDescription: 'Mark a movie or show as a favorite to see it here.',
  },
  {
    id: 'recent',
    label: 'Recently Viewed',
    icon: History,
    emptyTitle: 'Nothing viewed yet',
    emptyDescription: 'Movies and shows you open will appear here.',
  },
];

/** Watchlist, favorites and recently-viewed, kept only in this browser (`useLibrary`). */
export function WatchlistPage() {
  useDocumentTitle('My List');
  const { watchlist, favorites, recentlyViewed, clearRecentlyViewed } = useLibrary();
  const [active, setActive] = useState<TabId>('watchlist');
  const baseId = useId();

  const itemsByTab: Record<TabId, readonly LibraryEntry[]> = {
    watchlist,
    favorites,
    recent: recentlyViewed,
  };

  const moveFocus = (direction: -1 | 1) => {
    const index = TABS.findIndex((tab) => tab.id === active);
    const next = TABS[(index + direction + TABS.length) % TABS.length];
    if (!next) return;
    setActive(next.id);
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
  };

  return (
    <div className="page-gutter pt-24 pb-16 sm:pt-28">
      <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">My List</h1>

      <div
        role="tablist"
        aria-label="My List"
        className="mt-6 flex gap-1 overflow-x-auto border-b border-line"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            moveFocus(1);
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            moveFocus(-1);
          }
        }}
      >
        {TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                setActive(tab.id);
              }}
              className={cn(
                '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition',
                selected ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg',
              )}
            >
              <tab.icon aria-hidden="true" className="size-4" />
              {tab.label}
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-xs text-muted tabular-nums">
                {itemsByTab[tab.id].length}
              </span>
            </button>
          );
        })}
      </div>

      {TABS.map((tab) => {
        const items = itemsByTab[tab.id];
        return (
          <div
            key={tab.id}
            id={`${baseId}-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${tab.id}`}
            hidden={tab.id !== active}
            tabIndex={0}
            className="pt-8"
          >
            {items.length === 0 ? (
              <EmptyState
                icon={<tab.icon className="size-10" />}
                title={tab.emptyTitle}
                description={tab.emptyDescription}
              />
            ) : (
              <>
                {tab.id === 'recent' ? (
                  <div className="mb-6 flex justify-end">
                    <button
                      type="button"
                      onClick={clearRecentlyViewed}
                      className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                ) : null}
                <MediaGrid items={items} eagerCount={6} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const Component = WatchlistPage;
