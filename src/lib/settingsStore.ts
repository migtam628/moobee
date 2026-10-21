import type { AiProvider, AppSettings, PickCount, PickKind } from '@/types/settings';
import { readJSON, writeJSON } from './storage';

/**
 * App settings: a small `localStorage`-backed store read through `useSettings`, built like the
 * library store (external store, no provider, kept in step across tabs by the `storage` event).
 * Everything here stays in this browser. That includes the AI key: it is sent only with a request
 * to this site's own `/api/ai` relay, which forwards it to the provider and does not keep it.
 */

export const SETTINGS_STORAGE_KEY = 'moobee:settings:v1';

export const DEFAULT_SETTINGS: AppSettings = {
  ai: { provider: 'anthropic', model: '', apiKey: '' },
  surprise: { kind: 'any', count: 3, skipSeen: true, personalize: true },
};

const PROVIDERS: readonly AiProvider[] = ['anthropic', 'openai'];
const KINDS: readonly PickKind[] = ['any', 'movie', 'tv', 'anime'];
const COUNTS: readonly PickCount[] = [1, 3, 5];

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const pick = <T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.find((candidate) => candidate === value) ?? fallback;

const text = (value: unknown, fallback: string, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : fallback;

const flag = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

/** Turns whatever was stored into valid settings: unknown or broken values fall back to the defaults. */
export function normalizeSettings(value: unknown): AppSettings {
  const ai = record(record(value).ai);
  const surprise = record(record(value).surprise);
  const d = DEFAULT_SETTINGS;
  return {
    ai: {
      provider: pick(ai.provider, PROVIDERS, d.ai.provider),
      model: text(ai.model, d.ai.model, 80),
      apiKey: text(ai.apiKey, d.ai.apiKey, 400),
    },
    surprise: {
      kind: pick(surprise.kind, KINDS, d.surprise.kind),
      count: pick(surprise.count, COUNTS, d.surprise.count),
      skipSeen: flag(surprise.skipSeen, d.surprise.skipSeen),
      personalize: flag(surprise.personalize, d.surprise.personalize),
    },
  };
}

export type SettingsPatch = {
  [Section in keyof AppSettings]?: Partial<AppSettings[Section]>;
};

type Listener = () => void;

class SettingsStore {
  private snapshot: AppSettings = normalizeSettings(readJSON(SETTINGS_STORAGE_KEY, undefined));
  private readonly listeners = new Set<Listener>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== SETTINGS_STORAGE_KEY && event.key !== null) return;
    this.snapshot = normalizeSettings(readJSON(SETTINGS_STORAGE_KEY, undefined));
    this.notify();
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): AppSettings => this.snapshot;

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  /** Merges `patch` into the current settings and saves. A blocked store still updates this session. */
  update = (patch: SettingsPatch): void => {
    this.snapshot = normalizeSettings({
      ai: { ...this.snapshot.ai, ...patch.ai },
      surprise: { ...this.snapshot.surprise, ...patch.surprise },
    });
    writeJSON(SETTINGS_STORAGE_KEY, this.snapshot);
    this.notify();
  };

  /** Back to the defaults, which also forgets the AI key. */
  reset = (): void => {
    this.snapshot = DEFAULT_SETTINGS;
    writeJSON(SETTINGS_STORAGE_KEY, this.snapshot);
    this.notify();
  };

  /** Test-only: re-reads the settings from `localStorage` (see `libraryStore.resetForTests`). */
  resetForTests = (): void => {
    this.snapshot = normalizeSettings(readJSON(SETTINGS_STORAGE_KEY, undefined));
    this.notify();
  };
}

export const settingsStore = new SettingsStore();
