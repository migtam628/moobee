import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

/** Generic pulsing placeholder block. Purely decorative, so hidden from assistive tech. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-white/[0.06]', className)} />
  );
}
