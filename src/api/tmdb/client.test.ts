import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, rawMovie, rawPage } from '@/test/fixtures';
import { createTmdbClient } from './client';
import { TmdbError } from './errors';
import { tmdbMoviePageSchema } from './schemas';

function setup(
  fetchImpl: typeof fetch,
  overrides: Partial<Parameters<typeof createTmdbClient>[0]> = {},
) {
  return createTmdbClient({
    proxyUrl: '/api/tmdb',
    apiBaseUrl: 'https://api.themoviedb.org/3',
    language: 'en-US',
    fetchImpl,
    ...overrides,
  });
}

const request = { schema: tmdbMoviePageSchema };

async function catchError(promise: Promise<unknown>): Promise<TmdbError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(TmdbError);
    return error as TmdbError;
  }
  throw new Error('Expected the request to fail');
}

describe('tmdb client: transport', () => {
  it('calls the same-origin proxy with language and params, and sends no credentials', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(rawPage([rawMovie()])));
    const client = setup(fetchImpl);

    const result = await client.get('/movie/popular', { ...request, params: { page: 2 } });

    expect(result.results).toHaveLength(1);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('/api/tmdb/movie/popular?language=en-US&page=2');
    expect(JSON.stringify(init)).not.toMatch(/authorization|api_key/i);
    expect(client.directMode).toBe(false);
  });

  it('skips undefined params', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(rawPage([])));
    await setup(fetchImpl).get('/movie/popular', { ...request, params: { page: undefined } });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('/api/tmdb/movie/popular?language=en-US');
  });

  it('direct mode with a v3 key uses api_key against the TMDB base URL', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(rawPage([])));
    const client = setup(fetchImpl, { apiKey: 'abcdef0123456789abcdef0123456789' });

    await client.get('/movie/popular', request);

    expect(client.directMode).toBe(true);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://api.themoviedb.org/3/movie/popular?language=en-US&api_key=abcdef0123456789abcdef0123456789',
    );
  });

  it('direct mode with a v4 JWT uses a bearer header, not the query string', async () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJ4In0.c2ln';
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(rawPage([])));

    await setup(fetchImpl, { apiKey: jwt }).get('/movie/popular', request);

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    // Direct mode targets TMDB itself, and the JWT must appear only in the header.
    expect(url).toBe('https://api.themoviedb.org/3/movie/popular?language=en-US');
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${jwt}`);
  });
});

describe('tmdb client: error taxonomy', () => {
  it('maps a rejected fetch to a retryable network error', async () => {
    const error = await catchError(
      setup(vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))).get(
        '/movie/popular',
        request,
      ),
    );
    expect(error.kind).toBe('network');
    expect(error.retryable).toBe(true);
    expect(error.userMessage).toMatch(/couldn't reach/i);
  });

  it('re-throws aborts untouched so cancelled queries are not reported as failures', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    await expect(
      setup(vi.fn<typeof fetch>().mockRejectedValue(abort)).get('/movie/popular', request),
    ).rejects.toBe(abort);
  });

  it.each([
    [401, 'unauthorized', false],
    [404, 'not_found', false],
    [429, 'rate_limited', true],
    [500, 'server', true],
    [503, 'server', true],
    [418, 'unknown', false],
  ])('maps HTTP %i to %s (retryable: %s)', async (status, kind, retryable) => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ status_message: 'Nope', status_code: 7 }, { status }));
    const error = await catchError(setup(fetchImpl).get('/movie/popular', request));
    expect(error.kind).toBe(kind);
    expect(error.status).toBe(status);
    expect(error.retryable).toBe(retryable);
    expect(error.message).toBe('Nope');
  });

  it('recognises the proxy telling us the server has no token', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse(
          { success: false, code: 'TMDB_NOT_CONFIGURED', status_message: 'not configured' },
          { status: 503 },
        ),
      );
    const error = await catchError(setup(fetchImpl).get('/movie/popular', request));
    expect(error.kind).toBe('not_configured');
    expect(error.retryable).toBe(false);
  });

  it('detects the SPA index.html being served instead of the proxy', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('<!doctype html><html></html>', { status: 200 }));
    const error = await catchError(setup(fetchImpl).get('/movie/popular', request));
    expect(error.kind).toBe('not_configured');
  });

  it('reports non-JSON, non-HTML bodies as a validation problem', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('garbage', { status: 200 }));
    const error = await catchError(setup(fetchImpl).get('/movie/popular', request));
    expect(error.kind).toBe('validation');
  });

  it('reports a well-formed but wrong-shaped body as a validation error', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ hello: 'world' }));
    const error = await catchError(setup(fetchImpl).get('/movie/popular', request));
    expect(error.kind).toBe('validation');
    expect(error.retryable).toBe(false);
  });

  it('never puts credentials into error messages', async () => {
    const key = 'abcdef0123456789abcdef0123456789';
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ status_message: 'Invalid API key' }, { status: 401 }));
    const error = await catchError(
      setup(fetchImpl, { apiKey: key }).get('/movie/popular', request),
    );
    expect(error.message).not.toContain(key);
  });
});
