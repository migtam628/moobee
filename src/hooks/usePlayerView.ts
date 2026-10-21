import { useCallback, useEffect, useState } from 'react';
import { readJSON, writeJSON } from '@/lib/storage';

const STORAGE_KEY = 'moobee:player-theater:v1';

/** True while the focus is somewhere the viewer is typing, so a shortcut key must not fire. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/**
 * Persisted "theater mode" for the player pages (the wide player of a video site, as opposed to
 * the default player-beside-the-list view), plus its `t` keyboard shortcut. Returns the current
 * value and a toggle.
 */
export function usePlayerView(): [boolean, () => void] {
  const [theater, setTheater] = useState<boolean>(() => readJSON(STORAGE_KEY, false));

  const toggle = useCallback(() => {
    setTheater((current) => !current);
  }, []);

  useEffect(() => {
    writeJSON(STORAGE_KEY, theater);
  }, [theater]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 't') return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (isTypingTarget(event.target)) return;
      toggle();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [toggle]);

  return [theater, toggle];
}
