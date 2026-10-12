import { Play } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getBackdropSrcSet, getBackdropUrl } from '@/api/tmdb/images';
import { FavoriteButton } from '@/components/media/FavoriteButton';
import { PosterImage } from '@/components/media/PosterImage';
import { RatingBadge } from '@/components/media/RatingBadge';
import { TrailerModal } from '@/components/media/TrailerModal';
import { WatchlistButton } from '@/components/media/WatchlistButton';
import { getFacts, getMetaItems } from '@/lib/details';
import { getWatchPath } from '@/lib/routes';
import { playbackProviderRegistry } from '@/services/playback/providerRegistry';
import type { MediaDetails } from '@/types/media';

const POSTER_SIZES =
  '(min-width: 1024px) 288px, (min-width: 768px) 256px, (min-width: 640px) 208px, 160px';
const voteFormatter = new Intl.NumberFormat('en-US');

interface DetailsHeroProps {
  details: MediaDetails;
}

/** Backdrop, poster and headline facts for a movie or show. */
export function DetailsHero({ details }: DetailsHeroProps) {
  const [trailerOpen, setTrailerOpen] = useState(false);
  const backdropSrc = getBackdropUrl(details.backdropPath, 'w1280');
  const backdropSrcSet = getBackdropSrcSet(details.backdropPath);
  const metaItems = getMetaItems(details);
  const facts = getFacts(details);
  // No provider is registered yet (see src/services/playback), so this is always undefined today
  // — the button below only appears once one is, with no further wiring needed here.
  const watchHref = playbackProviderRegistry.hasAnyProvider() ? getWatchPath(details) : undefined;

  return (
    <section aria-labelledby="details-title" className="relative isolate overflow-hidden">
      {/* The backdrop is atmosphere only; it fades into the page so text never sits on a busy image. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[34rem] sm:h-[42rem]">
        {backdropSrc ? (
          <img
            src={backdropSrc}
            {...(backdropSrcSet ? { srcSet: backdropSrcSet, sizes: '100vw' } : {})}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="size-full animate-fade-in object-cover object-[center_20%]"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-raised to-surface" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/70 to-canvas/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-canvas/80 via-transparent to-transparent" />
      </div>

      <div className="flex page-gutter flex-col gap-8 pt-28 pb-8 sm:pt-36 md:flex-row md:gap-10 lg:gap-14 lg:pt-44">
        <div className="w-40 shrink-0 sm:w-52 md:w-64 lg:w-72">
          <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-raised shadow-2xl ring-1 shadow-black/60 ring-white/10">
            <PosterImage
              item={details}
              priority
              alt={`Poster for ${details.title}`}
              sizes={POSTER_SIZES}
            />
          </div>
        </div>

        <div className="max-w-3xl min-w-0 flex-1 animate-fade-up">
          <h1
            id="details-title"
            className="text-3xl leading-tight font-bold tracking-tight text-balance text-fg sm:text-4xl lg:text-5xl"
          >
            {details.title}
          </h1>

          {details.tagline ? (
            <p className="mt-2 text-base text-fg/70 italic sm:text-lg">{details.tagline}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-fg/80">
            {details.certification ? (
              <span className="rounded border border-white/30 px-1.5 py-0.5 text-xs font-semibold text-fg">
                <span className="sr-only">Rated </span>
                {details.certification}
              </span>
            ) : null}
            {metaItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <RatingBadge rating={details.rating} size="md" />
            {details.rating !== undefined && details.voteCount ? (
              <span className="text-sm text-muted">
                {voteFormatter.format(details.voteCount)} votes on TMDB
              </span>
            ) : null}
          </div>

          {details.genres.length > 0 ? (
            <ul aria-label="Genres" className="mt-4 flex flex-wrap gap-2">
              {details.genres.map((genre) => (
                <li
                  key={genre.id}
                  className="rounded-full border border-line bg-white/5 px-3 py-1 text-xs font-medium text-fg/90"
                >
                  {genre.name}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {watchHref ? (
              <Link
                to={watchHref}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong"
              >
                <Play aria-hidden="true" className="size-4 fill-current" />
                Play
              </Link>
            ) : null}
            {details.trailer ? (
              <button
                type="button"
                onClick={() => {
                  setTrailerOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong"
              >
                <Play aria-hidden="true" className="size-4 fill-current" />
                Watch trailer
              </button>
            ) : null}
            <WatchlistButton item={details} />
            <FavoriteButton item={details} />
          </div>

          <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted uppercase">
            Overview
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg/85 sm:text-base">
            {details.overview || 'No overview is available for this title yet.'}
          </p>

          {facts.length > 0 ? (
            <dl className="mt-6 grid max-w-2xl grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {facts.map((fact) => (
                <div key={fact.label} className="contents">
                  <dt className="text-muted">{fact.label}</dt>
                  <dd className="text-fg">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>

      {trailerOpen && details.trailer ? (
        <TrailerModal
          video={details.trailer}
          mediaTitle={details.title}
          onClose={() => {
            setTrailerOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
