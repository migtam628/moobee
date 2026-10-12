import { getMediaKey } from '@/lib/media';
import type { MediaItem, PersonDetails } from '@/types/media';
import { mapCommonFields, nonEmpty, parseYear } from './mappers';
import type { TmdbPersonCredit, TmdbPersonDetails } from './types';

/** Raw TMDB -> normalized PersonDetails. Only the pieces the person page shows are kept: a full
 * crew credit list (director, writer, ...) is out of scope for this phase. */

const MAX_FILMOGRAPHY = 30;

function mapPersonCredit(raw: TmdbPersonCredit): MediaItem | undefined {
  const isMovie = raw.media_type === 'movie';
  const label = nonEmpty(isMovie ? raw.title : raw.name);
  // TMDB always fills the matching title/name field, but never trust that blindly: a credit we
  // can't put a name to isn't worth showing.
  if (!label) return undefined;

  const releaseDate = nonEmpty(isMovie ? raw.release_date : raw.first_air_date);
  const originalTitle = nonEmpty(isMovie ? raw.original_title : raw.original_name);
  const year = parseYear(releaseDate);

  return {
    ...mapCommonFields(raw),
    mediaType: raw.media_type,
    title: label,
    ...(originalTitle ? { originalTitle } : {}),
    ...(releaseDate ? { releaseDate } : {}),
    ...(year !== undefined ? { year } : {}),
  };
}

/** Cast credits, deduplicated (the same title can appear twice in TMDB's data, e.g. a TV movie
 * also listed as a special) and ranked by popularity so the roles people know them for lead. */
function mapFilmography(credits: TmdbPersonDetails['combined_credits']): MediaItem[] {
  const seen = new Set<string>();
  const items: MediaItem[] = [];

  for (const raw of credits?.cast ?? []) {
    const item = mapPersonCredit(raw);
    if (!item) continue;
    const key = getMediaKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  return items.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)).slice(0, MAX_FILMOGRAPHY);
}

export function mapPersonDetails(raw: TmdbPersonDetails): PersonDetails {
  const profilePath = nonEmpty(raw.profile_path);
  const biography = nonEmpty(raw.biography);
  const birthday = nonEmpty(raw.birthday);
  const deathday = nonEmpty(raw.deathday);
  const placeOfBirth = nonEmpty(raw.place_of_birth);
  const knownForDepartment = nonEmpty(raw.known_for_department);
  const imdbId = nonEmpty(raw.external_ids?.imdb_id);

  return {
    id: raw.id,
    name: raw.name,
    filmography: mapFilmography(raw.combined_credits),
    ...(profilePath ? { profilePath } : {}),
    ...(biography ? { biography } : {}),
    ...(birthday ? { birthday } : {}),
    ...(deathday ? { deathday } : {}),
    ...(placeOfBirth ? { placeOfBirth } : {}),
    ...(knownForDepartment ? { knownForDepartment } : {}),
    ...(imdbId ? { imdbId } : {}),
  };
}
