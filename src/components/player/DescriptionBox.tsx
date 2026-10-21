import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';
import type { CastMember } from '@/types/media';

export interface DescriptionDetail {
  label: string;
  value: string;
}

interface DescriptionBoxProps {
  /** The bold first line: rating, votes, date. */
  stats?: string;
  /** Short tags shown as #hashtags (genres, "Anime", the age rating). */
  tags?: readonly string[];
  overview?: string;
  tagline?: string;
  /** Extra facts, shown once expanded (directors, status, runtime...). */
  details?: readonly DescriptionDetail[];
  cast?: readonly CastMember[];
  className?: string;
}

const COLLAPSED_CAST = 10;

/**
 * The grey box under a video: a bold line of numbers, the synopsis cut to a few lines with a
 * "more" button, and the credits once it is open. Renders nothing when there is nothing to say.
 */
export function DescriptionBox({
  stats,
  tags = [],
  overview,
  tagline,
  details = [],
  cast = [],
  className,
}: DescriptionBoxProps) {
  const [open, setOpen] = useState(false);
  const hasMore = details.length > 0 || cast.length > 0 || Boolean(tagline);
  const long = (overview?.length ?? 0) > 180;
  const expandable = long || hasMore;

  if (!stats && tags.length === 0 && !overview && !hasMore) return null;

  const body: ReactNode = overview ? (
    <p
      className={cn(
        'text-sm leading-relaxed whitespace-pre-line text-fg/90',
        !open && 'line-clamp-2',
      )}
    >
      {overview}
    </p>
  ) : null;

  return (
    <section
      aria-label="Description"
      className={cn('rounded-xl bg-white/[0.07] p-3 text-sm transition-colors', className)}
    >
      {stats ? <p className="font-semibold text-fg">{stats}</p> : null}

      {tags.length > 0 ? (
        <ul className="mt-1 flex flex-wrap gap-x-2 text-sm font-medium text-accent">
          {tags.map((tag) => (
            <li key={tag}>#{tag.replace(/[^\p{L}\p{N}]+/gu, '')}</li>
          ))}
        </ul>
      ) : null}

      <div className={cn((Boolean(stats) || tags.length > 0) && 'mt-2')}>{body}</div>

      {open ? (
        <div className="mt-3 space-y-3">
          {tagline ? <p className="text-muted italic">{tagline}</p> : null}

          {details.length > 0 ? (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
              {details.map(({ label, value }) => (
                <div key={label} className="contents">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-fg/90">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {cast.length > 0 ? (
            <div>
              <h2 className="font-semibold text-fg">Cast</h2>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {cast.slice(0, COLLAPSED_CAST).map((member) => (
                  <li key={member.id}>
                    <Link
                      to={paths.person(member.id)}
                      className="text-fg/90 underline-offset-2 hover:underline"
                    >
                      {member.name}
                    </Link>
                    {member.character ? (
                      <span className="text-muted"> as {member.character}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {expandable ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value);
          }}
          className="mt-2 font-semibold text-fg hover:underline"
        >
          {open ? 'Show less' : '…more'}
        </button>
      ) : null}
    </section>
  );
}
