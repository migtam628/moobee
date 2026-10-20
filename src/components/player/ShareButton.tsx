import { Check, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface ShareButtonProps {
  className?: string;
}

/** Copies the address of the page. Says "Link copied" for a moment; stays quiet if the browser refuses. */
export function ShareButton({ className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const Icon = copied ? Check : Share2;

  return (
    <button
      type="button"
      onClick={() => {
        void copy();
      }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-white/15',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      <span role="status">{copied ? 'Link copied' : 'Share'}</span>
    </button>
  );
}
