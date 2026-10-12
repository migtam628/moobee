import { describe, expect, it } from 'vitest';
import { rawEpisode, rawMovieDetails, rawSeasonDetails, rawTvDetails } from '@/test/fixtures';
import {
  mapCast,
  mapMovieDetails,
  mapSeasonDetails,
  mapSeasonSummaries,
  mapTvDetails,
  mapWatchProviders,
  pickMovieCertification,
  pickTrailer,
} from './detailMappers';
import { tmdbMovieDetailsSchema, tmdbTvDetailsSchema } from './detailSchemas';
import { tmdbSeasonDetailsSchema } from './seasonSchemas';

const parseMovie = (overrides: Record<string, unknown> = {}) =>
  tmdbMovieDetailsSchema.parse(rawMovieDetails(overrides));
const parseTv = (overrides: Record<string, unknown> = {}) =>
  tmdbTvDetailsSchema.parse(rawTvDetails(overrides));

describe('mapMovieDetails', () => {
  it('maps a fully populated response', () => {
    const details = mapMovieDetails(parseMovie(), { region: 'US' });

    expect(details).toMatchObject({
      id: 550,
      mediaType: 'movie',
      title: 'Fight Club',
      year: 1999,
      runtimeMinutes: 139,
      tagline: 'Mischief. Mayhem. Soap.',
      status: 'Released',
      certification: 'R',
      imdbId: 'tt0137523',
      directors: ['David Fincher'],
    });
    expect(details.genres.map((genre) => genre.name)).toEqual(['Drama', 'Thriller']);
    expect(details.trailer).toMatchObject({ key: 'SUXWAEX2jlg', type: 'Trailer', official: true });
    expect(details.recommendations[0]).toMatchObject({ id: 680, mediaType: 'movie' });
    expect(details.similar[0]).toMatchObject({ id: 807, mediaType: 'movie' });
  });

  it('keeps the TMDB id and the IMDb id separate', () => {
    const details = mapMovieDetails(parseMovie(), { region: 'US' });
    expect(details.id).toBe(550);
    expect(details.imdbId).toBe('tt0137523');
    expect(String(details.id)).not.toBe(details.imdbId);
  });

  it('falls back to external_ids for the IMDb id', () => {
    const details = mapMovieDetails(
      parseMovie({ imdb_id: null, external_ids: { imdb_id: 'tt9999999' } }),
      { region: 'US' },
    );
    expect(details.imdbId).toBe('tt9999999');
  });

  it('omits optional fields instead of emitting empty values', () => {
    const details = mapMovieDetails(
      parseMovie({ tagline: '', runtime: 0, imdb_id: null, external_ids: undefined }),
      { region: 'US' },
    );
    expect(details).not.toHaveProperty('tagline');
    expect(details).not.toHaveProperty('runtimeMinutes');
    expect(details).not.toHaveProperty('imdbId');
  });

  it('survives malformed appended sections, losing only those sections', () => {
    const raw = parseMovie({
      credits: 'nonsense',
      videos: { results: 42 },
      'watch/providers': null,
      recommendations: { page: 'x' },
    });
    const details = mapMovieDetails(raw, { region: 'US' });

    expect(details.title).toBe('Fight Club');
    expect(details.cast).toEqual([]);
    expect(details.directors).toEqual([]);
    expect(details.trailer).toBeUndefined();
    expect(details.providers).toBeUndefined();
    expect(details.recommendations).toEqual([]);
    expect(details.similar).toHaveLength(1);
  });

  it('rejects a response without a title', () => {
    expect(() => tmdbMovieDetailsSchema.parse(rawMovieDetails({ title: '' }))).toThrow();
  });

  it('deduplicates directors', () => {
    const raw = parseMovie({
      credits: {
        cast: [],
        crew: [
          { id: 1, name: 'A Director', job: 'Director' },
          { id: 1, name: 'A Director', job: 'Director' },
        ],
      },
    });
    expect(mapMovieDetails(raw, { region: 'US' }).directors).toEqual(['A Director']);
  });
});

