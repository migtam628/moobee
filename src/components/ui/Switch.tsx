import { cn } from '@/lib/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name when no visible label wraps the switch. */
  label?: string;
  className?: string;
}

/** An on/off switch. Wrap it in a <label> for a visible name, or pass `label`. */
export function Switch({ checked, onChange, label, className }: SwitchProps) {
  return (
    <span
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-accent' : 'bg-white/15',
        className,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        className={cn(
          'inline-block size-4.5 translate-x-1 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-[1.375rem]',
        )}
      />
    </span>
  );
}
