# MooBee architecture (Phases 1-5)

## Starting point

MooBee began as a greenfield project: the workspace contained no repository, so there was
nothing to audit or migrate. Everything below was created in Phases 1 through 5.

## Stack

| Concern      | Choice                                  | Notes                                                                   |
| ------------ | --------------------------------------- | ----------------------------------------------------------------------- |
| UI           | React 19, TypeScript 6 (strict), Vite 8 | TS is pinned to 6.0 because typescript-eslint does not support TS 7 yet |
| Styling      | Tailwind CSS 4 (`@tailwindcss/vite`)    | Design tokens live in `src/index.css` under `@theme`                    |
| Routing      | React Router 7 (data router)            | Route table in `src/app/routes.tsx`, pages lazy-loaded                  |
| Server state | TanStack Query 5                        | 5 min stale time, retry only transient errors                           |
| Validation   | Zod 4                                   | API responses and client env                                            |
| API proxy    | Node `http` middleware + Express 5      | Vite dev/preview middleware in dev, Express in production               |
| Icons        | lucide-react                            |                                                                         |
| Tests        | Vitest 5, React Testing Library, jsdom  |                                                                         |

New dependencies beyond the project brief: `express` and `tsx` (production server), `zod`
(named in the brief), `@fontsource-variable/inter` (self-hosted font, no third-party request).

## Data flow

```
React component
  -> hook (src/hooks/useMediaQueries.ts, TanStack Query)
    -> service (src/api/tmdb/{movies,tv,trending,search,discover,genres,people}.ts)
      -> client (src/api/tmdb/client.ts): fetch + Zod validation + typed errors
        -> /api/tmdb/*  (server/tmdbProxy.ts adds the secret bearer token)
          -> https://api.themoviedb.org/3
      <- raw TMDB shape (types.ts, inferred from schemas.ts)
    <- mappers.ts / detailMappers.ts / personMappers.ts convert to MediaItem / MediaPage /
       MovieDetails / TvDetails / SearchPage / PersonDetails
  <- components only ever see normalized models (src/types/media.ts)
```

### Layer rules

1. Only `src/api/tmdb/client.ts` calls `fetch()` for metadata. ESLint forbids `fetch` elsewhere in
   `src/` (allowed in `src/api`, tests, and Node code).
2. Raw TMDB types (`src/api/tmdb/types.ts`) never leave `src/api/tmdb`. Components import
   `MediaItem`, `MediaPage`, `Genre`, and `MediaType` from `@/types/media`.
3. Movie ids, TV ids, and IMDb ids are different namespaces. `MediaItem` always carries
   `mediaType`; React keys and URLs are built from `(mediaType, id)`. `imdbId` is only set after a
   details lookup (`imdb_id` / `external_ids`), never guessed.
4. Image URLs come only from `src/api/tmdb/images.ts`. Paths are validated against a strict
   pattern, so a bad value from the API cannot redirect an `<img>` to another host.
5. Swapping the metadata provider means rewriting `src/api/*` (client, schemas, mappers) and
   nothing in `components/`, `pages/`, or `hooks/`.

## Details and search (Phase 2)

**Details.** `getMovieDetails` / `getTvDetails` make one request with `append_to_response`
(credits, videos, recommendations, similar, watch/providers, release dates or content ratings,
external ids). Each appended section is validated independently (`detailSchemas.ts`): a malformed
`credits` block costs the page its cast, not the whole page. Selection rules live in
`detailMappers.ts`, so the UI knows nothing about TMDB: best trailer (official, then any trailer,
then teaser; YouTube with a validated key only), region-specific certification and providers
(`TMDB_REGION`, default `US`), and billing-ordered cast. Trailers may be requested in the UI
language plus untagged (`include_video_language`), because TMDB otherwise hides many of them.

**Pages.** `MoviePage` and `TvPage` only parse the `:id` (`parseRouteId` accepts plain positive
integers, so junk never reaches the API) and hand a query to the shared `DetailsView`, which owns
the loading / not-found / error / success states. An unknown id shows "not found" (from the
`not_found` error kind), not a generic failure.

