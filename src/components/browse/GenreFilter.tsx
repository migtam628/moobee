import { cn } from '@/lib/cn';
import type { Genre } from '@/types/media';

interface PillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function Pill({ label, active, onClick }: PillProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition',
        active ? 'bg-accent text-accent-fg' : 'bg-white/10 text-fg hover:bg-white/15',
      )}
    >
      {label}
    </button>
  );
}

interface GenreFilterProps {
  genres: readonly Genre[];
  /** Undefined means "All genres". */
  activeGenreId: number | undefined;
  onChange: (genreId: number | undefined) => void;
  className?: string;
}

/**
 * "All" plus one pill per genre; a single-select filter, so picking one clears any other.
 * Renders nothing while the genre list is still loading (there is nothing to filter by yet).
 */
export function GenreFilter({ genres, activeGenreId, onChange, className }: GenreFilterProps) {
  if (genres.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Filter by genre"
      className={cn(
        'scrollbar-none flex gap-2 overflow-x-auto overscroll-x-contain pb-1',
        className,
      )}
    >
      <Pill label="All" active={activeGenreId === undefined} onClick={() => onChange(undefined)} />
      {genres.map((genre) => (
        <Pill
          key={genre.id}
          label={genre.name}
          active={genre.id === activeGenreId}
          onClick={() => onChange(genre.id)}
        />
      ))}
    </div>
  );
}
