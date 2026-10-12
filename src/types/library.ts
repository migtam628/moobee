import type { MediaItem } from './media';

/** A saved item plus when it was saved, newest first in every list this app renders. */
export interface LibraryEntry extends MediaItem {
  savedAt: string;
}

export type RecentlyViewedEntry = LibraryEntry;
