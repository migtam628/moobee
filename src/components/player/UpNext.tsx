import { Clapperboard, Play, Tv } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { AutoplayToggle } from './AutoplayToggle';

/** One row of the "Up next" list: an episode, or a title to watch after this one. */
export interface UpNextItem {
  key: string;
  href: string;
  title: string;
  /** Second line, e.g. an air date or "Movie · 2019 · 8.1". */
  meta?: string;
  /** Small label over the thumbnail's corner, e.g. the runtime. */
  badge?: string;
  thumbnailUrl?: string;
  /** Which placeholder to show when there is no picture. */
  kind: 'movie' | 'tv';
  /** The one being played right now (episode lists). */
  current?: boolean;
}

/** A chip of the list ("Episodes", "More like this", ...) and what it shows. */
export interface UpNextTab {
  id: string;
  label: string;
  items: readonly UpNextItem[];
  /** Shown above the list when this chip is selected, e.g. a season picker. */
  toolbar?: ReactNode;
  emptyText: string;
}

interface UpNextProps {
  tabs: readonly UpNextTab[];
  autoplay: boolean;
  onAutoplayChange: (next: boolean) => void;
  className?: string;
}

function Thumbnail({ item }: { item: UpNextItem }) {
  const [failed, setFailed] = useState(false);
  const Icon = item.kind === 'movie' ? Clapperboard : Tv;

  return (
    <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-raised sm:w-44 lg:w-40 xl:w-44">
      {item.thumbnailUrl && !failed ? (
        <img
          src={item.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => {
            setFailed(true);
          }}
          className="size-full object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center bg-gradient-to-br from-raised to-surface">
          <Icon aria-hidden="true" className="size-6 text-muted" />
        </div>
      )}
      {item.badge ? (
        <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-fg tabular-nums">
          {item.badge}
        </span>
      ) : null}
    </div>
  );
}

function UpNextRow({ item }: { item: UpNextItem }) {
  return (
    <li>
      <Link
        to={item.href}
        aria-current={item.current ? 'true' : undefined}
        className={cn(
          'flex gap-2 rounded-lg p-1.5 transition-colors hover:bg-white/[0.06]',
          item.current && 'bg-white/10 hover:bg-white/10',
        )}
      >
        <Thumbnail item={item} />
        <div className="min-w-0 py-0.5">
          <p className="line-clamp-2 text-sm leading-snug font-medium text-fg">{item.title}</p>
          {item.meta ? <p className="mt-1 line-clamp-2 text-xs text-muted">{item.meta}</p> : null}
          {item.current ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent">
              <Play aria-hidden="true" className="size-3 fill-current" />
              Now playing
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

/**
 * The right-hand column of the watch page: the Autoplay switch, filter chips and a list of
 * thumbnail rows. It only draws what it is given; the pages decide what the chips and rows are.
 */
export function UpNext({ tabs, autoplay, onAutoplayChange, className }: UpNextProps) {
  // The id of the chip picked by the viewer; falls back to the first when it is gone (a movie
  // has no "Episodes", so a stale pick from another page must not leave the list blank).
  const [picked, setPicked] = useState<string | undefined>();
  const active = tabs.find((tab) => tab.id === picked) ?? tabs[0];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-fg">Up next</h2>
        <AutoplayToggle autoplay={autoplay} onChange={onAutoplayChange} />
      </div>

      {tabs.length > 1 ? (
        <div role="group" aria-label="Show" className="scrollbar-none flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const selected = tab.id === active?.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setPicked(tab.id);
                }}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition',
                  selected ? 'bg-fg text-canvas' : 'bg-white/10 text-fg hover:bg-white/15',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {active?.toolbar}

      {active && active.items.length > 0 ? (
        <ul className="space-y-1">
          {active.items.map((item) => (
            <UpNextRow key={item.key} item={item} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-white/[0.04] p-4 text-sm text-muted">{active?.emptyText}</p>
      )}
    </div>
  );
}
