import type { MediaItem } from '@/types/media';

/** Raw TMDB wire-format fixtures (snake_case) used to exercise schemas, mappers and the client. */

export function rawMovie(overrides: Record<string, unknown> = {}) {
  return {
    id: 550,
    title: 'Fight Club',
    original_title: 'Fight Club',
    overview: 'An insomniac office worker crosses paths with a soap salesman.',
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdrop_path: '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg',
    release_date: '1999-10-15',
    vote_average: 8.438,
    vote_count: 30000,
    popularity: 61.4,
    genre_ids: [18, 53],
    original_language: 'en',
    adult: false,
    video: false,
    ...overrides,
  };
}

export function rawTv(overrides: Record<string, unknown> = {}) {
  return {
    id: 1396,
    name: 'Breaking Bad',
    original_name: 'Breaking Bad',
    overview: 'A chemistry teacher turns to a life of crime.',
    poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    first_air_date: '2008-01-20',
    vote_average: 8.9,
    vote_count: 13000,
    popularity: 250.1,
    genre_ids: [18, 80],
    original_language: 'en',
    origin_country: ['US'],
    ...overrides,
  };
}

export function rawPage<T>(results: T[], overrides: Record<string, unknown> = {}) {
  return { page: 1, results, total_pages: 5, total_results: results.length * 5, ...overrides };
}

/** A fully-populated normalized item for component tests. */
export function mediaItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 550,
    mediaType: 'movie',
    title: 'Fight Club',
    overview: 'An insomniac office worker crosses paths with a soap salesman.',
    posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdropPath: '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg',
    releaseDate: '1999-10-15',
    year: 1999,
    rating: 8.4,
    voteCount: 30000,
    ...overrides,
  };
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

/** `/movie/{id}?append_to_response=…` wire format, with every appended section populated. */
export function rawMovieDetails(overrides: Record<string, unknown> = {}) {
  const { genre_ids: _genreIds, ...base } = rawMovie();
  return {
    ...base,
    tagline: 'Mischief. Mayhem. Soap.',
    status: 'Released',
    runtime: 139,
    imdb_id: 'tt0137523',
    genres: [
      { id: 18, name: 'Drama' },
      { id: 53, name: 'Thriller' },
    ],
    credits: {
      cast: [
        {
          id: 819,
          name: 'Edward Norton',
          character: 'The Narrator',
          profile_path: '/a.jpg',
          order: 0,
        },
        { id: 287, name: 'Brad Pitt', character: 'Tyler Durden', profile_path: null, order: 1 },
      ],
      crew: [
        { id: 7467, name: 'David Fincher', job: 'Director' },
        { id: 1, name: 'Someone Else', job: 'Editor' },
      ],
    },
    videos: {
      results: [
        {
          id: 'v1',
          key: 'SUXWAEX2jlg',
          site: 'YouTube',
          type: 'Trailer',
          name: 'Official Trailer',
          official: true,
        },
      ],
    },
    'watch/providers': {
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/550/watch?locale=US',
          flatrate: [
            { provider_id: 8, provider_name: 'StreamCo', logo_path: '/s.jpg', display_priority: 1 },
          ],
          rent: [
            { provider_id: 2, provider_name: 'RentIt', logo_path: '/r.jpg', display_priority: 2 },
          ],
        },
      },
    },
    release_dates: {
      results: [
        {
          iso_3166_1: 'US',
          release_dates: [{ certification: 'R', type: 3 }],
        },
      ],
    },
    external_ids: { imdb_id: 'tt0137523' },
    recommendations: rawPage([rawMovie({ id: 680, title: 'Pulp Fiction' })]),
    similar: rawPage([rawMovie({ id: 807, title: 'Se7en' })]),
    ...overrides,
  };
}

/** `/tv/{id}?append_to_response=…` wire format. */
export function rawTvDetails(overrides: Record<string, unknown> = {}) {
  const { genre_ids: _genreIds, ...base } = rawTv();
  return {
    ...base,
    tagline: 'Change the equation.',
    status: 'Ended',
    last_air_date: '2013-09-29',
    in_production: false,
    number_of_seasons: 5,
    number_of_episodes: 62,
    episode_run_time: [45],
    created_by: [{ id: 66633, name: 'Vince Gilligan' }],
    networks: [{ id: 174, name: 'AMC' }],
    genres: [{ id: 18, name: 'Drama' }],
    credits: {
      cast: [
        {
          id: 17419,
          name: 'Bryan Cranston',
          character: 'Walter White',
          profile_path: '/b.jpg',
          order: 0,
        },
      ],
      crew: [],
    },
    videos: { results: [] },
    'watch/providers': { results: {} },
    content_ratings: { results: [{ iso_3166_1: 'US', rating: 'TV-MA' }] },
    external_ids: { imdb_id: 'tt0903747' },
    recommendations: rawPage([rawTv({ id: 60059, name: 'Better Call Saul' })]),
    similar: rawPage([rawTv({ id: 1399, name: 'Game of Thrones' })]),
    ...overrides,
  };
}

