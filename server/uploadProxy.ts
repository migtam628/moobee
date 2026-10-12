import crypto from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Password gate and streaming proxy for MooBee Stream's admin API.
 *
 * The browser only talks to `/api/upload/*`. The Stream admin key and the upload password stay
 * in this process. The video body is piped through; it is not buffered.
 */

export const UPLOAD_MOUNT_PATH = '/api/upload';
export const DEFAULT_STREAM_API_BASE_URL = 'http://127.0.0.1:8080/api';

const COOKIE_NAME = 'moobee_upload_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_BODY_LIMIT = 4 * 1024;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 8;
const UPLOAD_TIMEOUT_MS = 60 * 60 * 1000;
const STATUS_TIMEOUT_MS = 20_000;
const VIDEO_ID = /^[A-Za-z0-9_-]{1,200}$/;

export interface UploadProxyOptions {
  /** Shared page password. Missing or blank means the upload API is closed. */
  password: string | undefined;
  /** HMAC secret for the session cookie. */
  sessionSecret: string | undefined;
  /** MooBee Stream `ADMIN_API_KEY`. Sent only on the upstream request. */
  streamApiKey: string | undefined;
  /** Origin that already includes the `/api` prefix nginx strips. */
  streamApiBaseUrl?: string | undefined;
}

interface FailureWindow {
  count: number;
  resetAt: number;
}

function discard(req: IncomingMessage): void {
  req.resume();
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', Buffer.byteLength(payload));
  res.end(payload);
}

