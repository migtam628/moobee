import { ChevronDown } from 'lucide-react';
import type { SeasonSummary } from '@/types/media';

interface SeasonSelectProps {
  seasons: readonly SeasonSummary[];
  value: number;
  onChange: (seasonNumber: number) => void;
}

/** Picks which season the Up next list shows. Does not change what is playing. */
export function SeasonSelect({ seasons, value, onChange }: SeasonSelectProps) {
  if (seasons.length < 2) return null;

  return (
    <label className="relative block">
      <span className="sr-only">Season</span>
      <select
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
        className="w-full appearance-none rounded-lg bg-white/10 py-2 pr-9 pl-3 text-sm font-medium text-fg hover:bg-white/15"
      >
        {seasons.map((season) => (
          <option key={season.id} value={season.seasonNumber} className="bg-raised text-fg">
            {season.name}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
      />
    </label>
  );
}
