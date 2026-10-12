import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createTmdbProxyMiddleware, TMDB_PROXY_MOUNT_PATH } from './tmdbProxy.ts';
import { createUploadMiddleware, UPLOAD_MOUNT_PATH } from './uploadProxy.ts';

/**
 * Production server: serves the built SPA from ./dist and proxies TMDB requests so the
 * read-access token never reaches the browser.
 *
 *   npm run build && npm start
 */

try {
  // Node >= 20.12 / 22: loads .env into process.env. Missing file is fine (e.g. real env vars).
  process.loadEnvFile('.env');
} catch {
  // No .env file; rely on the process environment.
}

const port = Number(process.env.PORT ?? 8787);
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const app = express();
app.disable('x-powered-by');

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(
  TMDB_PROXY_MOUNT_PATH,
  createTmdbProxyMiddleware({
    token: process.env.TMDB_READ_ACCESS_TOKEN,
    baseUrl: process.env.TMDB_API_BASE_URL,
  }),
);

app.use(
  UPLOAD_MOUNT_PATH,
  createUploadMiddleware({
    password: process.env.UPLOAD_PAGE_PASSWORD,
    sessionSecret: process.env.UPLOAD_SESSION_SECRET,
    streamApiKey: process.env.STREAM_ADMIN_API_KEY,
    streamApiBaseUrl: process.env.STREAM_API_BASE_URL,
  }),
);

// Hashed build assets are immutable; index.html must always be revalidated.
app.use(
  '/assets',
  express.static(path.join(distDir, 'assets'), {
    immutable: true,
    maxAge: '1y',
    fallthrough: false,
  }),
);
app.use(express.static(distDir, { index: false }));

// SPA fallback: every other GET serves the app shell so client-side routes work on refresh.
app.get('/{*splat}', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`MooBee listening on http://localhost:${port}`);
  if (!process.env.TMDB_READ_ACCESS_TOKEN) {
    console.warn('Warning: TMDB_READ_ACCESS_TOKEN is not set; TMDB requests will return 503.');
  }
  if (!process.env.UPLOAD_PAGE_PASSWORD) {
    console.warn('Warning: UPLOAD_PAGE_PASSWORD is not set; /upload will return 503.');
  }
});
