import type { AiProvider } from '@/types/settings';

/**
 * What the Settings page shows about each AI provider. The default models must match
 * `AI_PROVIDERS` in `server/aiProxy.ts`, which is what the relay uses when the model is blank.
 */
export const AI_PROVIDER_INFO: Record<
  AiProvider,
  { label: string; defaultModel: string; keyUrl: string; keyExample: string }
> = {
  anthropic: {
    label: 'Anthropic (Claude)',
    defaultModel: 'claude-haiku-5-5',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyExample: 'sk-ant-…',
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyExample: 'sk-…',
  },
};
