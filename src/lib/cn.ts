/** Joins class names, skipping falsy values. Tiny stand-in for clsx; no dependency needed. */
export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}
