/** Normalizes the argument types fetch() accepts into a plain URL string. */
export function toUrlString(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}
