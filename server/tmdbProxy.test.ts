// @vitest-environment node
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTmdbProxyMiddleware, resolveUpstreamUrl } from './tmdbProxy.ts';

const BASE = 'https://api.themoviedb.org/3';

describe('resolveUpstreamUrl', () => {
  it('maps an allowed path and query onto the upstream base URL', () => {
    expect(resolveUpstreamUrl('/movie/popular?language=en-US&page=2', BASE)).toBe(
      `${BASE}/movie/popular?language=en-US&page=2`,
    );
    expect(resolveUpstreamUrl('/trending/movie/week', `${BASE}/`)).toBe(
      `${BASE}/trending/movie/week`,
    );
    expect(resolveUpstreamUrl('/tv/1396/season/2', BASE)).toBe(`${BASE}/tv/1396/season/2`);
  });

  it('strips a client-supplied api_key so callers cannot swap credentials', () => {
    expect(resolveUpstreamUrl('/movie/popular?api_key=evil&page=1', BASE)).toBe(
      `${BASE}/movie/popular?page=1`,
    );
  });

  it.each([
    '/',
    '/account',
    '/authentication/token/new',
    '/movie/../account',
    '/movie/%2e%2e/account',
    '/movie/..%2faccount',
    '/movie//popular',
    '/movie/popular/',
    'movie/popular',
    '/movie/pop ular',
    '/movie/popular%00',
    '/movie/\\popular',
    '//evil.example.com/movie/popular',
  ])('refuses %s', (url) => {
    expect(resolveUpstreamUrl(url, BASE)).toBeNull();
  });
});

describe('createTmdbProxyMiddleware', () => {
  let server: Server | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      if (server)
        server.close(() => {
          resolve();
        });
      else resolve();
    });
    server = undefined;
  });

  async function start(options: Parameters<typeof createTmdbProxyMiddleware>[0]) {
    const middleware = createTmdbProxyMiddleware(options);
    server = createServer(middleware);
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it('answers 503 with a machine-readable code when no token is configured', async () => {
    const origin = await start({ token: undefined });
    const response = await fetch(`${origin}/movie/popular`);
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ code: 'TMDB_NOT_CONFIGURED' });
  });

  it('treats a whitespace-only token as missing', async () => {
    const origin = await start({ token: '   ' });
    expect((await fetch(`${origin}/movie/popular`)).status).toBe(503);
  });

  it('forwards to TMDB with the bearer token and relays status, body and caching', async () => {
    const upstream = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ page: 1, results: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json;charset=utf-8' },
      }),
    );
    const origin = await start({ token: 'secret-token', fetchImpl: upstream });

    const response = await fetch(`${origin}/movie/popular?page=1&api_key=evil`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ page: 1, results: [] });
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');

    const [url, init] = upstream.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE}/movie/popular?page=1`);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer secret-token');
  });

  it('never leaks the token to the browser in the response', async () => {
    const upstream = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }));
    const origin = await start({ token: 'secret-token', fetchImpl: upstream });
    const response = await fetch(`${origin}/movie/popular`);
    const headers = [...response.headers.entries()].flat().join(' ');
    expect(headers + (await response.text())).not.toContain('secret-token');
  });

  it('passes upstream errors through without caching them', async () => {
    const upstream = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status_message: 'Invalid API key', status_code: 7 }), {
        status: 401,
      }),
    );
    const origin = await start({ token: 'bad', fetchImpl: upstream });
    const response = await fetch(`${origin}/movie/popular`);
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('answers 404 for paths outside the allowlist without calling upstream', async () => {
    const upstream = vi.fn<typeof fetch>();
    const origin = await start({ token: 't', fetchImpl: upstream });
    const response = await fetch(`${origin}/account`);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'PROXY_PATH_NOT_ALLOWED' });
    expect(upstream).not.toHaveBeenCalled();
  });

  it('only allows GET and HEAD', async () => {
    const upstream = vi.fn<typeof fetch>();
    const origin = await start({ token: 't', fetchImpl: upstream });
    const response = await fetch(`${origin}/movie/popular`, { method: 'POST', body: '{}' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
    expect(upstream).not.toHaveBeenCalled();
  });

  it('answers 502 when TMDB is unreachable', async () => {
    const upstream = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));
    const origin = await start({ token: 'secret-token', fetchImpl: upstream });
    const response = await fetch(`${origin}/movie/popular`);
    expect(response.status).toBe(502);
    const text = await response.text();
    expect(text).toContain('UPSTREAM_UNREACHABLE');
    expect(text).not.toContain('secret-token');
  });

  it('uses a custom upstream base URL when configured', async () => {
    const upstream = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'));
    const origin = await start({
      token: 't',
      baseUrl: 'http://127.0.0.1:9999/3',
      fetchImpl: upstream,
    });
    await fetch(`${origin}/tv/popular`);
    expect(upstream.mock.calls[0]?.[0]).toBe('http://127.0.0.1:9999/3/tv/popular');
  });
});
