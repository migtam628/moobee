import { describe, expect, it } from 'vitest';
import { TmdbError, type TmdbErrorKind } from '@/api/tmdb';
import { createQueryClient, shouldRetryQuery } from './queryClient';

const errorOf = (kind: TmdbErrorKind) => new TmdbError({ kind, message: kind });

describe('shouldRetryQuery', () => {
  it.each(['network', 'server', 'rate_limited'] as const)(
    'retries transient %s failures',
    (kind) => {
      expect(shouldRetryQuery(0, errorOf(kind))).toBe(true);
      expect(shouldRetryQuery(1, errorOf(kind))).toBe(true);
    },
  );

  it.each(['unauthorized', 'not_found', 'validation', 'not_configured', 'unknown'] as const)(
    'does not retry permanent %s failures',
    (kind) => {
      expect(shouldRetryQuery(0, errorOf(kind))).toBe(false);
    },
  );

  it('gives up after two retries', () => {
    expect(shouldRetryQuery(2, errorOf('network'))).toBe(false);
  });

  it('does not retry unknown thrown values', () => {
    expect(shouldRetryQuery(0, new Error('boom'))).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('caches for minutes and does not refetch on window focus', () => {
    const defaults = createQueryClient().getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(5 * 60_000);
    expect(defaults?.refetchOnWindowFocus).toBe(false);
  });
});