describe('mapTvDetails', () => {
  it('maps a fully populated response', () => {
    const details = mapTvDetails(parseTv(), { region: 'US' });

    expect(details).toMatchObject({
      id: 1396,
      mediaType: 'tv',
      title: 'Breaking Bad',
      year: 2008,
      endYear: 2013,
      status: 'Ended',
      certification: 'TV-MA',
      numberOfSeasons: 5,
      numberOfEpisodes: 62,
      episodeRuntimeMinutes: 45,
      creators: ['Vince Gilligan'],
      networks: ['AMC'],
      imdbId: 'tt0903747',
    });
    expect(details.recommendations[0]).toMatchObject({ id: 60059, mediaType: 'tv' });
  });

  it('sets no end year while a show is still airing', () => {
    const details = mapTvDetails(
      parseTv({ status: 'Returning Series', in_production: true, last_air_date: '2024-05-01' }),
      { region: 'US' },
    );
    expect(details).not.toHaveProperty('endYear');
    expect(details.inProduction).toBe(true);
  });

  it('is missing `seasons` when TMDB omits it, rather than throwing', () => {
    const details = mapTvDetails(parseTv({ seasons: undefined }), { region: 'US' });
    expect(details.seasons).toEqual([]);
  });
});

describe('mapSeasonSummaries', () => {
  it('sorts by season number and maps every field', () => {
    const raw = [
      {
        id: 2,
        season_number: 2,
        name: 'Season 2',
        overview: 'The second season.',
        poster_path: '/s2.jpg',
        air_date: '2009-03-08',
        episode_count: 13,
        vote_average: 8.4,
      },
      {
        id: 1,
        season_number: 1,
        name: 'Season 1',
        overview: 'The first season.',
        poster_path: '/s1.jpg',
        air_date: '2008-01-20',
        episode_count: 7,
        vote_average: 8.1,
      },
    ];
    const seasons = mapSeasonSummaries(raw);

    expect(seasons.map((s) => s.seasonNumber)).toEqual([1, 2]);
    expect(seasons[0]).toEqual({
      id: 1,
      seasonNumber: 1,
      name: 'Season 1',
      overview: 'The first season.',
      posterPath: '/s1.jpg',
      airDate: '2008-01-20',
      year: 2008,
      episodeCount: 7,
      rating: 8.1,
    });
  });

  it('keeps season 0 ("Specials"), and omits optional fields instead of using empty values', () => {
    const seasons = mapSeasonSummaries([
      {
        id: 0,
        season_number: 0,
        name: 'Specials',
        overview: '',
        poster_path: null,
        air_date: null,
        episode_count: 0,
        vote_average: 0,
      },
    ]);
    expect(seasons).toEqual([{ id: 0, seasonNumber: 0, name: 'Specials', episodeCount: 0 }]);
  });
});

describe('mapSeasonDetails', () => {
  const parseSeason = (overrides: Record<string, unknown> = {}) =>
    tmdbSeasonDetailsSchema.parse(rawSeasonDetails(overrides));

  it('maps season fields and sorts episodes by episode number', () => {
    const season = mapSeasonDetails(
      parseSeason({
        episodes: [
          rawEpisode({ id: 2, episode_number: 2, name: 'Second' }),
          rawEpisode({ id: 1, episode_number: 1, name: 'First' }),
        ],
      }),
    );

    expect(season).toMatchObject({
      id: 3572,
      seasonNumber: 1,
      name: 'Season 1',
      overview: 'The first season.',
      posterPath: '/season1.jpg',
      airDate: '2008-01-20',
      year: 2008,
    });
    expect(season.episodes.map((e) => e.episodeNumber)).toEqual([1, 2]);
  });

  it('maps an episode, omitting a zero runtime and an unrated vote count', () => {
    const season = mapSeasonDetails(
      parseSeason({ episodes: [rawEpisode({ runtime: 0, vote_average: 0, vote_count: 0 })] }),
    );
    const episode = season.episodes[0];

    expect(episode).not.toHaveProperty('runtimeMinutes');
    expect(episode).not.toHaveProperty('rating');
    expect(episode).not.toHaveProperty('voteCount');
  });

  it('drops a malformed episode instead of failing the whole season', () => {
    const season = mapSeasonDetails(
      parseSeason({ episodes: [rawEpisode(), rawEpisode({ id: 3, name: '' })] }),
    );
    expect(season.episodes).toHaveLength(1);
  });
});

