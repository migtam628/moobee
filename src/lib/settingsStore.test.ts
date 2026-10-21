import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  SETTINGS_STORAGE_KEY,
  settingsStore,
} from './settingsStore';

afterEach(() => {
  window.localStorage.clear();
  settingsStore.resetForTests();
});

describe('normalizeSettings', () => {
  it('gives the defaults for nothing or for junk', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('x')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ ai: 5, surprise: [] })).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and replaces invalid ones one by one', () => {
    const result = normalizeSettings({
      ai: { provider: 'openai', model: '  gpt-4o  ', apiKey: ' sk-abc ' },
      surprise: { kind: 'anime', count: 7, skipSeen: 'yes', personalize: false },
    });
    expect(result.ai).toEqual({ provider: 'openai', model: 'gpt-4o', apiKey: 'sk-abc' });
    expect(result.surprise).toEqual({
      kind: 'anime',
      count: 3,
      skipSeen: true,
      personalize: false,
    });
  });

  it('bounds the text', () => {
    const result = normalizeSettings({ ai: { model: 'm'.repeat(500), apiKey: 'k'.repeat(900) } });
    expect(result.ai.model).toHaveLength(80);
    expect(result.ai.apiKey).toHaveLength(400);
  });
});

describe('settingsStore', () => {
  it('starts from the defaults', () => {
    expect(settingsStore.getSnapshot()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges a patch, saves it, and tells listeners', () => {
    const listener = vi.fn();
    const unsubscribe = settingsStore.subscribe(listener);

    settingsStore.update({ ai: { apiKey: 'sk-test-12345678' }, surprise: { count: 5 } });

    expect(settingsStore.getSnapshot().ai).toEqual({
      provider: 'anthropic',
      model: '',
      apiKey: 'sk-test-12345678',
    });
    expect(settingsStore.getSnapshot().surprise.count).toBe(5);
    expect(settingsStore.getSnapshot().surprise.skipSeen).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}')).toMatchObject({
      ai: { apiKey: 'sk-test-12345678' },
    });

    unsubscribe();
    settingsStore.update({ surprise: { count: 1 } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('refuses an invalid value instead of storing it', () => {
    settingsStore.update({ surprise: { count: 9 as never, kind: 'music' as never } });
    expect(settingsStore.getSnapshot().surprise).toEqual(DEFAULT_SETTINGS.surprise);
  });

  it('reset goes back to the defaults and forgets the key', () => {
    settingsStore.update({ ai: { apiKey: 'sk-test-12345678' } });
    settingsStore.reset();
    expect(settingsStore.getSnapshot()).toEqual(DEFAULT_SETTINGS);
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).not.toContain('sk-test');
  });

  it('follows a change made in another tab', () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ai: { provider: 'openai' } }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: SETTINGS_STORAGE_KEY }));
    expect(settingsStore.getSnapshot().ai.provider).toBe('openai');
  });
});
