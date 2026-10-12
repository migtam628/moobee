import { afterEach, describe, expect, it, vi } from 'vitest';
import { readJSON, removeItem, writeJSON } from './storage';

describe('storage', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('round-trips a value through write and read', () => {
    expect(writeJSON('k', { a: 1 })).toBe(true);
    expect(readJSON('k', null)).toEqual({ a: 1 });
  });

  it('returns the fallback for a missing key', () => {
    expect(readJSON('missing', 'fallback')).toBe('fallback');
  });

  it('returns the fallback for corrupt JSON instead of throwing', () => {
    window.localStorage.setItem('k', '{not json');
    expect(readJSON('k', 'fallback')).toBe('fallback');
  });

  it('removes a key', () => {
    writeJSON('k', 1);
    removeItem('k');
    expect(readJSON('k', 'gone')).toBe('gone');
  });

  it('never throws when localStorage.setItem fails (e.g. a full quota)', () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded');
    });
    expect(writeJSON('k', 1)).toBe(false);
    spy.mockRestore();
  });

  it('never throws when localStorage.getItem fails (e.g. blocked by privacy settings)', () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    expect(readJSON('k', 'fallback')).toBe('fallback');
    spy.mockRestore();
  });

  it('never throws when localStorage.removeItem fails', () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    expect(() => {
      removeItem('k');
    }).not.toThrow();
    spy.mockRestore();
  });
});
