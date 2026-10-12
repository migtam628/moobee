/**
 * Normalized, provider-agnostic application models.
 *
 * React components, hooks and (later) playback providers depend on these types only, so the
 * metadata source (TMDB today) can be swapped by rewriting the mappers in `src/api`.
 *
 * IDs are NOT interchangeable: a movie `id` and a TV `id` are different TMDB namespaces, and
 * `imdbId` is a third, unrelated identifier. Always pair `id` with `mediaType`.
 */

export type MediaType = 'movie' | 'tv';

export interface Genre {
  id: number;
  name: string;
}

export interface MediaItem {
  /** TMDB id, scoped by `mediaType`. Never treat a movie id as a TV id. */
  id: number;
  mediaType: MediaType;
  /** IMDb id (e.g. `tt0111161`). Only known after a details/external-ids lookup. */
  imdbId?: string;
  title: string;
  originalTitle?: string;
  overview: string;
  /** Image path relative to the image CDN (e.g. `/abc123.jpg`). Resolve with the image helpers. */
  posterPath?: string;
  backdropPath?: string;
  /** ISO date (`YYYY-MM-DD`): release date for movies, first air date for TV. */
  releaseDate?: string;
  year?: number;
  /** 0-10 average user rating, one decimal. Undefined when nobody has voted yet. */
  rating?: number;
  voteCount?: number;
  popularity?: number;
  /** Full genres, available from details endpoints. */
  genres?: Genre[];
  /** Genre ids, available on list endpoints. */
  genreIds?: number[];
  originalLanguage?: string;
}

/** A page of normalized results plus pagination metadata. */
export interface MediaPage {
  page: number;
  totalPages: number;
  totalResults: number;
  items: MediaItem[];
}

/** A person in a title's cast. */
export interface CastMember {
  id: number;
  name: string;
  /** Character played. Absent for some documentary/voice credits. */
  character?: string;
  profilePath?: string;
}

/** A trailer or teaser. Only YouTube videos with a well-formed key are kept. */
export interface Video {
  id: string;
  /** YouTube video key. Validated; build embed URLs with `getYouTubeEmbedUrl`. */
  key: string;
  site: 'YouTube';
  name: string;
  type: 'Trailer' | 'Teaser';
  official: boolean;
}

export interface WatchProvider {
  id: number;
  name: string;
  logoPath?: string;
}

/** Where a title can be watched in one region. Empty lists mean "not available that way". */
export interface WatchProviders {
  /** ISO 3166-1 country code these results are for. */
  region: string;
  /** Deep link to the full availability page (provided by JustWatch via TMDB). */
  link?: string;
  subscription: WatchProvider[];
  /** Free and ad-supported. */
  free: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

interface MediaDetailsBase extends MediaItem {
  genres: Genre[];
  tagline?: string;
  /** Production/airing status, e.g. "Released", "Returning Series", "Ended". */
  status?: string;
  /** Age rating for the configured region, e.g. "PG-13" or "TV-MA". */
  certification?: string;
  cast: CastMember[];
  trailer?: Video;
  providers?: WatchProviders;
  recommendations: MediaItem[];
  similar: MediaItem[];
}

export interface MovieDetails extends MediaDetailsBase {
  mediaType: 'movie';
  runtimeMinutes?: number;
  directors: string[];
}

export interface TvDetails extends MediaDetailsBase {
  mediaType: 'tv';
  /** Last air year. Only set once the show has ended. */
  endYear?: number;
  inProduction?: boolean;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  episodeRuntimeMinutes?: number;
  creators: string[];
  networks: string[];
  /** Ordered by season number, ascending (includes season 0 / "Specials" when TMDB lists one). */
  seasons: SeasonSummary[];
}

/** One season of a show, as listed on its details page (no episode list yet). */
export interface SeasonSummary {
  id: number;
  seasonNumber: number;
  name: string;
  overview?: string;
  posterPath?: string;
  airDate?: string;
  year?: number;
  episodeCount?: number;
  /** 0-10 average user rating. Undefined when unrated. */
  rating?: number;
}

/** One episode of a season. */
export interface Episode {
  id: number;
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview?: string;
  /** Episode thumbnail path. Resolve with `getStillUrl`. */
  stillPath?: string;
  airDate?: string;
  runtimeMinutes?: number;
  rating?: number;
  voteCount?: number;
}

/** `/tv/{id}/season/{season_number}`: a season's episode list. */
export interface SeasonDetails extends SeasonSummary {
  episodes: Episode[];
}

/** Discriminated on `mediaType`, so `details.mediaType === 'tv'` narrows to TV-only fields. */
export type MediaDetails = MovieDetails | TvDetails;

export interface PersonSummary {
  id: number;
  name: string;
  profilePath?: string;
  knownForDepartment?: string;
  /** Titles this person is best known for. */
  knownFor: string[];
}

/** One page of `/search/multi`, already split by kind. */
export interface SearchPage {
  page: number;
  totalPages: number;
  totalResults: number;
  media: MediaItem[];
  people: PersonSummary[];
}

/** Full profile for `/person/:id`. */
export interface PersonDetails {
  id: number;
  name: string;
  profilePath?: string;
  biography?: string;
  /** ISO date. */
  birthday?: string;
  /** ISO date. Present only if the person has died. */
  deathday?: string;
  placeOfBirth?: string;
  knownForDepartment?: string;
  imdbId?: string;
  /** Cast credits, deduplicated and ranked by popularity (most notable roles first). */
  filmography: MediaItem[];
}
