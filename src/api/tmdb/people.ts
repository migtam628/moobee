import type { PersonDetails } from '@/types/media';
import { tmdbGet } from './client';
import { mapPersonDetails } from './personMappers';
import { tmdbPersonDetailsSchema } from './personSchemas';

export interface PersonOptions {
  signal?: AbortSignal | undefined;
}

const PERSON_APPENDED_SECTIONS = ['combined_credits', 'external_ids'].join(',');

/** `/person/{id}`, with filmography fetched in the same request via `append_to_response`. */
export async function getPersonDetails(
  id: number,
  { signal }: PersonOptions = {},
): Promise<PersonDetails> {
  const raw = await tmdbGet(`/person/${id}`, {
    schema: tmdbPersonDetailsSchema,
    params: { append_to_response: PERSON_APPENDED_SECTIONS },
    signal,
  });
  return mapPersonDetails(raw);
}
