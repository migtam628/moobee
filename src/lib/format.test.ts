import { describe, expect, it } from 'vitest';
import { formatAirDate, formatRuntime, formatYearRange, pluralize } from './format';

describe('formatRuntime', () => {
  it.each([
    [139, '2h 19m'],
    [120, '2h'],
    [45, '45m'],
    [59.6, '1h'],
  ])('formats %s minutes as %s', (minutes, expected) => {
    expect(formatRuntime(minutes)).toBe(expected);
  });

  it.each([undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    'returns undefined for %s',
    (value) => {
      expect(formatRuntime(value)).toBeUndefined();
    },
  );
});

describe('formatYearRange', () => {
  it('shows a range for finished shows', () => {
    expect(formatYearRange(2008, 2013, false)).toBe('2008–2013');
  });
  it('shows an open range while airing', () => {
    expect(formatYearRange(2019, undefined, true)).toBe('2019–');
  });
  it('shows a single year otherwise', () => {
    expect(formatYearRange(2019, undefined, false)).toBe('2019');
    expect(formatYearRange(2019, 2019, false)).toBe('2019');
  });
  it('is undefined without a start year', () => {
    expect(formatYearRange(undefined, 2013, false)).toBeUndefined();
  });
});

describe('pluralize', () => {
  it('pluralizes by count', () => {
    expect(pluralize(1, 'season')).toBe('1 season');
    expect(pluralize(0, 'season')).toBe('0 seasons');
    expect(pluralize(5, 'result')).toBe('5 results');
  });
});

describe('formatAirDate', () => {
  it('formats an ISO date as a short, readable date', () => {
    expect(formatAirDate('2026-09-21')).toBe('Sep 21, 2026');
  });

  it('never shifts a day for the viewer’s time zone', () => {
    // A date-only ISO string is parsed as UTC midnight; a viewer west of UTC must still see the
    // same calendar date TMDB reported, not the previous day.
    expect(formatAirDate('2026-01-01')).toBe('Jan 1, 2026');
  });

  it.each([undefined, '', 'not-a-date', '2026-13-40'])('returns undefined for %j', (value) => {
    expect(formatAirDate(value)).toBeUndefined();
  });
});
