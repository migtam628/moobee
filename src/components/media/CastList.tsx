import { useId } from 'react';
import type { CastMember } from '@/types/media';
import { PersonCard } from './PersonCard';

interface CastListProps {
  cast: readonly CastMember[];
  /** Cast is already billing-ordered by TMDB; only the first `limit` are shown. */
  limit?: number;
}

/** Horizontally scrolling row of the main cast. Renders nothing when there is no cast data. */
export function CastList({ cast, limit = 20 }: CastListProps) {
  const headingId = useId();
  if (cast.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="py-3 sm:py-4">
      <h2
        id={headingId}
        className="mb-4 page-gutter text-lg font-semibold tracking-tight text-fg sm:text-xl"
      >
        Cast
      </h2>
      <ul className="scrollbar-none flex page-gutter gap-4 overflow-x-auto overscroll-x-contain pb-3 sm:gap-5">
        {cast.slice(0, limit).map((member) => (
          <li key={member.id}>
            <PersonCard
              id={member.id}
              name={member.name}
              profilePath={member.profilePath}
              subtitle={member.character}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
