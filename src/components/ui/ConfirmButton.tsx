import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ConfirmButtonProps {
  children: ReactNode;
  /** Shown on the second press, which does the thing. */
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}

const CONFIRM_WINDOW_MS = 4000;

/** A destructive button that needs a second press within a few seconds, instead of a dialog. */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  disabled = false,
  className,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        window.clearTimeout(timer.current);
        if (armed) {
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        timer.current = window.setTimeout(() => {
          setArmed(false);
        }, CONFIRM_WINDOW_MS);
      }}
      className={cn(
        'rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
        armed ? 'bg-danger text-canvas' : 'bg-white/10 text-fg hover:bg-white/15',
        className,
      )}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
