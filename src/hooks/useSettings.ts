import { useSyncExternalStore } from 'react';
import { settingsStore, type SettingsPatch } from '@/lib/settingsStore';
import type { AppSettings } from '@/types/settings';

export interface UseSettingsResult {
  settings: AppSettings;
  /** True once the viewer has saved an AI key, which is what turns the AI features on. */
  hasAiKey: boolean;
  update: (patch: SettingsPatch) => void;
  reset: () => void;
}

/** Reactive view of the app settings (`settingsStore`). Needs no provider. */
export function useSettings(): UseSettingsResult {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);
  return {
    settings,
    hasAiKey: settings.ai.apiKey.length > 0,
    update: settingsStore.update,
    reset: settingsStore.reset,
  };
}