function routePath(url: string | undefined): string {
  const pathOnly = (url ?? '/').split('?')[0] ?? '/';
  const raw = pathOnly.length > 0 ? pathOnly : '/';
  const sliced = raw.startsWith(UPLOAD_MOUNT_PATH) ? raw.slice(UPLOAD_MOUNT_PATH.length) : raw;
  const stripped = sliced.length > 0 ? sliced : '/';
  const withSlash = stripped.startsWith('/') ? stripped : `/${stripped}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

function passwordMatches(submitted: string, expected: string): boolean {
  const left = crypto.createHash('sha256').update(submitted, 'utf8').digest();
  const right = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(left, right);
}

function sign(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function createSessionToken(secret: string, now: number): string {
  const body = Buffer.from(
    JSON.stringify({ exp: Math.floor((now + SESSION_TTL_MS) / 1000) }),
    'utf8',
  ).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

function readSession(token: string, secret: string, now: number): boolean {
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return false;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!safeEqual(signature, sign(body, secret))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { exp?: unknown };
    return typeof parsed.exp === 'number' && Number.isFinite(parsed.exp) && parsed.exp * 1000 > now;
  } catch {
    return false;
  }
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function isHttps(req: IncomingMessage): boolean {
  const socket = req.socket as { encrypted?: boolean };
  if (socket.encrypted) return true;
  const forwarded = req.headers['x-forwarded-proto'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() === 'https';
}

function setSessionCookie(req: IncomingMessage, res: ServerResponse, token: string, maxAge: number): void {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    `Path=${UPLOAD_MOUNT_PATH}`,
    `Max-Age=${maxAge}`,
  ];
  if (isHttps(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clientAddress(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? 'unknown';
}

function readBody(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const fail = (error: Error) => {
      req.resume();
      reject(error);
    };
    req.on('data', (chunk: Buffer | string) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      size += buffer.length;
      if (size > limit) {
        fail(new Error('too large'));
        return;
      }
      chunks.push(buffer);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function streamBase(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  const raw = (trimmed.length > 0 ? trimmed : DEFAULT_STREAM_API_BASE_URL).replace(/\/+$/, '');
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username !== '' || url.password !== '') return null;
    return raw;
  } catch {
    return null;
  }
}

function forward(
  req: IncomingMessage,
  res: ServerResponse,
  target: URL,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const transport = target.protocol === 'https:' ? httpsRequest : httpRequest;

    const upstream = transport(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port ? target.port : undefined,
        path: `${target.pathname}${target.search}`,
        method: req.method ?? 'GET',
        headers,
        timeout: timeoutMs,
      },
      (upstreamRes) => {
        if (settled) {
          upstreamRes.resume();
          return;
        }
        res.statusCode = upstreamRes.statusCode ?? 502;
        const contentType = upstreamRes.headers['content-type'];
        if (typeof contentType === 'string') res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        upstreamRes.on('error', fail);
        upstreamRes.on('end', finish);
        upstreamRes.pipe(res);
      },
    );

    const fail = () => {
      if (settled) return;
      settled = true;
      upstream.destroy();
      if (!res.writableEnded) {
        if (!res.headersSent) sendJson(res, 502, { error: 'Could not reach the stream server.' });
        else res.end();
      }
      resolve();
    };

    upstream.on('timeout', fail);
    upstream.on('error', fail);
    req.on('aborted', () => {
      upstream.destroy();
    });

    const method = req.method ?? 'GET';
    if (method === 'GET' || method === 'HEAD') upstream.end();
    else req.pipe(upstream);
  });
}

export function createUploadMiddleware(options: UploadProxyOptions) {
  const password = options.password?.trim() ?? '';
  const sessionSecret = options.sessionSecret?.trim() ?? '';
  const streamApiKey = options.streamApiKey?.trim() ?? '';
  const base = streamBase(options.streamApiBaseUrl);
  const configured = password.length > 0 && sessionSecret.length > 0 && streamApiKey.length > 0 && base !== null;
  const failures = new Map<string, FailureWindow>();

  function authenticated(req: IncomingMessage, now: number): boolean {
    if (!configured) return false;
    const token = readCookie(req.headers.cookie, COOKIE_NAME);
    if (!token) return false;
    return readSession(token, sessionSecret, now);
  }

  function tooManyFailures(address: string, now: number): boolean {
    const entry = failures.get(address);
    if (!entry || entry.resetAt <= now) return false;
    return entry.count >= MAX_LOGIN_FAILURES;
  }

  function recordFailure(address: string, now: number): void {
    const entry = failures.get(address);
    if (!entry || entry.resetAt <= now) {
      failures.set(address, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
      return;
    }
    entry.count += 1;
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method ?? 'GET';
    const path = routePath(req.url);
    const now = Date.now();

    if (method === 'GET' && path === '/session') {
      sendJson(res, 200, { authenticated: authenticated(req, now), configured });
      return;
    }

    if (method === 'POST' && path === '/logout') {
      discard(req);
      setSessionCookie(req, res, '', 0);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (!configured || !base) {
      discard(req);
      sendJson(res, 503, { error: 'Uploads are not configured.' });
      return;
    }

    if (method === 'POST' && path === '/login') {
      const address = clientAddress(req);
      if (tooManyFailures(address, now)) {
        discard(req);
        sendJson(res, 429, { error: 'Too many attempts. Try again later.' });
        return;
      }
      let submitted: string;
      try {
        const raw = await readBody(req, LOGIN_BODY_LIMIT);
        const parsed = JSON.parse(raw) as { password?: unknown };
        submitted = typeof parsed.password === 'string' ? parsed.password : '';
      } catch {
        sendJson(res, 400, { error: 'Enter a password.' });
        return;
      }
      if (!passwordMatches(submitted, password)) {
        recordFailure(address, now);
        sendJson(res, 401, { error: 'Wrong password.' });
        return;
      }
      failures.delete(address);
      setSessionCookie(req, res, createSessionToken(sessionSecret, now), SESSION_TTL_MS / 1000);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (!authenticated(req, now)) {
      discard(req);
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const videoId = /^\/videos\/([^/]+)$/.exec(path)?.[1];
    const list = method === 'GET' && path === '/videos';
    const status = method === 'GET' && videoId !== undefined && VIDEO_ID.test(videoId);
    const upload = method === 'POST' && path === '/videos';
    if (!list && !status && !upload) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const upstreamPath = upload
      ? '/v1/admin/videos'
      : status
        ? `/v1/videos/${videoId}`
        : '/v1/videos';
    let target: URL;
    try {
      target = new URL(`${base}${upstreamPath}`);
    } catch {
      sendJson(res, 503, { error: 'Uploads are not configured.' });
      return;
    }

    const headers: Record<string, string> = {
      'x-api-key': streamApiKey,
      accept: 'application/json',
    };
    if (upload) {
      const contentType = req.headers['content-type'];
      const contentLength = req.headers['content-length'];
      if (typeof contentType === 'string') headers['content-type'] = contentType;
      if (typeof contentLength === 'string') headers['content-length'] = contentLength;
    }

    await forward(req, res, target, headers, upload ? UPLOAD_TIMEOUT_MS : STATUS_TIMEOUT_MS);
  }

  return function uploadMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: (error?: unknown) => void,
  ): void {
    handle(req, res).catch((error: unknown) => {
      if (res.headersSent) {
        res.end();
        return;
      }
      next(error);
    });
  };
}
