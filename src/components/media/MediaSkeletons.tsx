import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { cn } from '@/lib/cn';
import { CARD_WIDTH_CLASSES } from './MediaCard';

export function MediaCardSkeleton() {
  return (
    <div className={cn('shrink-0', CARD_WIDTH_CLASSES)}>
      <Skeleton className="aspect-[2/3] rounded-xl" />
      <Skeleton className="mt-2.5 h-3.5 w-4/5" />
      <Skeleton className="mt-2 h-3 w-1/3" />
    </div>
  );
}

/** Placeholder cards laid out exactly like a loaded row. Announced once as "loading". */
export function MediaRowSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading titles"
      className="flex page-gutter gap-3 overflow-hidden pb-2 sm:gap-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <MediaCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading featured title"
      className="relative flex h-[78svh] max-h-[52rem] min-h-[34rem] w-full page-gutter flex-col justify-end bg-surface pt-24 pb-14 sm:pb-16 lg:pb-20"
    >
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-4/5 sm:h-16" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-11/12 max-w-xl" />
          <Skeleton className="h-4 w-2/3 max-w-xl" />
        </div>
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
    </div>
  );
}
