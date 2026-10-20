import { getMediaKey, uniqueMedia } from '@/lib/media';
import type { MediaItem, MediaType } from '@/types/media';
import type { PickKind } from '@/types/settings';

/**
 * The logic behind "Surprise me", kept free of React and the network so it can be tested on its
 * own: which TMDB lists to draw a pool from for a kind and mood, and how picks are dealt from it.
 */

export type MoodId =
  'laugh' | 'thrill' | 'scare' | 'cozy' | 'mind' | 'action' | 'family' | 'moving';

export interface Mood {
  id: MoodId;
  label: string;
  /** TMDB genre ids per type. They are alternatives: a title needs only one of them. */
  genres: Record<MediaType, readonly number[]>;
}

/**
 * TV genres differ from movie genres (no Horror, "Action & Adventure", "Sci-Fi & Fantasy"), so each
 * mood lists what it means for each.
 */
export const MOODS: readonly Mood[] = [
  { id: 'laugh', label: 'Make me laugh', genres: { movie: [35], tv: [35] } },
  { id: 'thrill', label: 'Edge of my seat', genres: { movie: [53, 80, 9648], tv: [9648, 80] } },
  { id: 'scare', label: 'Scare me', genres: { movie: [27], tv: [9648, 10765] } },
  {
    id: 'cozy',
    label: 'Cozy and feel-good',
    genres: { movie: [35, 10749, 10751], tv: [35, 10751] },
  },
  { id: 'mind', label: 'Mind-bending', genres: { movie: [878, 9648, 53], tv: [10765, 9648] } },
  { id: 'action', label: 'Action', genres: { movie: [28, 12], tv: [10759] } },
  { id: 'family', label: 'Family night', genres: { movie: [10751, 16], tv: [10751, 10762] } },
  { id: 'moving', label: 'Something moving', genres: { movie: [18, 10749], tv: [18] } },
];

export const getMood = (id: MoodId | undefined): Mood | undefined =>
  MOODS.find((mood) => mood.id === id);

/** One TMDB list to draw from. */
export interface PoolRequest {
  mediaType: MediaType;
  anime: boolean;
  /** TMDB `with_genres` value: ids joined by `|` (any of) or `,` (all of). */
  genres?: string;
  page: number;
}

/** TMDB pages of well-liked titles to draw from. Wider means more variety, narrower more quality. */
export const POOL_PAGE_SPAN = 6;

/** Random integer in [1, max]. */
const randomPage = (rng: () => number, max: number): number => 1 + Math.floor(rng() * max);

/**
 * Which lists to ask TMDB for. "Any" asks for movies and series together; anime asks for anime
 * films and series (genre Animation from Japan, see `discover.ts`); a mood narrows the genres,
 * and for anime it can only narrow to one genre since TMDB cannot mix "all of" and "any of".
 */
export function buildPoolPlan(
  kind: PickKind,
  moodId: MoodId | undefined,
  rng: () => number = Math.random,
): PoolRequest[] {
  const mood = getMood(moodId);
  const types: MediaType[] =
    kind === 'movie' ? ['movie'] : kind === 'tv' ? ['tv'] : ['movie', 'tv'];
  const anime = kind === 'anime';

  return types.map((mediaType) => {
    const ids = mood?.genres[mediaType] ?? [];
    const first = ids[0];
    const genres = anime
      ? first === undefined
        ? undefined
        : String(first)
      : ids.length > 0
        ? ids.join('|')
        : undefined;
    return {
      mediaType,
      anime,
      page: randomPage(rng, POOL_PAGE_SPAN),
      ...(genres ? { genres } : {}),
    };
  });
}

/** Fisher-Yates, on a copy. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

/** Items from `pool` that are not in `exclude` (by type and id), once each, in a random order. */
export function preparePool(
  pool: readonly MediaItem[],
  exclude: ReadonlySet<string>,
  rng: () => number = Math.random,
): MediaItem[] {
  return shuffle(
    uniqueMedia(pool).filter((item) => !exclude.has(getMediaKey(item))),
    rng,
  );
}

/**
 * When a pool mixes movies and series, takes turns between them so a hand of three is not three
 * of the same by bad luck. Order inside each type is kept.
 */
export function interleaveTypes<T extends { item: MediaItem }>(entries: readonly T[]): T[] {
  const movies = entries.filter((entry) => entry.item.mediaType === 'movie');
  const shows = entries.filter((entry) => entry.item.mediaType === 'tv');
  const out: T[] = [];
  for (let i = 0; i < Math.max(movies.length, shows.length); i += 1) {
    const movie = movies[i];
    const show = shows[i];
    if (movie) out.push(movie);
    if (show) out.push(show);
  }
  return out;
}

/** Titles worth telling the AI about the viewer's taste: saved first, newest first, no repeats. */
export function tasteTitles(lists: readonly (readonly MediaItem[])[], limit = 25): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const item of lists.flat()) {
    const key = item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(item.year ? `${item.title} (${item.year})` : item.title);
    if (titles.length === limit) break;
  }
  return titles;
}

const normalizeTitle = (title: string): string =>
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[^a-z0-9]+/g, '');

/**
 * Picks the search result that is the title the AI meant, or undefined. The AI only gives a name
 * and a year, so a result must have the same name (ignoring case, accents, punctuation and a
 * leading "The") and, when a year is known, be within a year of it.
 */
export function matchSuggestion(
  results: readonly MediaItem[],
  suggestion: { title: string; year?: number | undefined },
): MediaItem | undefined {
  const wanted = normalizeTitle(suggestion.title);
  if (!wanted) return undefined;
  return results.find((item) => {
    const names = [item.title, item.originalTitle].filter((name): name is string => Boolean(name));
    if (!names.some((name) => normalizeTitle(name) === wanted)) return false;
    if (suggestion.year === undefined || item.year === undefined) return true;
    return Math.abs(item.year - suggestion.year) <= 1;
  });
}
