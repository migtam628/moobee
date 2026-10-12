import { Star } from 'lucide-react';
import { formatRating } from '@/lib/media';
import { cn } from '@/lib/cn';

interface RatingBadgeProps {
  /** 0-10 TMDB user score. Renders nothing when unrated. */
  rating: number | undefined;
  size?: 'sm' | 'md';
  className?: string;
}

export function RatingBadge({ rating, size = 'sm', className }: RatingBadgeProps) {
  if (rating === undefined) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold text-fg tabular-nums',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className,
      )}
      role="img"
      aria-label={`Rated ${formatRating(rating)} out of 10`}
    >
      <Star
        aria-hidden="true"
        className={cn('fill-accent text-accent', size === 'sm' ? 'size-3' : 'size-4')}
      />
      {formatRating(rating)}
    </span>
  );
}
