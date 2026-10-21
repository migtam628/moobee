import { VideoOff } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * Shown instead of `VideoPlayer` when the playback registry has no URL for this title.
 * Never a blank player, so the page always explains itself instead of looking broken.
 */
export function PlaybackUnavailable() {
  return (
    <div className="flex aspect-video w-full items-center justify-center bg-surface sm:rounded-xl">
      <EmptyState
        compact
        icon={<VideoOff className="size-8" />}
        title="Playback isn't available yet"
        description="MooBee doesn't have an authorized streaming source configured for this title yet."
      />
    </div>
  );
}
