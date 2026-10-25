import { useCallback, useEffect, useRef, useState } from 'react';
import { requestAiPicks } from '@/api/ai/client';
import { resolveSuggestions } from '@/api/ai/resolve';
import { discoverPool, isAbortError } from '@/api/tmdb';
import { useLibrary } from '@/hooks/useLibrary';
import { useSettings } from '@/hooks/useSettings';
import { getMediaKey } from '@/lib/media';
import {
  buildPoolPlan,
  getMood,
  interleaveTypes,
  preparePool,
  tasteTitles,
  type MoodId,
} from '@/lib/surprise';
import type { MediaItem } from '@/types/media';
import type { PickKind } from '@/types/settings';

/** A title the page deals, and, when the AI chose it, why. */
export interface Pick {
  item: MediaItem;
  reason?: string;
}

export interface SurpriseRequest {
  kind: PickKind;
  mood?: MoodId | undefined;
  /** Free text for the AI ("something like Inception, but funnier"). Ignored without `useAi`. */
  prompt?: string | undefined;
  useAi: boolean;
}

export type SurpriseStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseSurpriseResult {
  picks: Pick[];
  status: SurpriseStatus;
  /** Set when the AI could not be used and random picks were dealt instead. */
  notice: string | undefined;
  error: unknown;
  /** Picks left in the pool: swapping one pick is possible while this is above zero. */
  spare: number;
  /** Deals a fresh hand. Draws from the leftovers of the last pool when the request is the same. */
  deal: (request: SurpriseRequest) => void;
  /** Replaces one pick with another from the pool. */
  swap: (index: number) => void;
}

/** How many AI suggestions to ask for, per pick wanted: spare ones cover titles that do not check out. */
const AI_SPARES = 3;
const AI_MAX = 12;
const EXCLUDE_LIMIT = 50;

const signature = (request: SurpriseRequest, count: number): string =>
  JSON.stringify([
    request.kind,
    request.mood ?? null,
    request.useAi ? (request.prompt ?? '').trim() : null,
    request.useAi,
    count,
  ]);

/**
 * The state behind the Surprise page. A "pool" of candidates is fetched once per request and
 * dealt from, so shuffling again, and swapping one pick, cost nothing until the pool runs dry.
 * The pool comes from TMDB at random; with the AI on it comes from the AI's suggestions, each
 * checked against TMDB so only real titles are shown. If the AI fails the page falls back to random.
 */
