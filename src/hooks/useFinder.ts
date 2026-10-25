import { useCallback, useEffect, useRef, useState } from 'react';
import { requestAiFind } from '@/api/ai/client';
import { resolveSuggestions } from '@/api/ai/resolve';
import { isAbortError } from '@/api/tmdb';
import { useLibrary } from '@/hooks/useLibrary';
import { useSettings } from '@/hooks/useSettings';
import { getMediaKey } from '@/lib/media';
import { tasteTitles } from '@/lib/surprise';
import type { MediaItem } from '@/types/media';
import type { PickKind } from '@/types/settings';

/** A title the finder shows, and why the AI chose it. */
export interface FinderPick {
  item: MediaItem;
  reason: string;
}

export interface FinderTurn {
  id: number;
  ask: string;
  kind: PickKind;
  status: 'loading' | 'done' | 'error';
  /** What the AI said: an introduction to the picks, or a question when it needs more to go on. */
  reply?: string;
  picks: FinderPick[];
  /** The AI named titles but none of them could be found in TMDB. */
  noMatch?: boolean;
  error?: unknown;
}

export interface UseFinderResult {
  turns: FinderTurn[];
  /** A message is waiting for its answer. */
  busy: boolean;
  /** Sends a message; it joins the conversation and the AI builds on what came before. */
  send: (ask: string, kind: PickKind) => void;
  /** Asks the last message again after a failure. */
  retry: () => void;
  reset: () => void;
}

/** How many suggestions to ask for, and how many verified ones to show. Spares cover invented titles. */
const ASK_COUNT = 8;
const SHOW_COUNT = 6;
/** Earlier exchanges the AI is told about. */
const HISTORY_TURNS = 6;

const STORAGE_KEY = 'moobee:finder:v1';

const isItem = (value: unknown): value is MediaItem => {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'number' &&
    (item.mediaType === 'movie' || item.mediaType === 'tv') &&
    typeof item.title === 'string'
  );
};

/** The conversation as it was left, kept for this browser tab so coming back from a title's page finds it. */
function restore(): FinderTurn[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const turns: FinderTurn[] = [];
    for (const entry of parsed as unknown[]) {
      if (typeof entry !== 'object' || entry === null) continue;
      const turn = entry as Partial<FinderTurn>;
      if (typeof turn.ask !== 'string' || turn.status !== 'done' || !Array.isArray(turn.picks)) {
        continue;
      }
      const picks = (turn.picks as unknown[]).flatMap((pick) => {
        const candidate = pick as Partial<FinderPick> | null;
        return candidate && isItem(candidate.item) && typeof candidate.reason === 'string'
          ? [{ item: candidate.item, reason: candidate.reason }]
          : [];
      });
      const kind: PickKind =
        turn.kind === 'movie' || turn.kind === 'tv' || turn.kind === 'anime' ? turn.kind : 'any';
      turns.push({
        id: turns.length + 1,
        ask: turn.ask,
        kind,
        status: 'done',
        picks,
        ...(typeof turn.reply === 'string' ? { reply: turn.reply } : {}),
        ...(turn.noMatch === true ? { noMatch: true } : {}),
      });
    }
    return turns;
  } catch {
    return [];
  }
}

function persist(turns: readonly FinderTurn[]): void {
  try {
    const done = turns.filter((turn) => turn.status === 'done');
    if (done.length === 0) window.sessionStorage.removeItem(STORAGE_KEY);
    else window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(done));
  } catch {
    // Private mode or a full store: the conversation just will not outlive the page.
  }
}

/**
 * The state behind the Find with AI page: a conversation. Each message goes to the AI with the
 * earlier asks and what was shown, so a follow-up refines the search. The AI only names titles,
 * so every one is checked against TMDB and nothing that does not exist is shown. Titles already
 * shown in the conversation are not shown again.
 */
export function useFinder(): UseFinderResult {
  const { settings } = useSettings();
  const { watchlist, favorites, recentlyViewed } = useLibrary();

  const [turns, setTurns] = useState<FinderTurn[]>(restore);
  const nextId = useRef(turns.length + 1);
  const aborter = useRef<AbortController | undefined>(undefined);
  // The latest values, read inside async work without making `send` change on every library edit.
  const latest = useRef({ settings, watchlist, favorites, recentlyViewed, turns });
  useEffect(() => {
    latest.current = { settings, watchlist, favorites, recentlyViewed, turns };
  });

  useEffect(() => {
    persist(turns);
  }, [turns]);

  useEffect(
    () => () => {
      aborter.current?.abort();
    },
    [],
  );

  const patch = useCallback((id: number, change: Partial<FinderTurn>) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, ...change } : turn)));
  }, []);

  const send = useCallback(
    (rawAsk: string, kind: PickKind) => {
      const ask = rawAsk.trim().slice(0, 400);
      if (ask === '') return;

      aborter.current?.abort();
      const controller = new AbortController();
      aborter.current = controller;

      const { settings: s, watchlist: w, favorites: f, recentlyViewed: r } = latest.current;
      // A turn still waiting, or one that failed, is replaced by this message rather than kept.
      const before = latest.current.turns.filter((turn) => turn.status === 'done');
      const id = nextId.current;
      nextId.current += 1;
      setTurns([...before, { id, ask, kind, status: 'loading', picks: [] }]);

      const shown = new Set(before.flatMap((turn) => turn.picks.map((p) => getMediaKey(p.item))));
      const history = before.slice(-HISTORY_TURNS).map((turn) => ({
        asked: turn.ask,
        suggested: turn.picks.map((p) => p.item.title),
      }));

      const run = async () => {
        try {
          const answer = await requestAiFind(
            { provider: s.ai.provider, model: s.ai.model, apiKey: s.ai.apiKey },
            {
              kind,
              ask,
              history,
              taste: s.surprise.personalize ? tasteTitles([f, w, r]) : [],
              count: ASK_COUNT,
            },
            controller.signal,
          );
          const found = await resolveSuggestions(answer.suggestions, controller.signal, shown);
          if (controller.signal.aborted) return;
          patch(id, {
            status: 'done',
            picks: found.slice(0, SHOW_COUNT),
            ...(answer.reply ? { reply: answer.reply } : {}),
            ...(found.length === 0 && answer.suggestions.length > 0 ? { noMatch: true } : {}),
          });
        } catch (caught) {
          if (isAbortError(caught) || controller.signal.aborted) return;
          patch(id, { status: 'error', error: caught });
        }
      };
      void run();
    },
    [patch],
  );

  const retry = useCallback(() => {
    const last = latest.current.turns.at(-1);
    if (last?.status === 'error') send(last.ask, last.kind);
  }, [send]);

  const reset = useCallback(() => {
    aborter.current?.abort();
    setTurns([]);
  }, []);

  return { turns, busy: turns.at(-1)?.status === 'loading', send, retry, reset };
}
