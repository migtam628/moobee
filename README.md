# MooBee

A movie and TV discovery app powered by [TMDB](https://www.themoviedb.org/).

- **Phase 1:** app shell, cinematic home page with a featured hero, Trending Movies / Popular
  Movies / Popular TV rows.
- **Phase 2:** movie and TV detail pages (cast, trailer, where to watch, recommendations, similar),
  global search (movies, TV and people, debounced, paginated), and lazily loaded Top Rated /
  Now Playing / Upcoming rows on the home page.
- **Phase 3:** watchlist, favorites and recently-viewed (`/watchlist`, synced across browser tabs);
  TV season/episode pages (`/tv/:id/season/:season`); a playback-provider abstraction plus player
  page shells (`/watch/movie/:id`, `/watch/tv/:id/:season/:episode`). No playback provider is
  registered yet, so every player page shows a "playback isn't available yet" state — see
  [Playback status](#playback-status) below.
- **Phase 4:** genre-filtered, sortable browse pages (`/movies`, `/tv`, via TMDB's `/discover`
  endpoints) replacing the earlier placeholder; person pages (`/person/:id`) with biography and
  filmography, linked from cast lists and search results.
- **Phase 5:** an anime page (`/anime`) — TMDB's Animation genre restricted to Japanese original
  language, with a movies/series toggle, reusing the Phase 4 genre-filter/sort/browse machinery.
- **Phase 5.1:** a generic, ready-to-configure playback provider (`embedProvider.ts`) — see
  [Playback status](#playback-status) below.
- **Phase 6:** **Surprise me** (`/surprise`): a hand of 3 random movie, series or anime picks in one
  tap, narrowed by mood, shuffled without waiting, with an optional AI mode; and a **Settings**
  page (`/settings`) for the AI key and the app's preferences — see
  [Surprise me and AI](#surprise-me-and-ai) below.

Not built yet: a real playback provider (no licensed source has been identified — see
[Playback status](#playback-status)), account-backed persistence (needs
Supabase, not yet wired up). See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

Requires Node 22.12 or newer.

```bash
npm install
# create .env and set TMDB_READ_ACCESS_TOKEN (see Environment)
npm run dev
```

Get a token from <https://www.themoviedb.org/settings/api> (the long "API Read Access Token").
Restart the dev server after editing `.env`.

Without a token the app still runs and shows a readable "not configured" state.

## Scripts

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Vite dev server with the TMDB proxy built in    |
| `npm run typecheck` | `tsc -b` (strict)                               |
| `npm run lint`      | ESLint (type-aware)                             |
| `npm test`          | Vitest                                          |
| `npm run build`     | Typecheck and production build to `dist/`       |
| `npm start`         | Production server: serves `dist/` and the proxy |
| `npm run format`    | Prettier                                        |

Production: `npm run build && npm start` (set `TMDB_READ_ACCESS_TOKEN` and optionally `PORT`).

## Environment

There is no `.env.example`. Put these in `.env`. The TMDB token and the upload secrets are
server-only. Anything prefixed `VITE_` is shipped to the browser. `VITE_TMDB_API_KEY` is an
insecure dev shortcut and must not be used in production. Do not put the stream admin key in a
`VITE_` variable.

| Name                              | Where  | Purpose                                                                           |
| --------------------------------- | ------ | --------------------------------------------------------------------------------- |
| `TMDB_READ_ACCESS_TOKEN`          | server | TMDB read token. The proxy adds it; the browser never sees it.                    |
| `VITE_PLAYBACK_PROVIDER_BASE_URL` | public | Embed origin. `https` for any host, or `http` only for `localhost` / `127.0.0.1`. |
| `UPLOAD_PAGE_PASSWORD`            | server | Shared password for `/upload`. If unset, upload routes return 503.                |
| `UPLOAD_SESSION_SECRET`           | server | HMAC secret for the upload session cookie.                                        |
| `STREAM_ADMIN_API_KEY`            | server | MooBee Stream admin key. Attached by the upload proxy, never sent to the browser. |
| `STREAM_API_BASE_URL`             | server | Stream API base. Defaults to `http://127.0.0.1:8080/api`.                         |

## Playback status

Watch pages embed MooBee Stream when `VITE_PLAYBACK_PROVIDER_BASE_URL` is set. For the local
stack that value is `http://127.0.0.1:8080`. Restart the dev server after changing it. Play
buttons then appear on detail pages and episode lists. The iframe loads
`{base}/movie/{tmdbId}` or `{base}/tv/{tmdbId}/{season}/{episode}` directly from Stream (HLS is
not proxied through MooBee). If that id has no ready video, Stream's own player shows its
unavailable state. Leaving the variable unset still shows "Playback isn't available yet".

`/upload` accepts a file, a title, a media type, and a TMDB id (plus season and episode for TV)
and streams it to Stream's admin API. It is not linked from the nav or the footer. Sign in with
`UPLOAD_PAGE_PASSWORD`. Only upload video you are allowed to host.

## Deploy with Docker

The `Dockerfile` builds the site and runs the production server (`npm start`) in one small image:

```bash
docker build -t moobee .
docker run -p 8787:8787 -e TMDB_READ_ACCESS_TOKEN=... moobee
```

Pass `--build-arg PLAYBACK_BASE_URL=https://your-player.example` only if you run your own player (see
[Playback status](#playback-status)); it is compiled into the site, so changing it means building again. The server speaks plain HTTP: put a reverse proxy that does HTTPS in front of it (Caddy, nginx, a platform's load
balancer).

## Surprise me and AI

`/surprise` deals 3 picks (1, 3 or 5 in Settings) for Anything, Movies, Series or Anime, optionally
narrowed by a mood ("Make me laugh", "Mind-bending", ...). A shuffle takes picks from a pool fetched
once, so it is instant; each card can be swapped for another, and titles already in My List,
Favorites or Recently Viewed are skipped (switchable). Anime is TMDB's Animation genre from Japan.

**AI mode** needs no server setup. Open `/settings`, pick Anthropic or OpenAI, paste your own API
key, and press Test connection. On `/surprise` an "Ask AI to choose" switch then appears, with an
optional free-text request ("something like Inception, but funnier"). The AI only suggests names;
every one is checked against TMDB, so only real titles are shown, each with the AI's reason. If the
AI fails, the page says so and deals random picks instead.

Where the key lives: in this browser's `localStorage` only. A request to `/api/ai/*` carries it to
this server, which forwards it to the provider (fixed hosts: `api.anthropic.com`,
`api.openai.com`) and does not store or log it. The prompt is built on the server from structured
fields, so the route is a picks service and not a general relay. Use a key with a small spending
limit. There is no server-side AI key on purpose: on a public site it would let anyone spend it.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
