import { RefreshCw, TriangleAlert } from 'lucide-react';
import { getErrorMessage, TmdbError } from '@/api/tmdb';
import { cn } from '@/lib/cn';

interface ErrorStateProps {
  title?: string;
  /** The thrown value. TMDB errors are translated to friendly text; anything else is generic. */
  error?: unknown;
  /** Overrides the message derived from `error`. */
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  /** Smaller inline variant for use inside content rows. */
  compact?: boolean;
  className?: string;
}

/** Developer-only pointer for the most common first-run failure. Never shown in production. */
function getDevHint(error: unknown): string | undefined {
  if (!import.meta.env.DEV) return undefined;
  if (error instanceof TmdbError && error.kind === 'not_configured') {
    return 'Set TMDB_READ_ACCESS_TOKEN in .env, then restart the dev server.';
  }
  return undefined;
}

export function ErrorState({
  title = 'Something went wrong',
  error,
  message,
  onRetry,
  isRetrying = false,
  compact = false,
  className,
}: ErrorStateProps) {
  const text = message ?? getErrorMessage(error);
  const hint = getDevHint(error);

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-line bg-surface text-center',
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      <TriangleAlert
        aria-hidden="true"
        className={cn('text-danger', compact ? 'size-6' : 'size-9')}
      />
      <h3 className={cn('font-semibold text-fg', compact ? 'text-sm' : 'text-lg')}>{title}</h3>
      <p className="max-w-md text-sm text-muted">{text}</p>
      {hint ? <p className="max-w-md text-xs text-accent">{hint}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-fg transition hover:bg-white/15 disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" className={cn('size-4', isRetrying && 'animate-spin')} />
          {isRetrying ? 'Retrying…' : 'Try again'}
        </button>
      ) : null}
    </div>
  );
}
