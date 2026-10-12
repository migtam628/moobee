import { useInView } from '@/hooks/useInView';
import type { ListQueryOptions, MediaListQuery } from '@/hooks/useMediaQueries';
import { MediaQueryRow } from './MediaQueryRow';
import type { MediaRowProps } from './MediaRow';

interface LazyMediaRowProps extends Pick<MediaRowProps, 'title' | 'emptyMessage'> {
  /** A list query hook. Must be a stable module-level hook (it is called every render). */
  useList: (options: ListQueryOptions) => MediaListQuery;
}

/**
 * A row whose request is held until it is near the viewport. Keeps a long home page from firing
 * every below-the-fold TMDB request on first paint. While waiting it shows the same skeleton as a
 * loading row, so nothing shifts when data arrives.
 */
export function LazyMediaRow({ useList, ...rowProps }: LazyMediaRowProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const query = useList({ enabled: inView });

  return (
    <div ref={ref}>
      <MediaQueryRow {...rowProps} query={query} />
    </div>
  );
}
