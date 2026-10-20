import { AiSettings } from '@/components/settings/AiSettings';
import { SettingRow, SettingsSection } from '@/components/settings/SettingsSection';
import { AutoplayToggle } from '@/components/player/AutoplayToggle';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { Switch } from '@/components/ui/Switch';
import { useAutoplayPreference } from '@/hooks/useAutoplayPreference';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLibrary } from '@/hooks/useLibrary';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/cn';
import { pluralize } from '@/lib/format';
import type { PickCount, PickKind } from '@/types/settings';

const KIND_OPTIONS: readonly { id: PickKind; label: string }[] = [
  { id: 'any', label: 'Anything' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'Series' },
  { id: 'anime', label: 'Anime' },
];

const COUNT_OPTIONS: readonly PickCount[] = [1, 3, 5];

/** `/settings`. The AI key and the other preferences, all kept in this browser. */
export function SettingsPage() {
  useDocumentTitle('Settings');
  const { settings, update, reset } = useSettings();
  const [autoplay, setAutoplay] = useAutoplayPreference();
  const {
    watchlist,
    favorites,
    recentlyViewed,
    clearWatchlist,
    clearFavorites,
    clearRecentlyViewed,
  } = useLibrary();
  const { surprise } = settings;

  return (
    <div className="page-gutter pt-24 pb-12 sm:pt-32">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Settings</h1>
        <p className="mt-2 text-muted">Saved in this browser only.</p>
      </header>

      <div className="mt-8 max-w-3xl space-y-6">
        <SettingsSection
          title="AI"
          description="Add your own API key to let Surprise me choose with AI, with a reason for every pick. Without a key everything still works, with random picks."
        >
          <AiSettings />
        </SettingsSection>

        <SettingsSection title="Surprise me">
          <SettingRow label="Start on" hint="What the page picks from when you open it.">
            <div role="group" aria-label="Start on" className="flex flex-wrap gap-2">
              {KIND_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={surprise.kind === id}
                  onClick={() => {
                    update({ surprise: { kind: id } });
                  }}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    surprise.kind === id
                      ? 'bg-fg text-canvas'
                      : 'bg-white/10 text-fg hover:bg-white/15',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Picks at a time" hint="Three gives you a choice without a long list.">
            <div role="group" aria-label="Picks at a time" className="flex gap-2">
              {COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={surprise.count === count}
                  onClick={() => {
                    update({ surprise: { count } });
                  }}
                  className={cn(
                    'size-9 rounded-full text-sm font-semibold transition',
                    surprise.count === count
                      ? 'bg-fg text-canvas'
                      : 'bg-white/10 text-fg hover:bg-white/15',
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow
            label="Skip what I already know"
            hint="Leave out titles in My List, Favorites and Recently Viewed."
            htmlFor="skip-seen"
          >
            <Switch
              checked={surprise.skipSeen}
              onChange={(skipSeen) => {
                update({ surprise: { skipSeen } });
              }}
              label="Skip what I already know"
            />
          </SettingRow>

          <SettingRow
            label="Match my taste (AI)"
            hint="Tell the AI the titles in your My List and Favorites. Only used when you ask AI to choose."
          >
            <Switch
              checked={surprise.personalize}
              onChange={(personalize) => {
                update({ surprise: { personalize } });
              }}
              label="Match my taste"
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="Playback">
          <SettingRow label="Autoplay" hint="Start the video as soon as a player page opens.">
            <AutoplayToggle autoplay={autoplay} onChange={setAutoplay} />
          </SettingRow>
        </SettingsSection>

        <SettingsSection
          title="Your lists"
          description="Kept in this browser. Clearing cannot be undone."
        >
          <SettingRow label="Watchlist" hint={pluralize(watchlist.length, 'title')}>
            <ConfirmButton
              confirmLabel="Click again to clear"
              onConfirm={clearWatchlist}
              disabled={watchlist.length === 0}
            >
              Clear watchlist
            </ConfirmButton>
          </SettingRow>
          <SettingRow label="Favorites" hint={pluralize(favorites.length, 'title')}>
            <ConfirmButton
              confirmLabel="Click again to clear"
              onConfirm={clearFavorites}
              disabled={favorites.length === 0}
            >
              Clear favorites
            </ConfirmButton>
          </SettingRow>
          <SettingRow label="Recently viewed" hint={pluralize(recentlyViewed.length, 'title')}>
            <ConfirmButton
              confirmLabel="Click again to clear"
              onConfirm={clearRecentlyViewed}
              disabled={recentlyViewed.length === 0}
            >
              Clear history
            </ConfirmButton>
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="Reset">
          <SettingRow
            label="Reset settings"
            hint="Back to the defaults. This also removes your AI key. Your lists are not touched."
          >
            <ConfirmButton confirmLabel="Click again to reset" onConfirm={reset}>
              Reset settings
            </ConfirmButton>
          </SettingRow>
        </SettingsSection>
      </div>
    </div>
  );
}

export const Component = SettingsPage;