**Search.** `SearchPage` keeps the input local, debounces it 300 ms (`SEARCH_DEBOUNCE_MS`), and
feeds the debounced term to `useSearch` (`useInfiniteQuery` over `/search/multi`, minimum 2
characters, previous results kept while a new term loads). `?q=` mirrors the searched term with
`replace`, so results are shareable and Back does not step through keystrokes. Pagination is a
"Load more" button rather than infinite scroll (keyboard and screen-reader friendly, no
runaway requests).

**Lazy rows.** Below-the-fold home rows use `LazyMediaRow` + `useInView`: the request is held until
the row is within 400 px of the viewport.

**People** appear in search results and in cast lists but are not links yet (no person page).

**Watch providers** come from JustWatch via TMDB and require attribution; it is rendered inside
`WatchProviderList`. The "All options" link is only rendered when it is https on
`www.themoviedb.org` (`getSafeExternalUrl`).

## Library, seasons and playback (Phase 3)

**Watchlist, favorites, recently viewed.** State lives in `src/lib/libraryStore.ts`, a plain
external-store singleton (`libraryStore`) read through `useLibrary` (`useSyncExternalStore`), not
a React Context. That was a deliberate choice: the store behaves identically whether or not a
component tree happens to be wrapped in a provider, which matters for components (e.g.
`MediaCard`) rendered in isolation in tests. Persistence goes through `src/lib/storage.ts`, a
`localStorage` wrapper (`readJSON` / `writeJSON` / `removeItem`) where every call is try/caught,
so private browsing, a full quota, or storage disabled by policy degrade to an in-memory,
non-persisted session instead of throwing. The store listens for the browser `storage` event, so
watchlist/favorite changes in one tab are reflected in every other open tab. `WatchlistButton` and
`FavoriteButton` (`src/components/media/`) are the only UI that mutates the store; each has an
icon variant for cards and a pill variant for the detail hero. `WatchlistPage` (`/watchlist`)
presents the three lists — Watchlist, Favorites, Recently Viewed — behind an accessible tabbed
interface built on the WAI-ARIA tabs pattern (`role="tablist"`/`"tab"`/`"tabpanel"`, roving
`tabindex`, arrow-key navigation). Recently-viewed entries are recorded automatically once a
movie or TV details page finishes loading, most-recent-first, capped at 24 entries.

**TV seasons and episodes.** `getTvSeason(tvId, seasonNumber)` calls
`/tv/{id}/season/{season_number}` and is validated and mapped the same way as the other detail
endpoints (`seasonSchemas.ts` → `detailMappers.ts`), producing the normalized `SeasonSummary`,
`Episode`, and `SeasonDetails` types in `src/types/media.ts`; `TvDetails` gained a
`seasons: SeasonSummary[]` field. `SeasonSelector` (`src/components/tv/`) is a horizontally
scrolling strip of seasons, shared by the TV details page and the season page, and highlights
whichever season is active. `EpisodeSelector` is a vertical list of episodes (still, runtime, air
date, rating, overview) that gains a hover "Play" affordance once a playback provider is
registered. `TvSeasonPage` (`/tv/:id/season/:season`) owns its own loading/error/not-found states,
the same pattern `DetailsView` uses for movie/TV details. Formatting an episode's air date
(`formatAirDate` in `src/lib/format.ts`) parses and formats in UTC on both ends; an earlier
version parsed in UTC but formatted in local time, which shifted the displayed date by a day
depending on the system timezone — a real bug a test caught, not a hypothetical one.

