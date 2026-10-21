import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';
import { MOODS, type MoodId } from '@/lib/surprise';
import type { PickKind } from '@/types/settings';

const KINDS: readonly { id: PickKind; label: string }[] = [
  { id: 'any', label: 'Anything' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'Series' },
  { id: 'anime', label: 'Anime' },
];

interface PickControlsProps {
  kind: PickKind;
  onKindChange: (kind: PickKind) => void;
  mood: MoodId | undefined;
  onMoodChange: (mood: MoodId | undefined) => void;
  /** The viewer has saved an AI key, so the AI row is shown. */
  aiAvailable: boolean;
  useAi: boolean;
  onUseAiChange: (next: boolean) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
}

const chip = (selected: boolean) =>
  cn(
    'rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition',
    selected ? 'bg-fg text-canvas' : 'bg-white/10 text-fg hover:bg-white/15',
  );

/** What kind of title, what mood, and (with an AI key) what to ask the AI. */
export function PickControls({
  kind,
  onKindChange,
  mood,
  onMoodChange,
  aiAvailable,
  useAi,
  onUseAiChange,
  prompt,
  onPromptChange,
}: PickControlsProps) {
  return (
    <div className="space-y-5">
      <div role="group" aria-label="What to watch" className="flex flex-wrap justify-center gap-2">
        {KINDS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={kind === id}
            onClick={() => {
              onKindChange(id);
            }}
            className={chip(kind === id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="group" aria-label="Mood" className="flex flex-wrap justify-center gap-2">
        {MOODS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={mood === id}
            onClick={() => {
              onMoodChange(mood === id ? undefined : id);
            }}
            className={cn(chip(mood === id), 'py-1.5')}
          >
            {label}
          </button>
        ))}
      </div>

      {aiAvailable ? (
        <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-line bg-surface p-4">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-2 font-semibold text-fg">
              <Sparkles aria-hidden="true" className="size-4 text-accent" />
              Ask AI to choose
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={useAi}
              onChange={(event) => {
                onUseAiChange(event.target.checked);
              }}
              className="size-5 accent-[var(--color-accent)]"
            />
          </label>
          {useAi ? (
            <div className="space-y-1.5">
              <label htmlFor="pick-prompt" className="text-sm text-muted">
                Anything specific? (optional)
              </label>
              <input
                id="pick-prompt"
                type="text"
                value={prompt}
                maxLength={300}
                placeholder="Something like Inception, but funnier"
                onChange={(event) => {
                  onPromptChange(event.target.value);
                }}
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-fg placeholder:text-muted/60"
              />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-center text-sm text-muted">
          Want a reason with every pick?{' '}
          <Link
            to={paths.settings}
            className="text-fg underline underline-offset-2 hover:text-accent"
          >
            Add an AI key in Settings
          </Link>
          .
        </p>
      )}
    </div>
  );
}
