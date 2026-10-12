import { env } from '@/config/env';
import { createEmbedProvider } from './embedProvider';
import { playbackProviderRegistry } from './providerRegistry';

/**
 * Registers the embed provider when `VITE_PLAYBACK_PROVIDER_BASE_URL` is set.
 * https is allowed for any host; http is allowed only for localhost and 127.0.0.1 so the local
 * MooBee Stream can be embedded. Unset, nothing registers and player pages show
 * "playback isn't available yet".
 *
 * `createEmbedProvider` builds `{base}/movie/{id}` and `{base}/tv/{id}/{season}/{episode}`.
 * Play buttons appear as soon as a base URL is configured. If that URL shape changes, adjust
 * `embedProvider.ts` — nothing else talks to a provider directly.
 */
if (env.playbackProviderBaseUrl) {
  playbackProviderRegistry.register(createEmbedProvider(env.playbackProviderBaseUrl));
}
