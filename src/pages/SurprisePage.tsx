import { Dices, Shuffle, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { getAiErrorMessage } from '@/api/ai/client';
import { PickCard } from '@/components/surprise/PickCard';
import { PickControls } from '@/components/surprise/PickControls';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSettings } from '@/hooks/useSettings';
import { useSurprise } from '@/hooks/useSurprise';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';
import type { MoodId } from '@/lib/surprise';
import type { PickKind } from '@/types/settings';

function PickSkeletons({ count }: { count: number }) {
  return (
    <div role="status" aria-label="Finding picks" className="flex flex-wrap justify-center gap-5">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="w-64 max-w-full space-y-3">
          <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/**
 * `/surprise`. A hand of picks (3 by default) in one tap: kind and mood narrow it, a button
 * shuffles, each card can be swapped. Random from TMDB by default; with an AI key in Settings it
 * can ask the AI instead, which also says why it chose each title.
 */
export function SurprisePage() {
  useDocumentTitle('Surprise me');
  const { settings, hasAiKey } = useSettings();
  const { picks, status, notice, error, spare, deal, swap } = useSurprise();

  const [kind, setKind] = useState<PickKind>(settings.surprise.kind);
  const [mood, setMood] = useState<MoodId | undefined>();
  const [useAi, setUseAi] = useState(true);
  const [prompt, setPrompt] = useState('');
  const count = settings.surprise.count;
  const aiOn = hasAiKey && useAi;

  const dealNow = () => {
    deal({ kind, mood, prompt, useAi: aiOn });
  };

  // The first hand comes up by itself, from TMDB at random (it costs nothing). The AI is only
  // asked when the button is pressed. Safe to run twice (React StrictMode): `deal` cancels the
  // earlier call, so the last one wins.
  const startKind = useRef(settings.surprise.kind);
  useEffect(() => {
    deal({ kind: startKind.current, mood: undefined, prompt: '', useAi: false });
  }, [deal]);

  const loading = status === 'loading';
  const hasHand = status === 'ready' || picks.length > 0;

  return (
    <div className="page-gutter pt-24 pb-12 sm:pt-32">
      <header className="mx-auto max-w-2xl text-center">
        <Dices aria-hidden="true" className="mx-auto size-10 text-accent" />
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">Surprise me</h1>
        <p className="mt-2 text-muted">
          Can&apos;t decide? Get {count === 1 ? 'a pick' : `${String(count)} picks`} in one tap,
          then shuffle until something looks good.
        </p>
        <Link
          to={paths.find}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted underline-offset-2 transition hover:text-fg hover:underline"
        >
          <WandSparkles aria-hidden="true" className="size-4 text-accent" />
          Know what you want? Describe it to the AI
        </Link>
      </header>

      <div className="mt-8">
        <PickControls
          kind={kind}
          onKindChange={setKind}
          mood={mood}
          onMoodChange={setMood}
          aiAvailable={hasAiKey}
          useAi={useAi}
          onUseAiChange={setUseAi}
          prompt={prompt}
          onPromptChange={setPrompt}
        />
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={dealNow}
          disabled={loading}
          className={cn(
            'inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3 text-base font-semibold text-accent-fg transition hover:bg-accent-strong disabled:opacity-60',
          )}
        >
          <Shuffle aria-hidden="true" className="size-5" />
          {hasHand
            ? 'Shuffle again'
            : `Give me ${count === 1 ? 'a pick' : `${String(count)} picks`}`}
          {aiOn ? ' (AI)' : ''}
        </button>
      </div>

      {notice ? (
        <p role="status" className="mx-auto mt-4 max-w-xl text-center text-sm text-accent">
          {notice}
        </p>
      ) : null}

      <div aria-live="polite" className="mt-8">
        {loading ? (
          <PickSkeletons count={count} />
        ) : status === 'error' ? (
          <ErrorState
            title="Couldn't find picks"
            error={error}
            {...(error instanceof Error && error.name === 'AiError'
              ? { message: getAiErrorMessage(error) }
              : {})}
            onRetry={dealNow}
          />
        ) : (
          <div className="flex flex-wrap justify-center gap-5">
            {picks.map((pick, index) => (
              <PickCard
                key={`${pick.item.mediaType}:${String(pick.item.id)}`}
                item={pick.item}
                reason={pick.reason}
                canSwap={spare > 0}
                onSwap={() => {
                  swap(index);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const Component = SurprisePage;
