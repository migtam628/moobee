import {
  Bookmark,
  Clapperboard,
  Dices,
  House,
  Search,
  Sparkles,
  Tv,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import { paths } from '@/lib/routes';

export interface NavItem {
  label: string;
  /** A shorter name for the phone tab bar, where eight tabs share the width. */
  shortLabel?: string;
  to: string;
  icon: LucideIcon;
  /** Match only the exact path (needed for "/" so it isn't active everywhere). */
  end?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', to: paths.home, icon: House, end: true },
  { label: 'Movies', to: paths.movies, icon: Clapperboard },
  { label: 'TV Shows', shortLabel: 'TV', to: paths.tv, icon: Tv, end: true },
  { label: 'Anime', to: paths.anime, icon: Sparkles, end: true },
  { label: 'Surprise', to: paths.surprise, icon: Dices, end: true },
  { label: 'Ask AI', to: paths.find, icon: WandSparkles, end: true },
  { label: 'My List', to: paths.watchlist, icon: Bookmark, end: true },
  { label: 'Search', to: paths.search, icon: Search },
];
