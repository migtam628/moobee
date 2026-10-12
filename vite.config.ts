import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { createTmdbProxyMiddleware, TMDB_PROXY_MOUNT_PATH } from './server/tmdbProxy.ts';
import { createUploadMiddleware, UPLOAD_MOUNT_PATH } from './server/uploadProxy.ts';

/**
 * Mounts the TMDB proxy on the Vite dev and preview servers so `npm run dev` is a single
 * process. The bearer token is read from the server-side environment only; it is never
 * prefixed with VITE_ and therefore never reaches the browser bundle.
 */
function uploadProxyPlugin(env: Record<string, string>): Plugin {
  const middleware = createUploadMiddleware({
    password: env.UPLOAD_PAGE_PASSWORD,
    sessionSecret: env.UPLOAD_SESSION_SECRET,
    streamApiKey: env.STREAM_ADMIN_API_KEY,
    streamApiBaseUrl: env.STREAM_API_BASE_URL,
  });
  return {
    name: 'moobee-upload-proxy',
    configureServer(server) {
      server.middlewares.use(UPLOAD_MOUNT_PATH, middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(UPLOAD_MOUNT_PATH, middleware);
    },
  };
}

function tmdbProxyPlugin(env: Record<string, string>): Plugin {
  const middleware = createTmdbProxyMiddleware({
    token: env.TMDB_READ_ACCESS_TOKEN,
    baseUrl: env.TMDB_API_BASE_URL,
  });
  return {
    name: 'moobee-tmdb-proxy',
    configureServer(server) {
      server.middlewares.use(TMDB_PROXY_MOUNT_PATH, middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(TMDB_PROXY_MOUNT_PATH, middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss(), tmdbProxyPlugin(env), uploadProxyPlugin(env)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      sourcemap: false,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
      css: false,
      restoreMocks: true,
    },
  };
});
