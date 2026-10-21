import { Maximize2, Minimize2, RectangleHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { env } from '@/config/env';
import { cn } from '@/lib/cn';
import { getSafeExternalUrl } from '@/lib/url';

/**
 * Hosts this player is willing to embed — derived from the configured provider's base URL
 * (`VITE_PLAYBACK_PROVIDER_BASE_URL`), never hand-maintained. This is a second, independent
 * guard: even if a bug in provider code ever produced a URL on the wrong host, this still
 * refuses to render it. Empty (nothing embeddable) until a provider is configured.
 */
const ALLOWED_PLAYER_HOSTS: readonly string[] = env.playbackProviderBaseUrl
  ? [new URL(env.playbackProviderBaseUrl).hostname]
  : [];

interface PlayerFrameProps {
  src: string;
  title: string;
  autoplay: boolean;
  onRetry: () => void;
}

/**
 * The `<iframe>` plus its loading/error overlay. The parent remounts this (via a `key` on
 * `src`/retry attempt) instead of resetting state through an effect, so a new source or a retry
 * always starts from a clean `isLoading`/`hasErrored` state with no extra render pass.
 */
function PlayerFrame({ src, title, autoplay, onRetry }: PlayerFrameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasErrored, setHasErrored] = useState(false);

  if (hasErrored) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black p-6">
        <ErrorState
          title="Playback failed"
          message="This title couldn't be played right now."
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <>
      {isLoading ? <Skeleton className="absolute inset-0" /> : null}
      <iframe
        src={autoplay ? `${src}${src.includes('?') ? '&' : '?'}autoplay=1` : src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="no-referrer"
        // sandbox="allow-scripts allow-same-origin allow-presentation"
        className="size-full border-0"
        onLoad={() => {
          setIsLoading(false);
        }}
        onError={() => {
          setIsLoading(false);
          setHasErrored(true);
        }}
      />
    </>
  );
}

interface VideoPlayerProps {
  /** Playback URL from the provider registry — never built or guessed by this component. */
  src: string;
  /** Used for the iframe's accessible title and the error message. */
  title: string;
  autoplay?: boolean;
  /** Wide "theater" view. Only changes the frame's shape; the page lays out the rest. */
  theater?: boolean;
  /** When given, a theater-mode button is shown (large screens only, where the view differs). */
  onToggleTheater?: () => void;
}

const CONTROL_CLASSES =
  'inline-flex items-center justify-center rounded-full bg-black/70 p-2.5 text-fg opacity-0 backdrop-blur-sm transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 focus:opacity-100';

/**
 * Responsive 16:9 embed with a loading state, a theater toggle, a fullscreen toggle and an error state. Knows
 * nothing about TMDB, provider selection, or URL construction — it only renders the URL it's
 * given. See `src/services/playback` for where that URL comes from.
 */
export function VideoPlayer({
  src,
  title,
  autoplay = false,
  theater = false,
  onToggleTheater,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Bumping this remounts `PlayerFrame`, which is the only reliable way to retry a failed embed.
  const [attempt, setAttempt] = useState(0);

  const safeSrc = getSafeExternalUrl(src, ALLOWED_PLAYER_HOSTS);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
  };

  if (!safeSrc) {
    return (
      <div className="flex aspect-video w-full items-center justify-center overflow-hidden bg-surface sm:rounded-xl">
        <ErrorState compact title="This source can't be played" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative aspect-video w-full overflow-hidden bg-black sm:rounded-xl',
        // In theater the frame keeps to the screen's height and sits in the middle of the black band.
        theater && 'lg:mx-auto lg:max-h-[calc(100dvh-8.5rem)] lg:rounded-none',
      )}
    >
      <PlayerFrame
        key={`${safeSrc}:${attempt}`}
        src={safeSrc}
        title={title}
        autoplay={autoplay}
        onRetry={() => {
          setAttempt((n) => n + 1);
        }}
      />

      {/* Top right, so they never cover the player's own control bar along the bottom. */}
      <div className="absolute top-3 right-3 flex gap-2">
        {onToggleTheater ? (
          <button
            type="button"
            onClick={onToggleTheater}
            aria-pressed={theater}
            aria-label="Theater mode"
            title="Theater mode (t)"
            className={cn(CONTROL_CLASSES, 'max-lg:hidden', theater && 'text-accent')}
          >
            <RectangleHorizontal aria-hidden="true" className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className={CONTROL_CLASSES}
        >
          {isFullscreen ? (
            <Minimize2 aria-hidden="true" className="size-4" />
          ) : (
            <Maximize2 aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}
