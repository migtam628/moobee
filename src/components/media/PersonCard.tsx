import { User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getProfileUrl } from '@/api/tmdb/images';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';

interface PersonCardProps {
  id: number;
  name: string;
  profilePath?: string | undefined;
  /** Second line: the character played, or the department for search results. */
  subtitle?: string | undefined;
  /** Third, fainter line, e.g. "Known for: …". */
  detail?: string | undefined;
  className?: string;
}

/**
 * A cast member or search result, linking to their `/person/:id` page. Falls back to an icon
 * when there is no photo or it fails to load.
 */
export function PersonCard({
  id,
  name,
  profilePath,
  subtitle,
  detail,
  className,
}: PersonCardProps) {
  const [failedPath, setFailedPath] = useState<string | undefined>();
  const src = getProfileUrl(profilePath, 'w185');
  const showPhoto = src !== undefined && failedPath !== profilePath;

  return (
    <Link
      to={paths.person(id)}
      // The subtitle/detail lines below are supplementary and shouldn't bloat the accessible
      // name (and, in a row of results, can otherwise collide with an unrelated link's name —
      // e.g. a person's "Known for Fight Club" line matching a search for "Fight Club").
      aria-label={name}
      className={cn('group block w-28 shrink-0 text-center outline-offset-2 sm:w-32', className)}
    >
      <div className="mx-auto aspect-square w-full overflow-hidden rounded-full bg-raised ring-1 ring-line transition duration-300 ease-out group-hover:-translate-y-1 group-hover:ring-white/25">
        {showPhoto ? (
          <img
            src={src}
            alt=""
            width={185}
            height={185}
            loading="lazy"
            decoding="async"
            onError={() => {
              setFailedPath(profilePath);
            }}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted">
            <User aria-hidden="true" className="size-1/3" />
          </div>
        )}
      </div>
      <p className="mt-2.5 line-clamp-2 text-sm font-medium text-fg">{name}</p>
      {subtitle ? <p className="mt-0.5 line-clamp-2 text-xs text-muted">{subtitle}</p> : null}
      {detail ? <p className="mt-0.5 line-clamp-2 text-xs text-muted/70">{detail}</p> : null}
    </Link>
  );
}
