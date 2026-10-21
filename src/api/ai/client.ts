import { z } from 'zod';
import type { AiProvider, PickKind } from '@/types/settings';

/**
 * The browser's side of the "ask AI" relay (`server/aiProxy.ts`). The viewer's own key goes with
 * each request and nowhere else.
 */

export type AiErrorCode =
  | 'AI_BAD_REQUEST'
  | 'AI_KEY_REJECTED'
  | 'AI_MODEL_NOT_FOUND'
  | 'AI_RATE_LIMITED'
  | 'AI_UNREACHABLE'
  | 'AI_UPSTREAM_ERROR'
  | 'AI_BAD_RESPONSE'
  | 'AI_OFFLINE';

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export interface AiCredentials {
  provider: AiProvider;
  /** Blank means the provider's default model. */
  model: string;
  apiKey: string;
}

export interface AiPickRequest {
  kind: PickKind;
  mood?: string | undefined;
  prompt?: string | undefined;
  taste: string[];
  exclude: string[];
  count: number;
}

const picksResponseSchema = z.object({
  picks: z.array(
    z.object({
      title: z.string(),
      year: z.number().int().optional(),
      type: z.enum(['movie', 'tv']),
      reason: z.string(),
    }),
  ),
});

export type AiSuggestion = z.output<typeof picksResponseSchema>['picks'][number];

const errorSchema = z.object({ code: z.string().optional(), message: z.string().optional() });

const KNOWN_CODES: readonly AiErrorCode[] = [
  'AI_BAD_REQUEST',
  'AI_KEY_REJECTED',
  'AI_MODEL_NOT_FOUND',
  'AI_RATE_LIMITED',
  'AI_UNREACHABLE',
  'AI_UPSTREAM_ERROR',
  'AI_BAD_RESPONSE',
];

/** What the viewer sees for each failure. Never includes the key or the provider's own text. */
export function getAiErrorMessage(error: unknown): string {
  if (!(error instanceof AiError)) return 'The AI request failed. Try again.';
  switch (error.code) {
    case 'AI_KEY_REJECTED':
      return 'The provider rejected this API key. Check it in Settings.';
    case 'AI_MODEL_NOT_FOUND':
      return 'The provider does not know this model name. Check it in Settings, or clear it to use the default.';
    case 'AI_RATE_LIMITED':
      return 'The provider says to slow down, or the account is out of credit.';
    case 'AI_UNREACHABLE':
    case 'AI_OFFLINE':
      return 'Could not reach the AI provider. Check your connection and try again.';
    case 'AI_BAD_RESPONSE':
      return 'The AI gave an answer that could not be used. Try again.';
    default:
      return 'The AI request failed. Try again.';
  }
}

async function post(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/api/ai${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: signal ?? null,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AiError('AI_OFFLINE', 'offline');
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = undefined;
  }
  if (!response.ok) {
    const parsed = errorSchema.safeParse(data);
    const code = parsed.success ? parsed.data.code : undefined;
    const known = KNOWN_CODES.find((candidate) => candidate === code);
    throw new AiError(
      known ?? 'AI_UPSTREAM_ERROR',
      parsed.success ? (parsed.data.message ?? '') : '',
    );
  }
  return data;
}

/** Asks the AI for suggestions. They are only names: check them against TMDB before showing them. */
export async function requestAiPicks(
  credentials: AiCredentials,
  request: AiPickRequest,
  signal?: AbortSignal,
): Promise<AiSuggestion[]> {
  const data = await post('/picks', { ...credentials, request }, signal);
  const parsed = picksResponseSchema.safeParse(data);
  if (!parsed.success) throw new AiError('AI_BAD_RESPONSE', 'bad response');
  return parsed.data.picks;
}

/** Makes a tiny request to check the key and model work. Resolves with the model that answered. */
export async function testAiConnection(
  credentials: AiCredentials,
  signal?: AbortSignal,
): Promise<string> {
  const data = await post('/test', credentials, signal);
  const parsed = z.object({ model: z.string() }).safeParse(data);
  if (!parsed.success) throw new AiError('AI_BAD_RESPONSE', 'bad response');
  return parsed.data.model;
}
