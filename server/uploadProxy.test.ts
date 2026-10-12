// @vitest-environment node
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { createUploadMiddleware } from './uploadProxy.ts';

const PASSWORD = 'correct-horse';
const SECRET = 'test-session-secret';
const API_KEY = 'test-stream-key';

describe('createUploadMiddleware', () => {
  const servers: Server[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => {
              resolve();
            });
          }),
      ),
    );
  });

  async function listen(server: Server): Promise<string> {
    servers.push(server);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        resolve();
      });
    });
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  async function startApp(options: Parameters<typeof createUploadMiddleware>[0]) {
    const app = express();
    app.use('/api/upload', createUploadMiddleware(options));
    return listen(createServer(app));
  }

  function startUpstream(onRequest?: (req: IncomingMessage, body: string) => void) {
    let calls = 0;
    const server = createServer((req, res) => {
      calls += 1;
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        onRequest?.(req, body);
        const payload = JSON.stringify({
          id: 'vid-1',
          slug: 'vid-1',
          status: 'queued',
          statusUrl: '/api/v1/videos/vid-1',
        });
        res.writeHead(202, { 'content-type': 'application/json' });
        res.end(
          req.method === 'GET'
            ? JSON.stringify({ id: 'vid-1', status: 'processing', processing_progress: 10 })
            : payload,
        );
      });
    });
    return { server, calls: () => calls };
  }

  function sessionCookie(response: Response): string | undefined {
    const header = response.headers.get('set-cookie');
    if (!header) return undefined;
    return header.split(';')[0];
  }

  it('returns 503 for login and proxies when UPLOAD_PAGE_PASSWORD is missing, and does not call Stream', async () => {
    const upstream = startUpstream();
    const streamOrigin = await listen(upstream.server);
    const origin = await startApp({
      password: undefined,
      sessionSecret: SECRET,
      streamApiKey: API_KEY,
      streamApiBaseUrl: `${streamOrigin}/api`,
    });

    const session = await fetch(`${origin}/api/upload/session`);
    expect(session.status).toBe(200);
    expect(await session.json()).toEqual({ authenticated: false, configured: false });

    for (const path of ['/api/upload/login', '/api/upload/videos', '/api/upload/videos/vid-1']) {
      const method = path.endsWith('/login') || path.endsWith('/videos') ? 'POST' : 'GET';
      const response = await fetch(`${origin}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ password: PASSWORD }) : undefined,
      });
      expect(response.status).toBe(503);
    }
    expect(upstream.calls()).toBe(0);
  });

  it('does not set a session cookie when the password is wrong', async () => {
    const origin = await startApp({
      password: PASSWORD,
      sessionSecret: SECRET,
      streamApiKey: API_KEY,
    });

    const response = await fetch(`${origin}/api/upload/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'nope' }),
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(JSON.stringify(await response.json())).not.toContain(PASSWORD);

    const session = await fetch(`${origin}/api/upload/session`);
    expect(await session.json()).toMatchObject({ authenticated: false, configured: true });
  });

  it('returns 401 for upload and status proxies without a session and does not call Stream', async () => {
    const upstream = startUpstream();
    const streamOrigin = await listen(upstream.server);
    const origin = await startApp({
      password: PASSWORD,
      sessionSecret: SECRET,
      streamApiKey: API_KEY,
      streamApiBaseUrl: `${streamOrigin}/api`,
    });

    const upload = await fetch(`${origin}/api/upload/videos`, {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=abc' },
      body: 'not-a-real-body',
    });
    const list = await fetch(`${origin}/api/upload/videos`);
    const status = await fetch(`${origin}/api/upload/videos/vid-1`);

    expect(upload.status).toBe(401);
    expect(list.status).toBe(401);
    expect(status.status).toBe(401);
    expect(upstream.calls()).toBe(0);
  });

  it('sets an httpOnly session and pipes the upload body with the admin key', async () => {
    let seenKey = '';
    let seenBody = '';
    let seenPath = '';
    const upstream = startUpstream((req, body) => {
      seenKey = String(req.headers['x-api-key'] ?? '');
      seenBody = body;
      seenPath = req.url ?? '';
    });
    const streamOrigin = await listen(upstream.server);
    const origin = await startApp({
      password: PASSWORD,
      sessionSecret: SECRET,
      streamApiKey: API_KEY,
      streamApiBaseUrl: `${streamOrigin}/api`,
    });

    const login = await fetch(`${origin}/api/upload/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD }),
    });
    expect(login.status).toBe(200);
    const cookie = sessionCookie(login);
    expect(cookie).toBeTruthy();
    expect(cookie).toContain('moobee_upload_session=');
    expect(cookie).not.toContain(PASSWORD);
    expect(login.headers.get('set-cookie')).toContain('HttpOnly');
    expect(login.headers.get('set-cookie')).toContain('SameSite=Lax');

    const payload = 'file-bytes-boundary';
    const upload = await fetch(`${origin}/api/upload/videos`, {
      method: 'POST',
      headers: {
        cookie: cookie ?? '',
        'content-type': 'multipart/form-data; boundary=abc',
      },
      body: payload,
    });
    expect(upload.status).toBe(202);
    const accepted = (await upload.json()) as { id: string; status: string };
    expect(accepted).toMatchObject({ id: 'vid-1', status: 'queued' });
    expect(JSON.stringify(accepted)).not.toContain(API_KEY);
    expect(seenKey).toBe(API_KEY);
    expect(seenBody).toBe(payload);
    expect(seenPath).toBe('/api/v1/admin/videos');

    const status = await fetch(`${origin}/api/upload/videos/vid-1`, { headers: { cookie: cookie ?? '' } });
    expect(status.status).toBe(202);
    expect(await status.json()).toMatchObject({ status: 'processing', processing_progress: 10 });
  });
});
