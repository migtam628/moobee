import { Modal } from '@/components/ui/Modal';
import { getYouTubeEmbedUrl } from '@/lib/video';
import type { Video } from '@/types/media';

interface TrailerModalProps {
  video: Video;
  /** Title of the movie or show, used for the dialog and iframe names. */
  mediaTitle: string;
  onClose: () => void;
}

/**
 * Plays a trailer in a privacy-enhanced YouTube embed. The URL is built from a validated key
 * (see `getYouTubeEmbedUrl`); if the key is somehow invalid nothing is embedded.
 */
export function TrailerModal({ video, mediaTitle, onClose }: TrailerModalProps) {
  const embedUrl = getYouTubeEmbedUrl(video.key);

  return (
    <Modal title={`${mediaTitle}: ${video.name}`} onClose={onClose}>
      <div className="aspect-video w-full bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`${video.type} for ${mediaTitle}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="size-full border-0"
          />
        ) : (
          <p className="grid size-full place-items-center p-6 text-center text-sm text-muted">
            This trailer can't be played.
          </p>
        )}
      </div>
    </Modal>
  );
}
