import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, rawPersonCredit, rawPersonDetails } from '@/test/fixtures';
import { getPersonDetails } from './index';
import { mapPersonDetails } from './personMappers';
import { tmdbPersonDetailsSchema } from './personSchemas';

function stubFetch(body: unknown) {
  const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(body)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const requestedUrl = (fetchMock: ReturnType<typeof stubFetch>) =>
  new URL(String((fetchMock.mock.calls[0] as unknown[] | undefined)?.[0]), 'http://localhost');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPersonDetails', () => {
  it('fetches a person with credits and external ids in one request', async () => {
    const fetchMock = stubFetch(rawPersonDetails());
    const person = await getPersonDetails(819);

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe('/api/tmdb/person/819');
    const appended = url.searchParams.get('append_to_response')?.split(',');
    expect(appended).toEqual(expect.arrayContaining(['combined_credits', 'external_ids']));

    expect(person).toMatchObject({
      id: 819,
      name: 'Edward Norton',
      knownForDepartment: 'Acting',
      imdbId: 'tt0151976',
    });
    expect(person.filmography).toHaveLength(2);
  });

  it('omits a deathday and biography when TMDB has none on file', async () => {
    stubFetch(rawPersonDetails({ deathday: null, biography: '' }));
    const person = await getPersonDetails(819);
    expect(person.deathday).toBeUndefined();
    expect(person.biography).toBeUndefined();
  });
});

describe('mapPersonDetails', () => {
  it('deduplicates repeated credits and ranks by popularity', () => {
    const raw = tmdbPersonDetailsSchema.parse(
      rawPersonDetails({
        combined_credits: {
          cast: [
            rawPersonCredit({ id: 1, popularity: 10 }),
            rawPersonCredit({ id: 1, popularity: 10, character: 'Duplicate billing' }),
            rawPersonCredit({ id: 2, title: 'More Popular Movie', popularity: 99 }),
          ],
        },
      }),
    );

    const person = mapPersonDetails(raw);
    expect(person.filmography).toHaveLength(2);
    expect(person.filmography[0]?.title).toBe('More Popular Movie');
  });

  it('drops a credit whose title/name field is empty rather than showing a blank card', () => {
    const raw = tmdbPersonDetailsSchema.parse(
      rawPersonDetails({
        combined_credits: { cast: [rawPersonCredit({ title: null, name: null })] },
      }),
    );
    expect(mapPersonDetails(raw).filmography).toEqual([]);
  });
});
