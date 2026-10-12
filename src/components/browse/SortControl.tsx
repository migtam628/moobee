import type { DiscoverSort } from '@/api/tmdb';
import { cn } from '@/lib/cn';

const OPTIONS: { value: DiscoverSort; label: string }[] = [
  { value: 'popularity', label: 'Popular' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
];

interface SortControlProps {
  value: DiscoverSort;
  onChange: (value: DiscoverSort) => void;
  className?: string;
}

export function SortControl({ value, onChange, className }: SortControlProps) {
  return (
    <label className={cn('flex shrink-0 items-center gap-2 text-sm text-muted', className)}>
      <span className="sr-only sm:not-sr-only">Sort by</span>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value as DiscoverSort);
        }}
        className="rounded-lg border border-line bg-raised px-3 py-1.5 text-sm text-fg outline-offset-2"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