export function useSurprise(): UseSurpriseResult {
  const { settings, hasAiKey } = useSettings();
  const { watchlist, favorites, recentlyViewed } = useLibrary();
  const { count } = settings.surprise;

  const [picks, setPicks] = useState<Pick[]>([]);
  const [status, setStatus] = useState<SurpriseStatus>('idle');
  const [notice, setNotice] = useState<string | undefined>();
  const [error, setError] = useState<unknown>();
  /** How many more picks are waiting in the pool, so the page knows whether a swap can work. */
  const [spare, setSpare] = useState(0);

  const pool = useRef<Pick[]>([]);
  const dealt = useRef(new Set<string>());
  const poolSignature = useRef<string | undefined>(undefined);
  const aborter = useRef<AbortController | undefined>(undefined);
  // The latest values, read inside async work without making `deal` change on every library edit.
  const latest = useRef({ settings, watchlist, favorites, recentlyViewed, hasAiKey });
  useEffect(() => {
    latest.current = { settings, watchlist, favorites, recentlyViewed, hasAiKey };
  });

  useEffect(
    () => () => {
      aborter.current?.abort();
    },
    [],
  );

  /** Keys that must not be dealt: what was already shown here, and (if asked) what the viewer has. */
  const excludedKeys = useCallback((includeDealt = true): Set<string> => {
    const { watchlist: w, favorites: f, recentlyViewed: r, settings: s } = latest.current;
    const keys = new Set(includeDealt ? dealt.current : []);
    if (s.surprise.skipSeen) for (const entry of [...w, ...f, ...r]) keys.add(getMediaKey(entry));
    return keys;
  }, []);

  const fetchRandomPool = useCallback(
    async (request: SurpriseRequest, signal: AbortSignal): Promise<Pick[]> => {
      const plan = buildPoolPlan(request.kind, request.mood);
      const settled = await Promise.allSettled(
        plan.map((part) => discoverPool({ ...part, signal })),
      );
      if (signal.aborted) return [];
      const lists = settled.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value.items] : [],
      );
      if (lists.length === 0) {
        const failure = settled.find((result) => result.status === 'rejected');
        throw failure?.status === 'rejected' ? failure.reason : new Error('No picks');
      }
      const all = lists.flat();
      const fresh = preparePool(all, excludedKeys());
      // Few unseen titles left (a narrow mood, or the same pages again): let earlier picks come
      // round again after the fresh ones rather than dealing a short hand or none.
      const wanted = latest.current.settings.surprise.count;
      const repeats =
        fresh.length < wanted
          ? preparePool(all, excludedKeys(false)).filter((item) => !fresh.includes(item))
          : [];
      return interleaveTypes([...fresh, ...repeats].map((item) => ({ item })));
    },
    [excludedKeys],
  );

  const fetchAiPool = useCallback(
    async (request: SurpriseRequest, signal: AbortSignal): Promise<Pick[]> => {
      const { settings: s, watchlist: w, favorites: f, recentlyViewed: r } = latest.current;
      const exclude = excludedKeys();
      const seenTitles = [...w, ...f, ...r, ...pool.current.map((p) => p.item)]
        .filter((item) => exclude.has(getMediaKey(item)))
        .map((item) => item.title);
      const suggestions = await requestAiPicks(
        { provider: s.ai.provider, model: s.ai.model, apiKey: s.ai.apiKey },
        {
          kind: request.kind,
          mood: getMood(request.mood)?.label,
          prompt: request.prompt?.trim() ? request.prompt.trim() : undefined,
          taste: s.surprise.personalize ? tasteTitles([f, w, r]) : [],
          exclude: seenTitles.slice(0, EXCLUDE_LIMIT),
          count: Math.min(AI_MAX, s.surprise.count * AI_SPARES),
        },
        signal,
      );

      // Only titles that exist in TMDB are shown.
      return resolveSuggestions(suggestions, signal, exclude);
    },
    [excludedKeys],
  );

  const refill = useCallback(
    async (request: SurpriseRequest, signal: AbortSignal): Promise<void> => {
      if (request.useAi && latest.current.hasAiKey) {
        try {
          const fromAi = await fetchAiPool(request, signal);
          if (signal.aborted) return;
          if (fromAi.length > 0) {
            pool.current = fromAi;
            setNotice(undefined);
            return;
          }
          setNotice('The AI had nothing new that checks out, so here are random picks instead.');
        } catch (caught) {
          if (isAbortError(caught)) throw caught;
          setNotice('The AI could not help this time, so here are random picks instead.');
        }
      } else {
        setNotice(undefined);
      }
      pool.current = await fetchRandomPool(request, signal);
    },
    [fetchAiPool, fetchRandomPool],
  );

  const deal = useCallback(
    (request: SurpriseRequest) => {
      aborter.current?.abort();
      const controller = new AbortController();
      aborter.current = controller;

      const sig = signature(request, count);
      const sameRequest = poolSignature.current === sig;

      const run = async () => {
        setStatus('loading');
        setError(undefined);
        try {
          if (!sameRequest) {
            dealt.current = new Set();
            pool.current = [];
          }
          // Drop anything in the pool that was dealt since, or that the viewer saved in the meantime.
          const exclude = excludedKeys();
          pool.current = pool.current.filter((entry) => !exclude.has(getMediaKey(entry.item)));
          if (pool.current.length < count) {
            await refill(request, controller.signal);
            poolSignature.current = sig;
          }
          if (controller.signal.aborted) return;
          const hand = pool.current.splice(0, count);
          if (hand.length === 0) throw new Error('No picks');
          for (const entry of hand) dealt.current.add(getMediaKey(entry.item));
          setPicks(hand);
          setSpare(pool.current.length);
          setStatus('ready');
        } catch (caught) {
          if (isAbortError(caught) || controller.signal.aborted) return;
          setError(caught);
          setStatus('error');
        }
      };
      void run();
    },
    [count, excludedKeys, refill],
  );

  const swap = useCallback((index: number) => {
    const next = pool.current.shift();
    if (!next) return;
    dealt.current.add(getMediaKey(next.item));
    setPicks((current) => current.map((entry, i) => (i === index ? next : entry)));
  }, []);

  return { picks, status, notice, error, spare, deal, swap };
}
