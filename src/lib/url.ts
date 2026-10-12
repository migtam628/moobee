const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Returns the URL if it is on an allowed host and safe to navigate to, otherwise undefined.
 * https is required for every public host. http is accepted only for loopback hosts that are
 * also on the allowlist, so the local stream player can be embedded. Blocks `javascript:` URLs
 * and look-alike hosts.
 */
export function getSafeExternalUrl(
  value: string | null | undefined,
  allowedHosts: readonly string[],
): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const https = url.protocol === 'https:';
    const loopbackHttp = url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
    if (!https && !loopbackHttp) return undefined;
    if (!allowedHosts.includes(url.hostname)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
