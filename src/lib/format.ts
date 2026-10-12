/** "2h 19m", "45m", "2h". Returns undefined for missing or non-positive runtimes. */
export function formatRuntime(minutes: number | undefined): string | undefined {
  if (minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) return undefined;
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** "2008–2013" for finished shows, "2019–" while airing, "2019" for a single year. */
export function formatYearRange(
  startYear: number | undefined,
  endYear: number | undefined,
  inProduction: boolean | undefined,
): string | undefined {
  if (startYear === undefined) return undefined;
  if (endYear !== undefined && endYear !== startYear) return `${startYear}–${endYear}`;
  if (inProduction) return `${startYear}–`;
  return String(startYear);
}

export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

const AIR_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  // Both parsed AND rendered as UTC: a date-only ISO string has no time component, so treating
  // it as anything but UTC on either end risks shifting the calendar date the viewer sees by a
  // day depending on their local time zone.
  timeZone: 'UTC',
});

/** "YYYY-MM-DD" -> "Sep 21, 2026". Returns undefined for a missing or unparsable date. */
export function formatAirDate(isoDate: string | undefined): string | undefined {
  if (!isoDate) return undefined;
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return AIR_DATE_FORMATTER.format(date);
}