describe('pickTrailer', () => {
  const video = (overrides: Record<string, unknown>) => ({
    id: 'id',
    key: 'abcdefghijk',
    site: 'YouTube',
    type: 'Trailer',
    name: 'A video',
    official: false,
    ...overrides,
  });
  const pick = (results: Record<string, unknown>[]) =>
    pickTrailer(tmdbMovieDetailsSchema.parse(rawMovieDetails({ videos: { results } })).videos);

  it('prefers official trailers over unofficial ones, and trailers over teasers', () => {
    const picked = pick([
      video({ id: 'teaser', type: 'Teaser', official: true }),
      video({ id: 'fan', official: false }),
      video({ id: 'official', official: true }),
    ]);
    expect(picked?.id).toBe('official');
  });

  it('falls back to a teaser when there is no trailer', () => {
    expect(pick([video({ id: 't', type: 'Teaser' })])?.type).toBe('Teaser');
  });

  it('ignores non-YouTube videos and other video types', () => {
    expect(
      pick([video({ site: 'Vimeo' }), video({ type: 'Featurette' }), video({ type: 'Clip' })]),
    ).toBeUndefined();
  });

  it('never accepts a key that could break out of an embed URL', () => {
    expect(pick([video({ key: 'abc/../../evil' }), video({ key: 'x?y=1&z' })])).toBeUndefined();
  });
});

describe('mapCast', () => {
  it('orders by billing and caps the list', () => {
    const cast = Array.from({ length: 30 }, (_, index) => ({
      id: index + 1,
      name: `Actor ${index + 1}`,
      character: `Role ${index + 1}`,
      profile_path: null,
      order: 29 - index,
    }));
    const raw = tmdbMovieDetailsSchema.parse(rawMovieDetails({ credits: { cast, crew: [] } }));
    const mapped = mapCast(raw.credits);

    expect(mapped).toHaveLength(12);
    expect(mapped[0]?.name).toBe('Actor 30');
  });

  it('leaves out absent character and photo rather than using empty strings', () => {
    const raw = tmdbMovieDetailsSchema.parse(
      rawMovieDetails({
        credits: { cast: [{ id: 1, name: 'Extra', character: '', profile_path: null }], crew: [] },
      }),
    );
    expect(mapCast(raw.credits)[0]).toEqual({ id: 1, name: 'Extra' });
  });
});

describe('mapWatchProviders', () => {
  const providers = (results: Record<string, unknown>) =>
    tmdbMovieDetailsSchema.parse(rawMovieDetails({ 'watch/providers': { results } }))[
      'watch/providers'
    ];
  const p = (id: number, priority: number) => ({
    provider_id: id,
    provider_name: `P${id}`,
    logo_path: `/${id}.jpg`,
    display_priority: priority,
  });

  it('returns the configured region only', () => {
    const raw = providers({ US: { flatrate: [p(1, 1)] }, GB: { flatrate: [p(2, 1)] } });
    expect(mapWatchProviders(raw, 'GB')?.subscription.map((x) => x.id)).toEqual([2]);
    expect(mapWatchProviders(raw, 'FR')).toBeUndefined();
  });

  it('is undefined when the region exists but lists nobody', () => {
    expect(mapWatchProviders(providers({ US: { link: 'https://x.test' } }), 'US')).toBeUndefined();
  });

  it('orders by display priority and merges free with ad-supported without duplicates', () => {
    const raw = providers({
      US: { flatrate: [p(3, 9), p(1, 1), p(2, 5)], free: [p(7, 1)], ads: [p(7, 1), p(8, 2)] },
    });
    const result = mapWatchProviders(raw, 'US');
    expect(result?.subscription.map((x) => x.id)).toEqual([1, 2, 3]);
    expect(result?.free.map((x) => x.id)).toEqual([7, 8]);
  });
});

describe('certifications', () => {
  it('prefers the theatrical release and skips blank certifications', () => {
    const raw = tmdbMovieDetailsSchema.parse(
      rawMovieDetails({
        release_dates: {
          results: [
            {
              iso_3166_1: 'US',
              release_dates: [
                { certification: '', type: 3 },
                { certification: 'PG', type: 4 },
                { certification: 'R', type: 3 },
              ],
            },
          ],
        },
      }),
    );
    expect(pickMovieCertification(raw.release_dates, 'US')).toBe('R');
    expect(pickMovieCertification(raw.release_dates, 'DE')).toBeUndefined();
  });
});
