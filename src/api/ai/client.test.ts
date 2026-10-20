import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '@/test/fixtures';
import {
  AiError,
  getAiErrorMessage,
  requestAiPicks,
  testAiConnection,
  type AiCredentials,
  type AiPickRequest,
} from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

const credentials: AiCredentials = { provider: 'anthropic', model: '', apiKey: 'sk-test-12345678' };
const request: AiPickRequest = { kind: 'any', taste: [], exclude: [], count: 3 };

describe('requestAiPicks', () => {
  it('posts the key and the request to the relay and returns the suggestions', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        picks: [{ title: 'Heat', year: 1995, type: 'movie', reason: 'Cat and mouse.' }],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const picks = await requestAiPicks(credentials, request);

    expect(picks).toEqual([{ title: 'Heat', year: 1995, type: 'movie', reason: 'Cat and mouse.' }]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/ai/picks');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ ...credentials, request });
  });

  it('turns the relay’s error codes into AiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ code: 'AI_KEY_REJECTED', message: 'no' }, { status: 401 }),
        ),
    );
    await expect(requestAiPicks(credentials, request)).rejects.toMatchObject({
      name: 'AiError',
      code: 'AI_KEY_REJECTED',
    });
  });

  it('treats an unknown code or a non-JSON error as a provider problem', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 500 })));
    await expect(requestAiPicks(credentials, request)).rejects.toMatchObject({
      code: 'AI_UPSTREAM_ERROR',
    });
  });

  it('reports an unusable answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ picks: [{ title: 5 }] })));
    await expect(requestAiPicks(credentials, request)).rejects.toMatchObject({
      code: 'AI_BAD_RESPONSE',
    });
  });

  it('reports being offline, but lets an abort through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(requestAiPicks(credentials, request)).rejects.toMatchObject({
      code: 'AI_OFFLINE',
    });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('x', 'AbortError')));
    await expect(requestAiPicks(credentials, request)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

describe('testAiConnection', () => {
  it('resolves with the model that answered', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, model: 'claude-x' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(testAiConnection(credentials)).resolves.toBe('claude-x');
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe('/api/ai/test');
  });
});

describe('getAiErrorMessage', () => {
  it.each([
    ['AI_KEY_REJECTED', /rejected this API key/],
    ['AI_MODEL_NOT_FOUND', /model name/],
    ['AI_RATE_LIMITED', /slow down/],
    ['AI_OFFLINE', /Could not reach/],
    ['AI_BAD_RESPONSE', /could not be used/],
    ['AI_UPSTREAM_ERROR', /failed/],
  ] as const)('explains %s', (code, pattern) => {
    expect(getAiErrorMessage(new AiError(code, 'x'))).toMatch(pattern);
  });

  it('never repeats the server’s own text, and copes with other errors', () => {
    expect(getAiErrorMessage(new AiError('AI_KEY_REJECTED', 'sk-secret-key'))).not.toContain(
      'sk-secret-key',
    );
    expect(getAiErrorMessage(new Error('boom'))).toMatch(/failed/);
  });
});
