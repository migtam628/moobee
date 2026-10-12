import { Clapperboard, Tv } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { MediaKind } from '@/hooks/useMediaKindParam';

interface MediaKindToggleProps {
  value: MediaKind;
  onChange: (kind: MediaKind) => void;
  className?: string;
}

const OPTIONS: { value: MediaKind; label: string; icon: typeof Clapperboard }[] = [
  { value: 'movie', label: 'Movies', icon: Clapperboard },
  { value: 'tv', label: 'Series', icon: Tv },
];

/** Segmented "Movies / Series" switch, used by the anime page to pick which discover query and
 * genre list are active. Purely controlled — the caller owns the state (usually URL-synced via
 * `useMediaKindParam`). */
export function MediaKindToggle({ value, onChange, className }: MediaKindToggleProps) {
  return (
    <div
      role="group"
      aria-label="Movies or series"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 p-1',
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
              active ? 'bg-accent text-accent-fg' : 'text-fg hover:bg-white/10',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
