import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getPosterUrl } from '@/api/tmdb/images';

interface WatchInfoProps {
  /** The h1: the movie's or the episode's title. */
  title: string;
  /** The "channel": the show, or the movie's director. Links to `channelHref` when given. */
  channelName: string;
  channelHref: string;
  channelDetail?: string;
  /** TMDB poster path, shown as the round avatar. */
  channelPosterPath?: string;
  /** Pills on the right of the channel row (Watchlist, Favorite, Share, Details, Previous/Next...). */
  actions: ReactNode;
  /** The description box. */
  children?: ReactNode;
}

/** Title, channel row with its action pills, and the description, in the order of a video site. */
export function WatchInfo({
  title,
  channelName,
  channelHref,
  channelDetail,
  channelPosterPath,
  actions,
  children,
}: WatchInfoProps) {
  const avatar = getPosterUrl(channelPosterPath, 'w92');

  return (
    <div className="space-y-3">
      <h1 className="text-xl leading-snug font-bold tracking-tight text-balance text-fg">
        {title}
      </h1>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Link to={channelHref} className="group flex min-w-0 items-center gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              className="size-10 shrink-0 rounded-full bg-raised object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-raised text-sm font-bold text-muted"
            >
              {channelName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-fg group-hover:underline">
              {channelName}
            </span>
            {channelDetail ? (
              <span className="block truncate text-xs text-muted">{channelDetail}</span>
            ) : null}
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>

      {children}
    </div>
  );
}
