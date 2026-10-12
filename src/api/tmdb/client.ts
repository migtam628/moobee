import type { z } from 'zod';
import { env } from '@/config/env';
import { isAbortError, TmdbError, type TmdbErrorKind } from './errors';

/**
 * The single gateway to TMDB. No other module in the app calls fetch() for metadata.
 *
 * Two transports:
 *  - proxy (default, secure): requests go to the same-origin `/api/tmdb` proxy which injects
 *    the secret bearer token server-side.
 *  - direct (dev-only, INSECURE): if VITE_TMDB_API_KEY is set the browser calls TMDB itself,
 *    which exposes the key to every visitor.
 */

type QueryValue = string | number | boolean | undefined;

export interface TmdbClientConfig {
  proxyUrl: string;
  apiBaseUrl: string;
  language: string;
  /** When set, switches to the insecure direct transport. */
  apiKey?: string | undefined;
  /** Injectable for tests; resolved lazily so `vi.spyOn(globalThis, 'fetch')` works. */
  fetchImpl?: typeof fetch;
}

export interface TmdbRequest<S extends z.ZodType> {
  schema: S;
  params?: Record<string, QueryValue>;
  signal?: AbortSignal | undefined;
}

/** v4 "read access tokens" are JWTs; v3 API keys are 32 hex characters. */
const looksLikeJwt = (value: string): boolean => /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(value);

function toQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  return search.toString();
}

function classifyStatus(status: number, proxyCode: string | undefined): TmdbErrorKind {
  if (proxyCode === 'TMDB_NOT_CONFIGURED') return 'not_configured';
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

/** Best-effort extraction of TMDB's `{ status_message, code }` error envelope. */
function readErrorEnvelope(text: string): { message?: string; code?: string } {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const record = parsed as Record<string, unknown>;
    return {
      ...(typeof record.status_message === 'string' ? { message: record.status_message } : {}),
      ...(typeof record.code === 'string' ? { code: record.code } : {}),
    };
  } catch {
    return {};
  }
}

export function createTmdbClient(config: TmdbClientConfig) {
  const directMode = Boolean(config.apiKey);

  function buildRequest(path: string, params: Record<string, QueryValue>) {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const query: Record<string, QueryValue> = { language: config.language, ...params };
    let base = config.proxyUrl;

    if (directMode && config.apiKey) {
      base = config.apiBaseUrl;
      if (looksLikeJwt(config.apiKey)) headers.Authorization = `Bearer ${config.apiKey}`;
      else query.api_key = config.apiKey;
    }

    const queryString = toQueryString(query);
    return { url: `${base}${path}${queryString ? `?${queryString}` : ''}`, headers };
  }

  async function get<S extends z.ZodType>(
    path: string,
    request: TmdbRequest<S>,
  ): Promise<z.output<S>> {
    const { url, headers } = buildRequest(path, request.params ?? {});
    const doFetch = config.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

    let response: Response;
    try {
      response = await doFetch(url, { headers, signal: request.signal ?? null });
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new TmdbError({
        kind: 'network',
        message: `Network error while requesting ${path}`,
        cause: error,
      });
    }

    let text: string;
    try {
      text = await response.text();
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new TmdbError({
        kind: 'network',
        message: `Connection dropped while reading ${path}`,
        cause: error,
      });
    }

    if (!response.ok) {
      const { message, code } = readErrorEnvelope(text);
      throw new TmdbError({
        kind: classifyStatus(response.status, code),
        status: response.status,
        message: message ?? `TMDB responded with HTTP ${response.status} for ${path}`,
      });
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (error) {
      // Typical dev mistake: the proxy is not mounted so the SPA's index.html comes back as 200.
      const looksLikeHtml = text.trimStart().startsWith('<');
      throw new TmdbError({
        kind: looksLikeHtml ? 'not_configured' : 'validation',
        status: response.status,
        message: looksLikeHtml
          ? `Expected JSON from ${path} but received HTML. Is the TMDB proxy running?`
          : `Response for ${path} was not valid JSON`,
        cause: error,
      });
    }

    const parsed = request.schema.safeParse(json);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
      throw new TmdbError({
        kind: 'validation',
        status: response.status,
        message: `Unexpected response shape for ${path} (${issues})`,
      });
    }

    return parsed.data;
  }

  return { get, directMode };
}

const defaultClient = createTmdbClient({
  proxyUrl: env.tmdbProxyUrl,
  apiBaseUrl: env.tmdbApiBaseUrl,
  language: env.tmdbLanguage,
  apiKey: env.tmdbApiKey,
});

if (defaultClient.directMode && import.meta.env.PROD) {
  console.warn(
    '[moobee] VITE_TMDB_API_KEY is set: the TMDB key is exposed to every visitor. ' +
      'Use the server-side proxy (TMDB_READ_ACCESS_TOKEN) in production.',
  );
}

export const tmdbGet = defaultClient.get;
