import type { PersonSummary, SearchPage } from '@/types/media';
import { tmdbGet } from './client';
import { mapMovieSummary, mapTvSummary, nonEmpty } from './mappers';
import { tmdbSearchPageSchema } from './searchSchemas';
import type { TmdbSearchPage } from './types';

export interface SearchOptions {
  page?: number;
  signal?: AbortSignal | undefined;
}

type RawPerson = Extract<TmdbSearchPage['results'][number], { media_type: 'person' }>;

function mapPerson(raw: RawPerson): PersonSummary {
  const profilePath = nonEmpty(raw.profile_path);
  const knownForDepartment = nonEmpty(raw.known_for_department);
  const knownFor = raw.known_for
    .map((credit) => nonEmpty(credit.title) ?? nonEmpty(credit.name))
    .filter((title): title is string => title !== undefined)
    .slice(0, 3);

  return {
    id: raw.id,
    name: raw.name,
    knownFor,
    ...(profilePath ? { profilePath } : {}),
    ...(knownForDepartment ? { knownForDepartment } : {}),
  };
}

export function mapSearchPage(raw: TmdbSearchPage): SearchPage {
  const page: SearchPage = {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    media: [],
    people: [],
  };

  for (const result of raw.results) {
    if (result.media_type === 'movie') page.media.push(mapMovieSummary(result));
    else if (result.media_type === 'tv') page.media.push(mapTvSummary(result));
    else page.people.push(mapPerson(result));
  }
  return page;
}

const EMPTY_PAGE: SearchPage = { page: 1, totalPages: 0, totalResults: 0, media: [], people: [] };

/** Searches movies, TV shows and people in one request. A blank query never hits the network. */
export async function searchMulti(
  query: string,
  { page = 1, signal }: SearchOptions = {},
): Promise<SearchPage> {
  const trimmed = query.trim();
  if (!trimmed) return EMPTY_PAGE;

  const raw = await tmdbGet('/search/multi', {
    schema: tmdbSearchPageSchema,
    params: { query: trimmed, page, include_adult: false },
    signal,
  });
  return mapSearchPage(raw);
}
