import type {
  CastMember,
  Episode,
  MovieDetails,
  SeasonDetails,
  SeasonSummary,
  TvDetails,
  Video,
  WatchProviders,
} from '@/types/media';
import {
  mapCommonFields,
  mapMoviePage,
  mapTvPage,
  nonEmpty,
  parseYear,
  roundToTenth,
} from './mappers';
import type {
  TmdbMovieDetails,
  TmdbSeasonDetails,
  TmdbSeasonSummary,
  TmdbTvDetails,
} from './types';

/**
 * TMDB details responses -> normalized MovieDetails / TvDetails.
 * Selection rules (which trailer, which certification, which region) live here so the UI stays
 * free of TMDB-specific knowledge.
 */

const MAX_CAST = 12;
const MAX_RELATED = 20;
/** YouTube ids are 11 chars; allow a little slack but never anything that could break out of a URL. */
const SAFE_YOUTUBE_KEY = /^[A-Za-z0-9_-]{6,32}$/;
/** TMDB release type 3 = theatrical. Its certification is the one people recognise. */
const THEATRICAL_RELEASE_TYPE = 3;

type RawVideos = NonNullable<TmdbMovieDetails['videos']>;
type RawCredits = NonNullable<TmdbMovieDetails['credits']>;
type RawProviders = NonNullable<TmdbMovieDetails['watch/providers']>;

/** Best trailer: official trailers, then any trailer, then teasers. YouTube only. */
export function pickTrailer(videos: RawVideos | undefined): Video | undefined {
  const rank = (video: { type: string; official?: boolean | null | undefined }): number => {
    if (video.type === 'Trailer') return video.official ? 0 : 1;
    return video.type === 'Teaser' ? 2 : 99;
  };

  const candidates = (videos?.results ?? [])
    .filter((video) => video.site === 'YouTube' && SAFE_YOUTUBE_KEY.test(video.key))
    .filter((video) => rank(video) < 99)
    .sort((a, b) => rank(a) - rank(b));

  const best = candidates[0];
  if (!best) return undefined;
  return {
    id: best.id,
    key: best.key,
    site: 'YouTube',
    name: nonEmpty(best.name) ?? 'Trailer',
    type: best.type === 'Teaser' ? 'Teaser' : 'Trailer',
    official: best.official ?? false,
  };
}

export function mapCast(credits: RawCredits | undefined): CastMember[] {
  return [...(credits?.cast ?? [])]
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .slice(0, MAX_CAST)
    .map((member) => {
      const character = nonEmpty(member.character);
      const profilePath = nonEmpty(member.profile_path);
      return {
        id: member.id,
        name: member.name,
        ...(character ? { character } : {}),
        ...(profilePath ? { profilePath } : {}),
      };
    });
}

function mapDirectors(credits: RawCredits | undefined): string[] {
  const names = (credits?.crew ?? [])
    .filter((member) => member.job === 'Director')
    .map((member) => member.name);
  return [...new Set(names)];
}

export function mapWatchProviders(
  raw: RawProviders | undefined,
  region: string,
): WatchProviders | undefined {
  const entry = raw?.results[region];
  if (!entry) return undefined;

  const normalize = (list: typeof entry.flatrate) =>
    [...list]
      .sort((a, b) => (a.display_priority ?? Infinity) - (b.display_priority ?? Infinity))
      .map((provider) => {
        const logoPath = nonEmpty(provider.logo_path);
        return {
          id: provider.provider_id,
          name: provider.provider_name,
          ...(logoPath ? { logoPath } : {}),
        };
      });

  // "Free" and "with ads" are both no-cost options; merge without repeating a provider.
  const free = normalize([...entry.free, ...entry.ads]);
  const uniqueFree = free.filter(
    (p, index) => free.findIndex((other) => other.id === p.id) === index,
  );

  const providers: WatchProviders = {
    region,
    subscription: normalize(entry.flatrate),
    free: uniqueFree,
    rent: normalize(entry.rent),
    buy: normalize(entry.buy),
  };
  const link = nonEmpty(entry.link);
  if (link) providers.link = link;

  const hasAny =
    providers.subscription.length +
      providers.free.length +
      providers.rent.length +
      providers.buy.length >
    0;
  return hasAny ? providers : undefined;
}

