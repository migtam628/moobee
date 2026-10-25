import { isAbortError, searchTitle } from '@/api/tmdb';
import { getMediaKey } from '@/lib/media';
import { matchSuggestion } from '@/lib/surprise';
import type { MediaItem } from '@/types/media';
import type { AiSuggestion } from './client';

/** A title the AI suggested, found in TMDB, and why the AI chose it. */
export interface ResolvedSuggestion {
  item: MediaItem;
  reason: string;
}

/**
 * Checks AI suggestions against TMDB, in parallel, and keeps only the ones that exist (the AI can
 * name a film that was never made). Order is kept, a title appears once, and anything in
 * `exclude` (media keys) is left out. A lookup that fails drops that one suggestion; an abort
 * stops the whole call.
 */
export async function resolveSuggestions(
  suggestions: readonly AiSuggestion[],
  signal: AbortSignal,
  exclude: ReadonlySet<string> = new Set(),
): Promise<ResolvedSuggestion[]> {
  const resolved = await Promise.all(
    suggestions.map(async (suggestion): Promise<ResolvedSuggestion | undefined> => {
      try {
        const results = await searchTitle(
          suggestion.type,
          suggestion.title,
          suggestion.year,
          signal,
        );
        const item =
          matchSuggestion(results, suggestion) ??
          matchSuggestion(
            await searchTitle(suggestion.type, suggestion.title, undefined, signal),
            suggestion,
          );
        return item ? { item, reason: suggestion.reason } : undefined;
      } catch (caught) {
        if (isAbortError(caught)) throw caught;
        return undefined;
      }
    }),
  );

  const seen = new Set<string>();
  return resolved.filter((entry): entry is ResolvedSuggestion => {
    if (!entry) return false;
    const key = getMediaKey(entry.item);
    if (seen.has(key) || exclude.has(key)) return false;
    seen.add(key);
    return true;
  });
}
