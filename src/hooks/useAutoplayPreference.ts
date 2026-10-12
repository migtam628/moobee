import { useCallback, useState } from 'react';
import { readJSON, writeJSON } from '@/lib/storage';

const STORAGE_KEY = 'moobee:autoplay:v1';

/** Persisted "autoplay next episode" preference, defaulting on (the common streaming default). */
export function useAutoplayPreference(): [boolean, (next: boolean) => void] {
  const [autoplay, setAutoplayState] = useState<boolean>(() => readJSON(STORAGE_KEY, true));

  const setAutoplay = useCallback((next: boolean) => {
    setAutoplayState(next);
    writeJSON(STORAGE_KEY, next);
  }, []);

  return [autoplay, setAutoplay];
}