/** Movie certification for a region, preferring the theatrical release. */
export function pickMovieCertification(
  releaseDates: TmdbMovieDetails['release_dates'],
  region: string,
): string | undefined {
  const country = releaseDates?.results.find((entry) => entry.iso_3166_1 === region);
  const withRating = (country?.release_dates ?? []).filter((release) =>
    nonEmpty(release.certification),
  );
  const preferred =
    withRating.find((release) => release.type === THEATRICAL_RELEASE_TYPE) ?? withRating[0];
  return nonEmpty(preferred?.certification);
}

export function pickTvCertification(
  contentRatings: TmdbTvDetails['content_ratings'],
  region: string,
): string | undefined {
  const entry = contentRatings?.results.find(
    (rating) => rating.iso_3166_1 === region && nonEmpty(rating.rating),
  );
  return nonEmpty(entry?.rating);
}

const ENDED_STATUSES = new Set(['Ended', 'Canceled']);

interface DetailOptions {
  region: string;
}

export function mapMovieDetails(raw: TmdbMovieDetails, { region }: DetailOptions): MovieDetails {
  const releaseDate = nonEmpty(raw.release_date);
  const originalTitle = nonEmpty(raw.original_title);
  const year = parseYear(releaseDate);
  const imdbId = nonEmpty(raw.imdb_id) ?? nonEmpty(raw.external_ids?.imdb_id);
  const tagline = nonEmpty(raw.tagline);
  const status = nonEmpty(raw.status);
  const certification = pickMovieCertification(raw.release_dates, region);
  const trailer = pickTrailer(raw.videos);
  const providers = mapWatchProviders(raw['watch/providers'], region);
  const directors = mapDirectors(raw.credits);

  return {
    ...mapCommonFields({ ...raw, genre_ids: undefined }),
    mediaType: 'movie',
    title: raw.title,
    genres: raw.genres,
    cast: mapCast(raw.credits),
    directors,
    recommendations: raw.recommendations
      ? mapMoviePage(raw.recommendations).items.slice(0, MAX_RELATED)
      : [],
    similar: raw.similar ? mapMoviePage(raw.similar).items.slice(0, MAX_RELATED) : [],
    ...(originalTitle ? { originalTitle } : {}),
    ...(releaseDate ? { releaseDate } : {}),
    ...(year !== undefined ? { year } : {}),
    ...(imdbId ? { imdbId } : {}),
    ...(tagline ? { tagline } : {}),
    ...(status ? { status } : {}),
    ...(certification ? { certification } : {}),
    ...(trailer ? { trailer } : {}),
    ...(providers ? { providers } : {}),
    ...(typeof raw.runtime === 'number' && raw.runtime > 0 ? { runtimeMinutes: raw.runtime } : {}),
  };
}

