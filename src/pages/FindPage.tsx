import { RotateCcw, SendHorizontal, Sparkles, WandSparkles } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAiErrorMessage } from '@/api/ai/client';
import { PickCard } from '@/components/surprise/PickCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFinder, type FinderTurn } from '@/hooks/useFinder';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';
import type { PickKind } from '@/types/settings';

const KINDS: readonly { id: PickKind; label: string }[] = [
  { id: 'any', label: 'Anything' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'Series' },
  { id: 'anime', label: 'Anime' },
];

/** Starting points. They are written the way a person talks, and one is in Spanish: the AI answers in the language it is asked in. */
const EXAMPLES: readonly string[] = [
  'Something like Parasite, but less dark',
  'I forgot the name: a man relives the same day over and over',
  'A 90s comedy the whole family can watch',
  'Una serie de misterio corta para ver en un fin de semana',
];

const MAX_ASK = 400;

function TurnSkeleton() {
  return (
    <div role="status" aria-label="Looking" className="flex flex-wrap gap-5">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="w-64 max-w-full space-y-3">
          <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      ))}
    </div>
  );
}

function Turn({ turn, onRetry }: { turn: FinderTurn; onRetry: () => void }) {
  return (
    <section aria-label={`Answer to: ${turn.ask}`} className="space-y-4">
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-accent-fg sm:text-base">
        {turn.ask}
      </p>

      {turn.status === 'loading' ? (
        <TurnSkeleton />
      ) : turn.status === 'error' ? (
        <ErrorState
          compact
          title="Couldn't find anything"
          error={turn.error}
          message={getAiErrorMessage(turn.error)}
          onRetry={onRetry}
        />
      ) : (
        <>
          {turn.reply ? (
            <p className="flex w-fit max-w-[85%] gap-2.5 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 text-sm text-fg sm:text-base">
              <Sparkles aria-hidden="true" className="mt-1 size-4 shrink-0 text-accent" />
              <span>{turn.reply}</span>
            </p>
          ) : null}
          {turn.noMatch && turn.picks.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing new came up for that. Try describing it a different way.
            </p>
          ) : null}
          {turn.picks.length > 0 ? (
            // A swipeable row on phones, so six answers do not make a very long page.
            <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0">
              {turn.picks.map((pick) => (
                <div
                  key={`${pick.item.mediaType}:${String(pick.item.id)}`}
                  className="shrink-0 snap-start"
                >
                  <PickCard item={pick.item} reason={pick.reason} canSwap={false} />
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * `/find`. Tell the AI what you feel like watching, or what you half remember ("a man relives the
 * same day"), and it suggests titles that exist, with a line on why each fits. Keep talking to
 * narrow it down ("older", "less scary"). Needs the viewer's own AI key from Settings.
 */
export function FindPage() {
  useDocumentTitle('Find with AI');
  const { settings, hasAiKey } = useSettings();
  const { turns, busy, send, retry, reset } = useFinder();

  const [kind, setKind] = useState<PickKind>(settings.surprise.kind);
  const [params] = useSearchParams();
  // `?ask=` fills the box (a search with no results sends people here) but never sends by itself.
  const [text, setText] = useState(() => (params.get('ask') ?? '').slice(0, MAX_ASK));
  const lastTurn = useRef<HTMLDivElement>(null);

  // Bring the newest answer into view when a message is sent.
  const turnCount = turns.length;
  useEffect(() => {
    if (turnCount > 0) lastTurn.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [turnCount]);

  const ask = (message: string) => {
    if (busy || message.trim() === '') return;
    send(message, kind);
    setText('');
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(text);
  };

  const talking = turns.length > 0;

  return (
    <div className="page-gutter pt-24 pb-28 sm:pt-32 md:pb-12">
      <header className="mx-auto max-w-2xl text-center">
        <WandSparkles aria-hidden="true" className="mx-auto size-10 text-accent" />
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">Find with AI</h1>
        <p className="mt-2 text-muted">
          Say what you feel like watching, or describe a movie you half remember. Then keep talking
          to narrow it down.
        </p>
      </header>

      {!hasAiKey ? (
        <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="font-semibold text-fg">This needs an AI key</p>
          <p className="mt-1 text-sm text-muted">
            Add your own key from Anthropic or OpenAI in Settings. It stays in this browser, and you
            can set a spending limit with the provider.
          </p>
          <Link
            to={paths.settings}
            className="mt-4 inline-flex rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong"
          >
            Add an AI key in Settings
          </Link>
          <p className="mt-4 text-sm text-muted">
            No key?{' '}
            <Link
              to={paths.surprise}
              className="text-fg underline underline-offset-2 hover:text-accent"
            >
              Surprise me
            </Link>{' '}
            still gives random picks.
          </p>
        </div>
      ) : (
        <div className="mx-auto mt-8 max-w-4xl">
          {!talking ? (
            <div className="mx-auto max-w-2xl space-y-3 text-center">
              <p className="text-sm text-muted">Try one of these</p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      ask(example);
                    }}
                    className="rounded-full bg-white/10 px-4 py-2 text-left text-sm text-fg transition hover:bg-white/15 disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div aria-live="polite" className="space-y-8">
              {turns.map((turn, index) => (
                <div key={turn.id} ref={index === turns.length - 1 ? lastTurn : undefined}>
                  <Turn turn={turn} onRetry={retry} />
                </div>
              ))}
            </div>
          )}

          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 mt-8 md:bottom-4">
            <form
              onSubmit={onSubmit}
              className="space-y-2 rounded-2xl border border-line bg-canvas/95 p-3 shadow-lg backdrop-blur-xl"
            >
              <div role="group" aria-label="What to look for" className="flex flex-wrap gap-1.5">
                {KINDS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={kind === id}
                    onClick={() => {
                      setKind(id);
                    }}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition',
                      kind === id ? 'bg-fg text-canvas' : 'bg-white/10 text-fg hover:bg-white/15',
                    )}
                  >
                    {label}
                  </button>
                ))}
                {talking ? (
                  <button
                    type="button"
                    onClick={reset}
                    className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-muted transition hover:text-fg"
                  >
                    <RotateCcw aria-hidden="true" className="size-3.5" />
                    Start over
                  </button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <label htmlFor="find-input" className="sr-only">
                  What are you looking for?
                </label>
                <input
                  id="find-input"
                  type="text"
                  value={text}
                  maxLength={MAX_ASK}
                  autoComplete="off"
                  placeholder={
                    talking
                      ? 'Refine it: older, funnier, only series…'
                      : 'What are you looking for?'
                  }
                  onChange={(event) => {
                    setText(event.target.value);
                  }}
                  className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-fg placeholder:text-muted/60"
                />
                <button
                  type="submit"
                  disabled={busy || text.trim() === ''}
                  aria-label="Send"
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition hover:bg-accent-strong disabled:opacity-50"
                >
                  <SendHorizontal aria-hidden="true" className="size-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export const Component = FindPage;
