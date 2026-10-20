import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { WatchLayout } from './WatchLayout';

/** The watch page while its data loads: the same grid, with grey blocks where things will be. */
export function WatchSkeleton() {
  return (
    <div role="status" aria-label="Loading player">
      <WatchLayout
        theater={false}
        placeholder
        player={<Skeleton className="aspect-video w-full rounded-none sm:rounded-xl" />}
        info={
          <div className="space-y-4">
            <Skeleton className="h-7 w-2/3" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        }
        side={
          <div className="space-y-3">
            <Skeleton className="h-6 w-28" />
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex gap-2">
                <Skeleton className="aspect-video w-40 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        }
      />
    </div>
  );
}
