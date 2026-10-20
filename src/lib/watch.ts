import { getBackdropUrl, getPosterUrl, getStillUrl } from '@/api/tmdb/images';
import type { UpNextItem } from '@/components/player/UpNext';
import { formatAirDate, formatCount, formatRuntime } from '@/lib/format';
import { formatRating, getMediaTypeLabel } from '@/lib/media';
import { getMediaPath, paths } from '@/lib/routes';
import type { Episode, Genre, MediaItem } from '@/types/media';

/** Anime, the way the Anime page finds it: Animation from Japan. */
export function isAnime(title: { genres?: readonly Genre[]; originalLanguage?: string }): boolean {
  return (
    title.originalLanguage === 'ja' &&
    Boolean(title.genres?.some((genre) => genre.name === 'Animation'))
  );
}

/**
 * The bold first line of the description box: "S1 E3 · ★ 8.4 · 28K votes · Sep 21, 2026". Leaves
 * out whatever is unknown, and returns undefined when nothing is.
 */
export function describeStats(parts: {
  lead?: string;
  rating?: number;
  voteCount?: number;
  date?: string;
}): string | undefined {
  const votes = formatCount(parts.voteCount);
  const pieces = [
    parts.lead,
    parts.rating === undefined ? undefined : `★ ${formatRating(parts.rating)}`,
    votes && parts.voteCount ? `${votes} ${parts.voteCount === 1 ? 'vote' : 'votes'}` : undefined,
    formatAirDate(parts.date),
  ].filter((piece): piece is string => Boolean(piece));
  return pieces.length > 0 ? pieces.join(' · ') : undefined;
}

/** Titles to watch after this one, as rows of the Up next list. They open the title's details page. */
export function mediaUpNextItems(items: readonly MediaItem[]): UpNextItem[] {
  return items.map((item) => {
    const meta = [
      getMediaTypeLabel(item.mediaType),
      item.year === undefined ? undefined : String(item.year),
      item.rating === undefined ? undefined : `★ ${formatRating(item.rating)}`,
    ]
      .filter(Boolean)
      .join(' · ');
    return {
      key: `${item.mediaType}:${item.id}`,
      href: getMediaPath(item),
      title: item.title,
      meta,
      thumbnailUrl:
        getBackdropUrl(item.backdropPath, 'w300') ?? getPosterUrl(item.posterPath, 'w185'),
      kind: item.mediaType,
    };
  });
}

/** One season's episodes as rows of the Up next list, with the playing one marked. */
export function episodeUpNextItems(
  tvId: number,
  episodes: readonly Episode[],
  playing: { seasonNumber: number; episodeNumber: number },
): UpNextItem[] {
  return episodes.map((episode) => ({
    key: `${episode.seasonNumber}:${episode.episodeNumber}`,
    href: paths.watchTv(tvId, episode.seasonNumber, episode.episodeNumber),
    title: `${episode.episodeNumber}. ${episode.name}`,
    meta: formatAirDate(episode.airDate),
    badge: formatRuntime(episode.runtimeMinutes),
    thumbnailUrl: getStillUrl(episode.stillPath, 'w300'),
    kind: 'tv',
    current:
      episode.seasonNumber === playing.seasonNumber &&
      episode.episodeNumber === playing.episodeNumber,
  }));
}
