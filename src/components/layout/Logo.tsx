import { Link } from 'react-router-dom';
import { paths } from '@/lib/routes';

/** Honeycomb mark + wordmark. Original artwork, not derived from any streaming brand. */
export function Logo() {
  return (
    <Link
      to={paths.home}
      aria-label="MooBee home"
      className="inline-flex items-center gap-2.5 rounded-md"
    >
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <path d="M16 3 26.5 9v14L16 29 5.5 23V9z" fill="var(--color-accent)" />
        <path
          d="M5.5 12.6h21v2.8h-21zM5.5 18h21v2.8h-21z"
          fill="var(--color-canvas)"
          opacity=".88"
        />
      </svg>
      <span className="text-xl font-extrabold tracking-tight text-fg">
        Moo<span className="text-accent">Bee</span>
      </span>
    </Link>
  );
}
