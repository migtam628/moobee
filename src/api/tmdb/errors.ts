export type TmdbErrorKind =
  /** fetch() itself failed: offline, DNS, CORS, proxy down. */
  | 'network'
  /** The proxy has no token, or the response was the SPA's HTML instead of API JSON. */
  | 'not_configured'
  /** TMDB rejected the credentials (HTTP 401). */
  | 'unauthorized'
  | 'not_found'
  | 'rate_limited'
  | 'server'
  /** The response arrived but did not match the expected shape. */
  | 'validation'
  | 'unknown';

const USER_MESSAGES: Record<TmdbErrorKind, string> = {
  network: "We couldn't reach the movie database. Check your connection and try again.",
  not_configured: 'The movie database is not configured yet. Add a TMDB access token to continue.',
  unauthorized: 'The movie database rejected our credentials. Check the TMDB access token.',
  not_found: "We couldn't find what you were looking for.",
  rate_limited: 'Too many requests right now. Give it a moment and try again.',
  server: 'The movie database is having trouble. Please try again shortly.',
  validation: 'The movie database sent data we could not understand.',
  unknown: 'Something went wrong while loading this content.',
};

const RETRYABLE_KINDS: ReadonlySet<TmdbErrorKind> = new Set(['network', 'rate_limited', 'server']);

export interface TmdbErrorInit {
  kind: TmdbErrorKind;
  /** Developer-facing detail. Never include tokens or full request URLs. */
  message: string;
  status?: number | undefined;
  cause?: unknown;
}

export class TmdbError extends Error {
  readonly kind: TmdbErrorKind;
  readonly status: number | undefined;

  constructor({ kind, message, status, cause }: TmdbErrorInit) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'TmdbError';
    this.kind = kind;
    this.status = status;
  }

  /** Whether retrying the same request can plausibly succeed. */
  get retryable(): boolean {
    return RETRYABLE_KINDS.has(this.kind);
  }

  /** Friendly, non-technical text safe to show in the UI. */
  get userMessage(): string {
    return USER_MESSAGES[this.kind];
  }
}

/** Fetch aborts (component unmount, superseded query) are control flow, not failures. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Resolves any thrown value to text that is safe to show to a user. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof TmdbError) return error.userMessage;
  return USER_MESSAGES.unknown;
}
