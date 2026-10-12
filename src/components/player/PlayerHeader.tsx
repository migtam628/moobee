import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlayerHeaderProps {
  /** Where the back button returns to — the movie or episode's details page. */
  backTo: string;
  title: string;
  subtitle?: string;
}

/** Back button and title, shared by the movie and TV player pages. */
export function PlayerHeader({ backTo, title, subtitle }: PlayerHeaderProps) {
  return (
    <div className="mb-4">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-fg"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back
      </Link>
      <h1 className="mt-3 text-xl font-bold tracking-tight text-balance text-fg sm:text-2xl">
        {title}
      </h1>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}
