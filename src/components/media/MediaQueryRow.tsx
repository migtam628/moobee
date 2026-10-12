import type { MediaListQuery } from '@/hooks/useMediaQueries';
import { MediaRow, type MediaRowProps } from './MediaRow';

interface MediaQueryRowProps extends Pick<MediaRowProps, 'title' | 'emptyMessage' | 'eagerCount'> {
  query: MediaListQuery;
}

/** Adapts a TanStack Query result to MediaRow's loading / error / success contract. */
export function MediaQueryRow({ query, ...rowProps }: MediaQueryRowProps) {
  const status = query.isPending ? 'loading' : query.isError ? 'error' : 'success';

  return (
    <MediaRow
      {...rowProps}
      status={status}
      items={query.data}
      error={query.error}
      onRetry={() => {
        void query.refetch();
      }}
      isRetrying={query.isFetching}
    />
  );
}