/** A single entry of a TV show's `seasons` summary array (part of `/tv/{id}`). */
export function rawSeasonSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: 3572,
    season_number: 1,
    name: 'Season 1',
    overview: 'The first season.',
    poster_path: '/season1.jpg',
    air_date: '2008-01-20',
    episode_count: 7,
    vote_average: 8.1,
    ...overrides,
  };
}

/** A single episode, as returned by `/tv/{id}/season/{season_number}`. */
export function rawEpisode(overrides: Record<string, unknown> = {}) {
  return {
    id: 62085,
    episode_number: 1,
    season_number: 1,
    name: 'Pilot',
    overview: 'Walter White begins his transformation.',
    still_path: '/episode1.jpg',
    air_date: '2008-01-20',
    runtime: 58,
    vote_average: 7.9,
    vote_count: 500,
    ...overrides,
  };
}

/** `/tv/{id}/season/{season_number}` wire format. */
export function rawSeasonDetails(overrides: Record<string, unknown> = {}) {
  return {
    id: 3572,
    season_number: 1,
    name: 'Season 1',
    overview: 'The first season.',
    poster_path: '/season1.jpg',
    air_date: '2008-01-20',
    episodes: [
      rawEpisode(),
      rawEpisode({ id: 62086, episode_number: 2, name: 'Cat’s in the Bag...' }),
    ],
    ...overrides,
  };
}

export function rawSearchPage(results: unknown[], overrides: Record<string, unknown> = {}) {
  return rawPage(results, overrides);
}

/** `/genre/movie/list` and `/genre/tv/list` wire format. */
export function rawGenreList(overrides: Record<string, unknown> = {}) {
  return {
    genres: [
      { id: 28, name: 'Action' },
      { id: 18, name: 'Drama' },
    ],
    ...overrides,
  };
}

/** One entry of `/person/{id}`'s `combined_credits.cast`. */
export function rawPersonCredit(overrides: Record<string, unknown> = {}) {
  return {
    id: 550,
    media_type: 'movie',
    title: 'Fight Club',
    original_title: 'Fight Club',
    character: 'The Narrator',
    overview: 'An insomniac office worker crosses paths with a soap salesman.',
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdrop_path: '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg',
    release_date: '1999-10-15',
    vote_average: 8.4,
    vote_count: 30000,
    popularity: 61.4,
    genre_ids: [18, 53],
    original_language: 'en',
    ...overrides,
  };
}

/** `/person/{id}?append_to_response=combined_credits,external_ids` wire format. */
export function rawPersonDetails(overrides: Record<string, unknown> = {}) {
  return {
    id: 819,
    name: 'Edward Norton',
    biography: 'An American actor and filmmaker.',
    birthday: '1969-08-18',
    deathday: null,
    place_of_birth: 'Boston, Massachusetts, USA',
    profile_path: '/a.jpg',
    known_for_department: 'Acting',
    combined_credits: {
      cast: [
        rawPersonCredit(),
        rawPersonCredit({
          id: 1396,
          media_type: 'tv',
          title: null,
          name: 'Some Show',
          character: 'A Character',
          release_date: null,
          first_air_date: '2010-01-01',
          popularity: 10,
        }),
      ],
    },
    external_ids: { imdb_id: 'tt0151976' },
    ...overrides,
  };
}

export const rawSearchMovie = (overrides: Record<string, unknown> = {}) =>
  rawMovie({ media_type: 'movie', ...overrides });

export const rawSearchTv = (overrides: Record<string, unknown> = {}) =>
  rawTv({ media_type: 'tv', ...overrides });

export const rawSearchPerson = (overrides: Record<string, unknown> = {}) => ({
  media_type: 'person',
  id: 287,
  name: 'Brad Pitt',
  profile_path: '/p.jpg',
  known_for_department: 'Acting',
  known_for: [{ title: 'Fight Club' }, { name: 'Some Show' }],
  ...overrides,
});