export function mapTvDetails(raw: TmdbTvDetails, { region }: DetailOptions): TvDetails {
  const releaseDate = nonEmpty(raw.first_air_date);
  const originalTitle = nonEmpty(raw.original_name);
  const year = parseYear(releaseDate);
  const status = nonEmpty(raw.status);
  const endYear = status && ENDED_STATUSES.has(status) ? parseYear(raw.last_air_date) : undefined;
  const imdbId = nonEmpty(raw.external_ids?.imdb_id);
  const tagline = nonEmpty(raw.tagline);
  const certification = pickTvCertification(raw.content_ratings, region);
  const trailer = pickTrailer(raw.videos);
  const providers = mapWatchProviders(raw['watch/providers'], region);
  const runtime = raw.episode_run_time.find((minutes) => minutes > 0);

  return {
    ...mapCommonFields({ ...raw, genre_ids: undefined }),
    mediaType: 'tv',
    title: raw.name,
    genres: raw.genres,
    cast: mapCast(raw.credits),
    creators: raw.created_by.map((person) => person.name),
    networks: raw.networks.map((network) => network.name),
    seasons: mapSeasonSummaries(raw.seasons),
    recommendations: raw.recommendations
      ? mapTvPage(raw.recommendations).items.slice(0, MAX_RELATED)
      : [],
    similar: raw.similar ? mapTvPage(raw.similar).items.slice(0, MAX_RELATED) : [],
    ...(originalTitle ? { originalTitle } : {}),
    ...(releaseDate ? { releaseDate } : {}),
    ...(year !== undefined ? { year } : {}),
    ...(endYear !== undefined && endYear !== year ? { endYear } : {}),
    ...(typeof raw.in_production === 'boolean' ? { inProduction: raw.in_production } : {}),
    ...(imdbId ? { imdbId } : {}),
    ...(tagline ? { tagline } : {}),
    ...(status ? { status } : {}),
    ...(certification ? { certification } : {}),
    ...(trailer ? { trailer } : {}),
    ...(providers ? { providers } : {}),
    ...(typeof raw.number_of_seasons === 'number'
      ? { numberOfSeasons: raw.number_of_seasons }
      : {}),
    ...(typeof raw.number_of_episodes === 'number'
      ? { numberOfEpisodes: raw.number_of_episodes }
      : {}),
    ...(runtime !== undefined ? { episodeRuntimeMinutes: runtime } : {}),
  };
}

/** Ordered by season number, ascending; TMDB usually returns them sorted but never guarantees it. */
export function mapSeasonSummaries(raw: readonly TmdbSeasonSummary[]): SeasonSummary[] {
  return [...raw]
    .sort((a, b) => a.season_number - b.season_number)
    .map((season) => {
      const overview = nonEmpty(season.overview);
      const posterPath = nonEmpty(season.poster_path);
      const airDate = nonEmpty(season.air_date);
      const year = parseYear(airDate);
      const rating =
        typeof season.vote_average === 'number' && season.vote_average > 0
          ? roundToTenth(season.vote_average)
          : undefined;

      return {
        id: season.id,
        seasonNumber: season.season_number,
        name: season.name,
        ...(overview ? { overview } : {}),
        ...(posterPath ? { posterPath } : {}),
        ...(airDate ? { airDate } : {}),
        ...(year !== undefined ? { year } : {}),
        ...(typeof season.episode_count === 'number' ? { episodeCount: season.episode_count } : {}),
        ...(rating !== undefined ? { rating } : {}),
      };
    });
}

function mapEpisode(raw: TmdbSeasonDetails['episodes'][number]): Episode {
  const overview = nonEmpty(raw.overview);
  const stillPath = nonEmpty(raw.still_path);
  const airDate = nonEmpty(raw.air_date);
  const voteCount = raw.vote_count ?? 0;
  const rating =
    voteCount > 0 && typeof raw.vote_average === 'number'
      ? roundToTenth(raw.vote_average)
      : undefined;

  return {
    id: raw.id,
    episodeNumber: raw.episode_number,
    seasonNumber: raw.season_number,
    name: raw.name,
    ...(overview ? { overview } : {}),
    ...(stillPath ? { stillPath } : {}),
    ...(airDate ? { airDate } : {}),
    ...(typeof raw.runtime === 'number' && raw.runtime > 0 ? { runtimeMinutes: raw.runtime } : {}),
    ...(rating !== undefined ? { rating } : {}),
    ...(voteCount > 0 ? { voteCount } : {}),
  };
}

export function mapSeasonDetails(raw: TmdbSeasonDetails): SeasonDetails {
  const overview = nonEmpty(raw.overview);
  const posterPath = nonEmpty(raw.poster_path);
  const airDate = nonEmpty(raw.air_date);
  const year = parseYear(airDate);

  return {
    id: raw.id,
    seasonNumber: raw.season_number,
    name: raw.name,
    ...(overview ? { overview } : {}),
    ...(posterPath ? { posterPath } : {}),
    ...(airDate ? { airDate } : {}),
    ...(year !== undefined ? { year } : {}),
    episodes: [...raw.episodes].sort((a, b) => a.episode_number - b.episode_number).map(mapEpisode),
  };
}
