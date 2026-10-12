import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Minimal, framework-free TMDB proxy.
 *
 * The browser talks to `/api/tmdb/*`; this middleware adds the secret bearer token and forwards
 * the request to TMDB. It is used by both the Vite dev/preview servers and the production
 * Express server, so it depends only on Node's http types.
 */

export const TMDB_PROXY_MOUNT_PATH = '/api/tmdb';
export const DEFAULT_TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';

/** Only these top-level TMDB resources may be proxied. Keeps the proxy from being an open relay. */
const ALLOWED_ROOT_SEGMENTS = new Set([
  'trending',
  'movie',
  'tv',
  'search',
  'person',
  'discover',
  'genre',
  'configuration',
]);

/** TMDB path segments are ids and snake_case words. Anything else is rejected (no traversal). */
const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

/** Query params the client must never be able to smuggle upstream. */
const STRIPPED_QUERY_PARAMS = new Set(['api_key']);

export interface TmdbProxyOptions {
  /** TMDB v4 "API Read Access Token". Never logged. */
  token: string | undefined;
  /** Upstream base URL. Defaults to the public TMDB v3 API. */
  baseUrl?: string | undefined;
  /** Upstream timeout in ms. */
  timeoutMs?: number;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

export type ProxyErrorCode =
  | 'TMDB_NOT_CONFIGURED'
  | 'PROXY_METHOD_NOT_ALLOWED'
  | 'PROXY_PATH_NOT_ALLOWED'
  | 'UPSTREAM_UNREACHABLE';

/**
 * Turns the request URL (relative to the mount point, e.g. `/movie/popular?page=2`) into the
 * upstream URL, or `null` if the path is not allowed.
 */
export function resolveUpstreamUrl(requestUrl: string, baseUrl: string): string | null {
  // Split the raw string instead of using `new URL`, which would normalise `..`, `%2e%2e` and
  // protocol-relative `//host/...` into something that looks valid. Anything unusual is refused.
  const queryStart = requestUrl.indexOf('?');
  const rawPath = queryStart === -1 ? requestUrl : requestUrl.slice(0, queryStart);
  const rawQuery = queryStart === -1 ? '' : requestUrl.slice(queryStart + 1);

  if (!rawPath.startsWith('/')) return null;
  const segments = rawPath.slice(1).split('/');
  const [root] = segments;
  if (!root || !ALLOWED_ROOT_SEGMENTS.has(root)) return null;
  // Rejects empty segments (`//`, trailing `/`), dots, percent-escapes, spaces and backslashes.
  if (!segments.every((segment) => SAFE_SEGMENT.test(segment))) return null;

  const params = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(rawQuery)) {
    if (!STRIPPED_QUERY_PARAMS.has(key)) params.append(key, value);
  }

  const query = params.toString();
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/${segments.join('/')}${query ? `?${query}` : ''}`;
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [name, value] of Object.entries(extraHeaders)) res.setHeader(name, value);
  res.end(JSON.stringify(body));
}

function sendProxyError(
  res: ServerResponse,
  status: number,
  code: ProxyErrorCode,
  message: string,
): void {
  sendJson(
    res,
    status,
    { success: false, code, status_message: message },
    {
      'Cache-Control': 'no-store',
    },
  );
}

export function createTmdbProxyMiddleware(options: TmdbProxyOptions) {
  const baseUrl = options.baseUrl?.trim() ? options.baseUrl.trim() : DEFAULT_TMDB_API_BASE_URL;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const fetchImpl = options.fetchImpl ?? fetch;
  const token = options.token?.trim();

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      sendProxyError(res, 405, 'PROXY_METHOD_NOT_ALLOWED', 'Only GET requests are supported.');
      return;
    }

    if (!token) {
      sendProxyError(
        res,
        503,
        'TMDB_NOT_CONFIGURED',
        'TMDB_READ_ACCESS_TOKEN is not configured on the server.',
      );
      return;
    }

    const upstreamUrl = resolveUpstreamUrl(req.url ?? '/', baseUrl);
    if (!upstreamUrl) {
      sendProxyError(res, 404, 'PROXY_PATH_NOT_ALLOWED', 'This TMDB path is not available.');
      return;
    }

    try {
      const upstream = await fetchImpl(upstreamUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });

      const body = await upstream.text();
      // Only successful responses are cacheable; errors must be re-tried.
      const cacheControl = upstream.ok ? 'public, max-age=300' : 'no-store';
      res.statusCode = upstream.status;
      res.setHeader(
        'Content-Type',
        upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
      );
      res.setHeader('Cache-Control', cacheControl);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      // Deliberately no logging of the request/headers: they contain the bearer token.
      sendProxyError(res, 502, 'UPSTREAM_UNREACHABLE', 'Could not reach TMDB. Try again shortly.');
    }
  }

  // Connect/Express expect a void-returning handler; contain any unexpected rejection here so it
  // can never surface as an unhandled promise rejection.
  return function tmdbProxyMiddleware(req: IncomingMessage, res: ServerResponse): void {
    handle(req, res).catch(() => {
      if (res.headersSent) res.end();
      else
        sendProxyError(
          res,
          502,
          'UPSTREAM_UNREACHABLE',
          'Could not reach TMDB. Try again shortly.',
        );
    });
  };
}
