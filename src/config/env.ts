import { z } from 'zod';

/**
 * Client-side environment. Everything here is PUBLIC: Vite inlines `VITE_*` values into the
 * browser bundle. The secret TMDB read-access token deliberately does NOT appear here; it lives
 * only in the server-side proxy (see server/tmdbProxy.ts).
 */

/** Treat empty strings (`VITE_FOO=` in .env) as "not set". */
const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

/** Absolute http(s) URL, or an app-relative path such as `/api/tmdb`. */
const urlOrPath = z
  .string()
  .trim()
  .refine((value) => value.startsWith('/') || /^https?:\/\//i.test(value), {
    message: 'must be an http(s) URL or a path starting with "/"',
  });

const LOOPBACK_PLAYBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Playback URLs become an iframe `src`. https is allowed for any host. http is allowed only on
 * loopback, so a local MooBee Stream can be embedded without opening the app to mixed content
 * on a public origin or to a LAN address.
 */
function isPlaybackProviderBaseUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username !== '' || url.password !== '') return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && LOOPBACK_PLAYBACK_HOSTS.has(url.hostname);
}

const envSchema = z.object({
  VITE_TMDB_PROXY_URL: z.preprocess(emptyToUndefined, urlOrPath.default('/api/tmdb')),
  VITE_TMDB_API_BASE_URL: z.preprocess(
    emptyToUndefined,
    urlOrPath.default('https://api.themoviedb.org/3'),
  ),
  VITE_TMDB_IMAGE_BASE_URL: z.preprocess(
    emptyToUndefined,
    urlOrPath.default('https://image.tmdb.org/t/p'),
  ),
  VITE_TMDB_LANGUAGE: z.preprocess(emptyToUndefined, z.string().trim().default('en-US')),
  /** ISO 3166-1 country used for watch providers and age certifications. */
  VITE_TMDB_REGION: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, 'must be a two-letter country code such as US')
      .default('US'),
  ),
  /** INSECURE dev-only fallback. Exposes the key to the browser. */
  VITE_TMDB_API_KEY: optionalString,
  /** Base URL of an authorized playback embed provider. Unset = no provider registered — see
   * src/services/playback/authorizedProvider.ts. https, or http only for localhost / 127.0.0.1. */
  VITE_PLAYBACK_PROVIDER_BASE_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .refine(isPlaybackProviderBaseUrl, {
        message: 'must be an https URL, or http on localhost or 127.0.0.1',
      })
      .optional(),
  ),
});

export interface AppEnv {
  /** Base URL of the same-origin proxy that holds the secret token. */
  tmdbProxyUrl: string;
  /** Base URL of the TMDB API, only used in the insecure direct mode. */
  tmdbApiBaseUrl: string;
  tmdbImageBaseUrl: string;
  tmdbLanguage: string;
  /** ISO 3166-1 alpha-2 country code, e.g. `US`. */
  tmdbRegion: string;
  /** Present only when the developer opted into the insecure direct mode. */
  tmdbApiKey: string | undefined;
  /** Present only once an authorized playback provider's base URL has been configured. */
  playbackProviderBaseUrl: string | undefined;
}

export class EnvError extends Error {
  constructor(issues: string) {
    super(`Invalid environment configuration: ${issues}`);
    this.name = 'EnvError';
  }
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

/** Pure and side-effect free so it can be unit-tested with arbitrary input. */
export function parseEnv(raw: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'} ${issue.message}`)
      .join('; ');
    throw new EnvError(issues);
  }

  const data = result.data;
  return {
    tmdbProxyUrl: trimTrailingSlash(data.VITE_TMDB_PROXY_URL),
    tmdbApiBaseUrl: trimTrailingSlash(data.VITE_TMDB_API_BASE_URL),
    tmdbImageBaseUrl: trimTrailingSlash(data.VITE_TMDB_IMAGE_BASE_URL),
    tmdbLanguage: data.VITE_TMDB_LANGUAGE,
    tmdbRegion: data.VITE_TMDB_REGION,
    tmdbApiKey: data.VITE_TMDB_API_KEY,
    playbackProviderBaseUrl: data.VITE_PLAYBACK_PROVIDER_BASE_URL
      ? trimTrailingSlash(data.VITE_PLAYBACK_PROVIDER_BASE_URL)
      : undefined,
  };
}

/**
 * Vitest loads `.env`, including a dev `VITE_TMDB_API_KEY`. That key switches the client to the
 * public TMDB host and would make the suite depend on one machine's secrets. Tests always use
 * the proxy. The playback base URL is still read, so player tests see the configured embed host.
 */
function envSource(): Record<string, unknown> {
  const source = { ...import.meta.env } as Record<string, unknown>;
  if (import.meta.env.MODE === 'test') source.VITE_TMDB_API_KEY = undefined;
  return source;
}

export const env: AppEnv = parseEnv(envSource());
