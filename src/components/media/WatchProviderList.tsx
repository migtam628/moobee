import { ExternalLink } from 'lucide-react';
import { useId } from 'react';
import { getLogoUrl } from '@/api/tmdb/images';
import { getSafeExternalUrl } from '@/lib/url';
import type { WatchProvider, WatchProviders } from '@/types/media';

/** Hosts the "full availability" link may point to (TMDB forwards to JustWatch from here). */
const ALLOWED_LINK_HOSTS = ['www.themoviedb.org'] as const;

interface ProviderGroupProps {
  label: string;
  providers: readonly WatchProvider[];
}

function ProviderGroup({ label, providers }: ProviderGroupProps) {
  if (providers.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-muted uppercase">{label}</h3>
      <ul className="flex flex-wrap gap-3">
        {providers.map((provider) => {
          const logo = getLogoUrl(provider.logoPath, 'w92');
          return (
            <li key={provider.id} className="flex items-center gap-2.5 text-sm text-fg">
              {logo ? (
                <img
                  src={logo}
                  alt=""
                  width={36}
                  height={36}
                  loading="lazy"
                  decoding="async"
                  className="size-9 rounded-lg ring-1 ring-line"
                />
              ) : null}
              <span>{provider.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface WatchProviderListProps {
  providers: WatchProviders | undefined;
  className?: string;
}

/**
 * "Where to watch" for the configured region. Data is supplied by JustWatch via TMDB, and the
 * attribution below is a condition of using it, so keep it visible.
 */
export function WatchProviderList({ providers, className }: WatchProviderListProps) {
  const headingId = useId();
  const hasAny =
    providers !== undefined &&
    providers.subscription.length +
      providers.free.length +
      providers.rent.length +
      providers.buy.length >
      0;
  const link = getSafeExternalUrl(providers?.link, ALLOWED_LINK_HOSTS);

  return (
    <section aria-labelledby={headingId} className={className}>
      <h2 id={headingId} className="mb-4 text-lg font-semibold tracking-tight text-fg sm:text-xl">
        Where to watch
      </h2>

      {providers && hasAny ? (
        <div className="space-y-5">
          <ProviderGroup label="Stream" providers={providers.subscription} />
          <ProviderGroup label="Free" providers={providers.free} />
          <ProviderGroup label="Rent" providers={providers.rent} />
          <ProviderGroup label="Buy" providers={providers.buy} />
        </div>
      ) : (
        <p className="text-sm text-muted">
          No streaming information is available for your region yet.
        </p>
      )}

      <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>
          {providers ? `Availability in ${providers.region}. ` : ''}
          Data provided by JustWatch.
        </span>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-fg underline-offset-4 hover:underline"
          >
            All options
            <ExternalLink aria-hidden="true" className="size-3" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : null}
      </p>
    </section>
  );
}
