import { cn } from '@/lib/cn';

interface AutoplayToggleProps {
  autoplay: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}

/** Persisted "autoplay next episode" switch. See `useAutoplayPreference`. */
export function AutoplayToggle({ autoplay, onChange, className }: AutoplayToggleProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-sm', className)}>
      <span className="text-fg/80">Autoplay</span>
      <span
        role="switch"
        aria-checked={autoplay}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          autoplay ? 'bg-accent' : 'bg-white/15',
        )}
      >
        <input
          type="checkbox"
          checked={autoplay}
          onChange={(event) => {
            onChange(event.target.checked);
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
        <span
          aria-hidden="true"
          className={cn(
            'inline-block size-4.5 translate-x-1 rounded-full bg-white shadow transition-transform',
            autoplay && 'translate-x-[1.375rem]',
          )}
        />
      </span>
    </label>
  );
}
