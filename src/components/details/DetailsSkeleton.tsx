import { Skeleton } from '@/components/ui/LoadingSkeleton';

/** Placeholder with the same geometry as `DetailsHero`, so loading doesn't shift the layout. */
export function DetailsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading details"
      className="flex page-gutter flex-col gap-8 pt-28 pb-8 sm:pt-36 md:flex-row md:gap-10 lg:gap-14 lg:pt-44"
    >
      <Skeleton className="aspect-[2/3] w-40 shrink-0 rounded-2xl sm:w-52 md:w-64 lg:w-72" />
      <div className="max-w-3xl flex-1 space-y-4">
        <Skeleton className="h-10 w-3/4 sm:h-12" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <Skeleton className="h-11 w-40 rounded-full" />
        <div className="space-y-2 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
