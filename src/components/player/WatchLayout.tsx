import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface WatchLayoutProps {
  player: ReactNode;
  /** Title, action row and description, under the player. */
  info: ReactNode;
  /** The "Up next" column. Beside the player by default, under it on a phone or tablet. */
  side: ReactNode;
  /** Wide player across the full width, with the info and the list below it. */
  theater: boolean;
  /** The page is still loading: the column is drawn as a plain block, not as a landmark. */
  placeholder?: boolean;
}

/**
 * The watch page grid. The three slots are placed with CSS grid rather than moved around in the
 * tree, so switching between the default and the theater view never remounts the player (which
 * would restart the stream). On a phone or tablet everything is one column: player, info, list.
 */
export function WatchLayout({
  player,
  info,
  side,
  theater,
  placeholder = false,
}: WatchLayoutProps) {
  const Side = placeholder ? 'div' : 'aside';
  return (
    <div className="page-gutter pt-20 pb-12">
      <div className="grid gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div
          className={cn(
            // Full-bleed on a phone, like the video apps; in theater the black band reaches the
            // page edges.
            '-mx-(--page-gutter) sm:mx-0',
            theater
              ? 'lg:col-span-2 lg:row-start-1 lg:-mx-(--page-gutter) lg:bg-black'
              : 'lg:col-start-1 lg:row-start-1',
          )}
        >
          {player}
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">{info}</div>

        <Side
          aria-label={placeholder ? undefined : 'Up next'}
          className={cn(
            'min-w-0 lg:col-start-2',
            theater ? 'lg:row-start-2' : 'lg:row-span-2 lg:row-start-1',
          )}
        >
          {side}
        </Side>
      </div>
    </div>
  );
}
