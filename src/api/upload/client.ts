import { z } from 'zod';

/** Same-origin upload API. The admin key and password never leave the server. */

const sessionSchema = z.object({
  authenticated: z.boolean(),
  configured: z.boolean(),
});

const acceptedSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  status: z.string().min(1),
  statusUrl: z.string().optional(),
});

const videoSchema = z
  .object({
    id: z.string().optional(),
    status: z.string(),
    processing_stage: z.string().nullable().optional(),
    processing_progress: z.number().nullable().optional(),
    error_message: z.string().nullable().optional(),
  })
  .passthrough();

export type UploadSession = z.infer<typeof sessionSchema>;
export type UploadAccepted = z.infer<typeof acceptedSchema>;
export type UploadVideo = z.infer<typeof videoSchema>;

export class UploadApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'UploadApiError';
    this.status = status;
  }
}

async function errorFrom(response: Response): Promise<UploadApiError> {
  let message = 'Request failed.';
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error.trim()) message = body.error;
  } catch {
    // Non-JSON bodies still surface as a status error.
  }
  return new UploadApiError(message, response.status);
}

async function parse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  if (!response.ok) throw await errorFrom(response);
  const json: unknown = await response.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new UploadApiError('Unexpected response from the upload service.', response.status);
  return parsed.data;
}

export function getUploadSession(signal?: AbortSignal): Promise<UploadSession> {
  return fetch('/api/upload/session', { headers: { accept: 'application/json' }, signal }).then((response) =>
    parse(response, sessionSchema),
  );
}

export async function loginToUpload(password: string): Promise<void> {
  const response = await fetch('/api/upload/login', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw await errorFrom(response);
}

export async function logoutUpload(): Promise<void> {
  const response = await fetch('/api/upload/logout', {
    method: 'POST',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw await errorFrom(response);
}

export function uploadVideo(body: FormData, signal?: AbortSignal): Promise<UploadAccepted> {
  return fetch('/api/upload/videos', {
    method: 'POST',
    headers: { accept: 'application/json' },
    body,
    signal,
  }).then((response) => parse(response, acceptedSchema));
}

export function getUploadVideo(id: string, signal?: AbortSignal): Promise<UploadVideo> {
  return fetch(`/api/upload/videos/${encodeURIComponent(id)}`, {
    headers: { accept: 'application/json' },
    signal,
  }).then((response) => parse(response, videoSchema));
}