**Playback provider abstraction.** `src/services/playback/types.ts` defines `PlaybackRequest` and
`PlaybackProvider` per the project brief. `src/services/playback/providerRegistry.ts` exports the
`playbackProviderRegistry` singleton (`register`, `resolve`, `getPlaybackUrl`,
`hasAnyProvider`) — the only thing player pages and components are allowed to talk to; nothing in
`components/` or `pages/` ever references a provider or a provider URL shape directly.
`src/services/playback/authorizedProvider.ts` is where a real, authorized provider gets
registered; today it registers nothing (per the brief: "Only connect playback providers/content
that the project owner is authorized to distribute or embed"), and is documented with example
registration code for when one is authorized. It is imported once, as a side effect, from
`src/main.tsx`, so a future `register()` call actually runs at startup.

**Player pages.** `MoviePlayerPage` (`/watch/movie/:id`) and `TvPlayerPage`
(`/watch/tv/:id/:season/:episode`) are laid out like a video site's watch page (`WatchLayout`):
the player with its title, a "channel" row (the show or the movie's director, with Watchlist,
Favorite, Share and Details pills, plus prev/next episode for TV via `EpisodeNavigation`, which
rolls over into the next or previous season at a season boundary) and a grey description box
(`DescriptionBox`: rating, votes and date, genres as #tags, the synopsis with "…more", and the
credits once opened) on the left, and an "Up next" column (`UpNext`) on the right: the Autoplay
switch (`AutoplayToggle`, persisted via `useAutoplayPreference`), filter chips and thumbnail rows.
For a show the chips are Episodes (with a season picker that changes only the list, not what is
playing), More like this and Similar; for a movie, More like this and Similar. Theater mode
(`usePlayerView`, persisted, `t` shortcut) widens the player across the page with the info and
the list below it; the slots are placed with CSS grid, not moved in the tree, so toggling never
remounts the iframe. Under `lg` everything is one column with a full-bleed player. The pure
helpers (stats line, up-next rows, anime detection) are in `src/lib/watch.ts`. `VideoPlayer`
(`src/components/player/VideoPlayer.tsx`) is a responsive 16:9 `<iframe>` embed with a loading
skeleton, retry-on-error, and theater and fullscreen toggles. It keeps its own host allowlist
(`ALLOWED_PLAYER_HOSTS`, currently empty) as a second, independent safety gate on top of the
provider registry — an unexpected host can never reach the `<iframe>` even if a bug let a bad URL
through the registry, and both allowlists must be updated together when a real provider is added.
`PlaybackUnavailable` is the empty state every player page shows today, since no provider is
registered. A "Play" button conditionally renders on `DetailsHero` and in `EpisodeSelector`,
gated on `playbackProviderRegistry.hasAnyProvider()`, so it appears automatically once a provider
is registered with no other code changes required. As with Phase 2, metadata/API logic never
lives in the player component: pages fetch details through the normal TMDB hooks and ask the
registry for a URL, and `VideoPlayer` only renders whatever URL it is given.

**Known limitation.** Playback is not functional yet. Every player page shows "Playback isn't
available yet" because `authorizedProvider.ts` registers no provider. This is intentional, not a
bug: it is the state the project brief's authorization constraint requires until a real,
authorized provider is wired in.

## Browse and people (Phase 4)

**Genres.** `getMovieGenres` / `getTvGenres` (`src/api/tmdb/genres.ts`) call
`/genre/{movie,tv}/list`. TMDB's genre list changes on the order of once a year, so
`useMovieGenres` / `useTvGenres` set `staleTime: Infinity` — once fetched, a genre list is never
refetched for the life of the session.

**Discover.** `discoverMovies` / `discoverTv` (`src/api/tmdb/discover.ts`) wrap
`/discover/{movie,tv}`, taking an app-level `DiscoverSort` (`'popularity' | 'rating' | 'newest'`)
that is translated to TMDB's `sort_by` internally — the UI never sees TMDB's parameter names.
Sorting by rating adds `vote_count.gte=50`, so a single 10/10 vote can't outrank a genuinely
well-reviewed title; sorting by "newest" uses `primary_release_date` for movies and
`first_air_date` for TV, since TMDB has no single date field that works for both. `useDiscoverMovies`
/ `useDiscoverTv` (`useMediaQueries.ts`) are `useInfiniteQuery`s, deduplicated and paginated the
same way `useSearch` is.

**Browse pages.** `/movies` and `/tv` replace the Phase 1-3 "coming soon" stubs. Each page
(`MoviesPage.tsx`, `TvShowsPage.tsx`) owns its own genre/discover query hooks — calling
`useMovieGenres()` vs `useTvGenres()` conditionally in one shared component would violate the
rules of hooks, so the media-type choice is made once, at the top of each thin page, and the
shared `MediaBrowseView` (`src/components/browse/`) is purely presentational, taking the query
results as props. `GenreFilter` is a single-select pill row (`role="group"`, `aria-pressed` per
pill); `SortControl` is a plain `<select>`. Filters are synced to the URL (`?genre=`, `?sort=`) by
`useBrowseParams`, the same "URL is the source of truth" pattern `SearchPage` uses for `?q=`, so a
filtered view is shareable and survives back/forward navigation; the default sort (`popularity`)
is omitted from the URL to keep a plain `/movies` link clean.

**People.** `getPersonDetails` (`src/api/tmdb/people.ts`) calls `/person/{id}` with
`append_to_response=combined_credits,external_ids` in one request. `personMappers.ts` maps
`combined_credits.cast` into ordinary `MediaItem`s (deduplicated by `(mediaType, id)`, ranked by
popularity, capped at 30) rather than a separate "credit" model, so `PersonPage` can render a
person's filmography with the same `MediaGrid` every other page uses. Crew credits (director,
writer, ...) are not shown in this phase. `PersonPage` (`/person/:id`) follows the same
loading/error/not-found shell as `DetailsView`. `PersonCard` (used by both `CastList` and
`SearchResults`) is now a link to `/person/:id` instead of a static card; its accessible name is
set explicitly via `aria-label` rather than left to the link's text content, because the card's
own "Known for: ..." line can otherwise collide with an unrelated title link of the same name in
`getByRole('link', { name })` queries (and, for a screen reader, is genuinely more useful read as
just the person's name).

## Anime (Phase 5)

TMDB has no first-class "anime" flag. `/anime` uses the conventional approximation — the
"Animation" genre (id `16`) restricted to a Japanese original language
(`with_original_language=ja`) — via `discoverAnimeMovies` / `discoverAnimeTv`
(`src/api/tmdb/discover.ts`). It's an approximation, not an authoritative classification: it can
miss non-Japanese-language anime co-productions and include some non-anime Japanese animation.
When the viewer also picks a genre pill, it is ANDed with the base genre (TMDB: comma-separated
`with_genres` values are AND'd, so `with_genres=16,14` means Animation _and_ Fantasy).

**Movies/series toggle.** Unlike `/movies` and `/tv`, which each own a fixed media type, `/anime`
lets the viewer flip between anime movies and anime series on one page. `useMediaKindParam`
(`?kind=`) is the URL-synced toggle state, the same pattern `useBrowseParams` uses for
`?genre=`/`?sort=`; switching kind also clears `?genre=`, since a genre id selected against one
media type's genre list rarely means the same thing (or exists at all) in the other's.
`AnimePage` mounts both kinds' query hooks unconditionally — `useMovieGenres`/`useTvGenres` and
`useDiscoverAnimeMovies`/`useDiscoverAnimeTv` all take an `enabled` flag now — so only the active
kind's `enabled` is `true`. This keeps the component within the rules of hooks (no
conditionally-called hooks) while never re-mounting anything or losing the inactive kind's cache
when the toggle flips.

**Component changes.** `MediaBrowseView` (shared by `/movies`, `/tv` and `/anime`) took two
generalizing edits to support this: its `genresQuery` prop became a plain `genres: Genre[] |
undefined`, since the component only ever read `.data` off the query result and a plain array is
what lets `AnimePage` pass a client-filtered list (the base "Animation" genre is excluded from the
pills — it's the fixed filter already, so offering it as a selectable pill would be redundant);
and it gained an `extraControls?: ReactNode` slot rendered next to `SortControl`, which
`MediaKindToggle` (`src/components/browse/`) fills in on the anime page and which `MoviesPage`/
`TvShowsPage` simply don't pass. `mediaKeys.discover`'s first parameter was widened from
`'movie' | 'tv'` to a plain `string` "kind" discriminator (`'anime-movie'` / `'anime-tv'`), so the
new anime queries get their own cache entries and never collide with the plain browse pages'.

## Surprise me, AI and Settings (Phase 6)

**Surprise me** (`/surprise`, `SurprisePage`). The pure logic is in `src/lib/surprise.ts`: moods map
to TMDB genre ids per type (movie and TV genres differ), `buildPoolPlan` turns a kind and mood into
the TMDB lists to draw from (a random page of 1 to 6 of well-liked titles, via `discoverPool` in
`api/tmdb/discover.ts`: popularity order, a vote-count floor and a rating floor; anime is Animation
with Japanese original language, and a mood can only narrow it to one genre because TMDB cannot mix
"all of" and "any of"), and `preparePool`, `interleaveTypes` and `matchSuggestion` shuffle, mix and
verify. `useSurprise` holds the state: a *pool* is fetched once per request (kind, mood, AI text) and
dealt from, so shuffling and swapping a card cost no network until the pool runs dry; picks already
dealt, and (by setting) anything in the library, are skipped, and a narrow pool may repeat earlier
picks rather than deal a short hand. The first hand is dealt on open from TMDB at random; the AI is
only called when the button is pressed. Safe under React StrictMode (`deal` cancels the earlier call).

**AI mode.** `server/aiProxy.ts` (`/api/ai/picks`, `/api/ai/test`) relays to Anthropic or OpenAI with
the *viewer's* key, sent with each request. It stores and logs nothing, only calls fixed hosts, builds
the prompt itself from validated fields (viewer text is passed as JSON data, with an instruction to
treat it as data), parses the reply defensively, and maps upstream failures to codes
(`AI_KEY_REJECTED`, `AI_RATE_LIMITED`, ...) without passing the upstream body on. The browser side is
`src/api/ai/client.ts`. The AI only returns names: `useSurprise` checks each against TMDB
(`searchTitle`, same name and a year within one) and shows only titles that exist, with the AI's
reason. Any failure falls back to random picks with a notice. There is deliberately no server-side
key: on a public site it would let anyone spend it.

**Settings** (`/settings`, `SettingsPage`). `src/lib/settingsStore.ts` is an external store built like
the library store (`localStorage` key `moobee:settings:v1`, `useSyncExternalStore` through
`useSettings`, synced across tabs). Stored values are normalised on load, so a broken or old entry
falls back to defaults one field at a time. It holds the AI provider, model and key and the Surprise
preferences; Settings also edits the autoplay preference (own key), clears the lists, and resets.

## Playback and persistence: scope decisions

Two features that were in scope for this phase are deliberately **not** built:

- **A real playback provider.** The requested source (vidup.to) is a public video-hosting/embed
  site with no licensing relationship to this project — confirmed directly with the project
  owner. A follow-up request to use a personal npm/GitHub wrapper (`vidplus-movie-player`) was
  also declined: it's a thin URL-building convenience layer with no media of its own, and every
  URL it builds still points at `vidup.to` — the wrapper doesn't change what's being embedded or
  its licensing status. Per the brief ("Only connect playback providers/content that the project
  owner is authorized to distribute or embed"), a real source is out of scope unless/until a
  properly licensed one is identified. What _is_ built (Phase 5.1, see
  [Playback](#playback) above): a generic, provider-agnostic `PlaybackProvider` implementation
  (`embedProvider.ts`) gated behind an unset-by-default env var. No host is embedded and no
  provider is registered today — this only removes the code-writing step for next time. When a
  licensed source exists, wiring it in is a `.env` change (or, if its URL convention differs from
  the common one, a small edit to `embedProvider.ts`), not new plumbing.
- **Supabase-backed accounts, a Settings page, and the AI "quick pick" recommendation feature.**
  These three are one connected piece of work: a per-user OpenAI/Anthropic API key has to belong
  to an actual account, so accounts (Supabase Auth) have to exist before a Settings page can store
  one, before the recommendation feature can read it. Blocked on the project owner supplying the
  Supabase project URL/anon key and an auth-method preference; not started.

## Security model

- The TMDB read-access token lives only in `TMDB_READ_ACCESS_TOKEN` (server environment, no
  `VITE_` prefix), so it is never bundled into browser code.
- The proxy is GET/HEAD only, allow-lists top-level TMDB resources, accepts only
  `[A-Za-z0-9_-]` path segments (no traversal, no encoded dots), strips a client-supplied
  `api_key`, has a 10 s upstream timeout, and never logs headers or URLs.
- `VITE_TMDB_API_KEY` enables an insecure direct mode for quick experiments. It exposes the key
  to every visitor; the client logs a production warning if it is set.
- External URLs from API data are never used as-is: image paths are pattern-checked, YouTube embeds
  are built from a validated key on `youtube-nocookie.com`, and the "where to watch" link must be
  https on `www.themoviedb.org`. Player iframes are https on the configured host, or http only when
  that host is `localhost` or `127.0.0.1`.
- `.env` is git-ignored. Server-only upload settings are `UPLOAD_PAGE_PASSWORD`,
  `UPLOAD_SESSION_SECRET`, `STREAM_ADMIN_API_KEY`, and `STREAM_API_BASE_URL`. The stream admin key
  is never given a `VITE_` name.
- The AI key is the viewer's own, kept in their browser's `localStorage` (an XSS bug would expose it,
  so it should be a key with a spending limit). `/api/ai/*` is a POST-only JSON relay: it forwards
  the key to fixed provider hosts, never stores or logs it or echoes it (or the upstream body) in
  errors, validates the key and model shape (no header injection), bounds the body (32 KB) and the
  viewer text, and builds the prompt itself. There is no server-held AI key.

## Error handling

`TmdbError` has a `kind` (`network`, `not_configured`, `unauthorized`, `not_found`,
`rate_limited`, `server`, `validation`, `unknown`), a `retryable` flag, and a `userMessage` that is
safe to display. Every list has loading (skeleton), error (message + retry), empty, and success
states. A route-level error boundary and a first-load fallback prevent blank screens. One
malformed item in a TMDB page is dropped instead of failing the whole page.

## Folder structure

```
server/                    TMDB proxy (framework-free) + production Express server
src/
  api/tmdb/                client, schemas, detailSchemas, searchSchemas, seasonSchemas,
                           personSchemas, types, errors, images, mappers, detailMappers,
                           personMappers, movies, tv, trending, search, discover, genres, people
  app/routes.tsx           route table
  components/
    layout/                AppShell, Navbar, MobileNav, Footer, Logo
    media/                 Hero, MediaCard, MediaRow, MediaQueryRow, LazyMediaRow, MediaGrid,
                           PosterImage, RatingBadge, CastList, PersonCard, WatchProviderList,
                           TrailerModal, SearchBox, WatchlistButton, FavoriteButton, skeletons
    details/               DetailsView, DetailsHero, DetailsSkeleton
    tv/                    SeasonSelector, EpisodeSelector
    player/                VideoPlayer, PlaybackUnavailable, WatchLayout, WatchInfo, DescriptionBox, UpNext, AutoplayToggle,
                           EpisodeNavigation
    browse/                GenreFilter, SortControl, MediaBrowseView, MediaKindToggle
    surprise/              PickCard, PickControls
    settings/              SettingsSection, SettingRow, AiSettings
    search/                SearchResults
    ui/                    ErrorState, EmptyState, LoadingSkeleton, PageLoader, Modal
  config/env.ts            validated client environment
  hooks/                   query hooks, debounce, in-view, document title, reduced-motion, scroll,
                           useLibrary (useSyncExternalStore), useAutoplayPreference,
                           useBrowseParams (genre/sort <-> URL), useMediaKindParam (kind <-> URL)
  lib/                     routes, media/format/details helpers, url + video safety, query client,
                           cn, storage (safe localStorage), libraryStore (watchlist/favorites/
                           recently-viewed singleton)
  pages/                   HomePage, MoviePage, TvPage, TvSeasonPage, MoviesPage, TvShowsPage,
                           AnimePage, PersonPage, SearchPage, WatchlistPage, MoviePlayerPage,
                           TvPlayerPage, NotFoundPage, RouteErrorPage
  services/playback/       types, providerRegistry (playbackProviderRegistry singleton),
                           embedProvider (generic {base}/movie|tv/... PlaybackProvider factory),
                           authorizedProvider (registers embedProvider iff a base URL is
                           configured; registers nothing by default; imported once from main.tsx)
  types/                   media.ts (normalized models incl. SeasonSummary/Episode/SeasonDetails/
                           PersonDetails), library.ts (LibraryEntry)
  test/                    setup, fixtures, app harness (fake API + routed render)
```

## Routes

| Route                            | Status                                         |
| -------------------------------- | ---------------------------------------------- |
| `/`                              | Implemented                                    |
| `/movie/:id`                     | Implemented (Phase 2)                          |
| `/tv/:id`                        | Implemented (Phase 2)                          |
| `/tv/:id/season/:season`         | Implemented (Phase 3)                          |
| `/movies`, `/tv`                 | Implemented (Phase 4) — genre filter, sort     |
| `/surprise`                      | Implemented (Phase 6) — random or AI picks     |
| `/settings`                      | Implemented (Phase 6) — AI key, preferences    |
| `/person/:id`                    | Implemented (Phase 4)                          |
| `/anime`                         | Implemented (Phase 5) — movies/series toggle   |
| `/search?q=`                     | Implemented (Phase 2)                          |
| `/watchlist`                     | Implemented (Phase 3)                          |
| `/watch/movie/:id`               | Implemented — embeds Stream when the playback base URL is set |
| `/watch/tv/:id/:season/:episode` | Implemented — embeds Stream when the playback base URL is set |
| `/upload`                        | Implemented — unlisted; password-gated upload proxy |
| `*`                              | 404 page                                       |

## Playback

`src/services/playback/types.ts` contains the `PlaybackRequest` and `PlaybackProvider`
interfaces from the brief. As of Phase 3, the registry (`providerRegistry.ts`), the registration
point (`authorizedProvider.ts`), the embed component (`VideoPlayer.tsx`), and both player pages
exist and are wired together. See
[Library, seasons and playback (Phase 3)](#library-seasons-and-playback-phase-3) above for detail.
Provider URLs belong only inside provider implementations registered in `authorizedProvider.ts`;
the player asks the registry for a URL and never constructs one itself.

**Generic embed provider (Phase 5.1).** `createEmbedProvider` (`embedProvider.ts`) implements
`PlaybackProvider` against the common third-party embed URL convention —
`{base}/movie/{tmdbId}` and `{base}/tv/{tmdbId}/{season}/{episode}`, `autoPlay=true` appended
when autoplay is requested — parameterized on a `baseUrl`. `authorizedProvider.ts` registers it
only when `VITE_PLAYBACK_PROVIDER_BASE_URL` is set. The value must be `https`, or `http` on
`localhost` / `127.0.0.1` (the local MooBee Stream at `http://127.0.0.1:8080`). Unset, nothing
registers and every player page still shows "playback isn't available yet". Setting the base URL
makes Play buttons appear without a code change. `/upload` proxies admin uploads to Stream; it
is not in the public nav. If the authorized provider's URL shape or parameters differ from the
convention above,
`embedProvider.ts` is the one file that needs adjusting; nothing else in the app talks to a
provider directly. `VideoPlayer`'s iframe host allowlist (`ALLOWED_PLAYER_HOSTS`) is derived from
the same configured base URL, not hand-maintained, so it can never drift from what's actually
registered — empty (nothing embeddable) until a base URL is configured. Verified end-to-end
against a placeholder base URL (a non-media host, purely to prove the wiring): configuring it
made the registry register, the allowlist accept that host, and the player render a real iframe
instead of the "unavailable" state — confirming the "flip a switch" behavior actually works.

## Known constraints

- Verified against a mock TMDB server, not live TMDB (the build environment could not reach it).
  Zod schemas are written from TMDB's documented shapes and are lenient by design, but the first
  run against the real API may still surface fields that need adjusting.
- The trailer embed was not exercised end to end: the build environment could not reach YouTube,
  so only the embed URL and the dialog behaviour were verified.
- TMDB requires attribution (text is in the footer) and asks for its logo in an about/credits
  area. Its API terms also distinguish non-commercial from commercial use; confirm which applies.
- No playback provider is authorized or registered yet (Phase 3 built the abstraction and the
  player pages, deliberately without a provider — see Playback above). Every player page shows a
  "playback isn't available yet" state until one is added to `authorizedProvider.ts`.
- Person pages (Phase 4) show cast credits only; crew credits (director, writer, ...) are fetched
  (`combined_credits`) but not yet surfaced in the UI.
- No account-backed persistence yet: watchlist, favorites and recently-viewed are `localStorage`
  only (Phase 3), with no cross-device sync. Supabase is in the stack for this but has not been
  wired up — see [Playback and persistence: scope decisions](#playback-and-persistence-scope-decisions).
- No playback provider is connected, and none will be until a licensed source is identified. A
  generic, unconfigured `PlaybackProvider` implementation exists (Phase 5.1) so that connecting
  one later is an env-var change rather than new code — see the same section.
- "Anime" (Phase 5) is TMDB's Animation genre restricted to Japanese original language, an
  approximation rather than an authoritative classification — see
  [Anime (Phase 5)](#anime-phase-5).
