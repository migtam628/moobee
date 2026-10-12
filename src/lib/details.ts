import type { MediaDetails } from '@/types/media';
import { formatRuntime, formatYearRange, pluralize } from './format';

/** Ordered, human-readable meta line under the title (year, runtime / seasons, ...). */
export function getMetaItems(details: MediaDetails): string[] {
  const items: (string | undefined)[] = [];

  if (details.mediaType === 'movie') {
    items.push(details.year === undefined ? undefined : String(details.year));
    items.push(formatRuntime(details.runtimeMinutes));
  } else {
    items.push(formatYearRange(details.year, details.endYear, details.inProduction));
    items.push(
      details.numberOfSeasons === undefined
        ? undefined
        : pluralize(details.numberOfSeasons, 'season'),
    );
    items.push(
      details.numberOfEpisodes === undefined
        ? undefined
        : pluralize(details.numberOfEpisodes, 'episode'),
    );
  }

  return items.filter((item): item is string => item !== undefined);
}

export interface DetailFact {
  label: string;
  value: string;
}

/** Label/value pairs for the facts list. Entries with no data are omitted. */
export function getFacts(details: MediaDetails): DetailFact[] {
  const facts: DetailFact[] = [];
  const add = (label: string, value: string | undefined) => {
    if (value) facts.push({ label, value });
  };

  if (details.mediaType === 'movie') {
    add(details.directors.length === 1 ? 'Director' : 'Directors', details.directors.join(', '));
  } else {
    add(details.creators.length === 1 ? 'Creator' : 'Creators', details.creators.join(', '));
    add(details.networks.length === 1 ? 'Network' : 'Networks', details.networks.join(', '));
  }
  add('Status', details.status);
  return facts;
}
