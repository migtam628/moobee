import { Film, LogOut } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  getUploadSession,
  getUploadVideo,
  loginToUpload,
  logoutUpload,
  UploadApiError,
  uploadVideo,
  type UploadVideo,
} from '@/api/upload/client';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { paths } from '@/lib/routes';

type MediaType = 'movie' | 'tv';

interface FiledUpload {
  id: string;
  mediaType: MediaType;
  tmdbId: number;
  season?: number;
  episode?: number;
}

const fieldClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-fg outline-offset-2 placeholder:text-muted focus:border-accent/60';

function messageFrom(error: unknown): string {
  if (error instanceof UploadApiError) return error.message;
  return 'Something went wrong. Try again.';
}

function watchPath(upload: FiledUpload): string | undefined {
  if (upload.mediaType === 'movie') return paths.watchMovie(upload.tmdbId);
  if (upload.season === undefined || upload.episode === undefined) return undefined;
  return paths.watchTv(upload.tmdbId, upload.season, upload.episode);
}

/** `/upload`. Unlisted. Password gate, then a form that streams a file to MooBee Stream. */
export function UploadPage() {
  useDocumentTitle('Upload');
  const formId = useId();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [title, setTitle] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [tmdbId, setTmdbId] = useState('');
  const [imdbId, setImdbId] = useState('');
  const [slug, setSlug] = useState('');
  const [season, setSeason] = useState('1');
  const [episode, setEpisode] = useState('1');
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [filed, setFiled] = useState<FiledUpload | null>(null);
  const [video, setVideo] = useState<UploadVideo | null>(null);
  const [pollError, setPollError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getUploadSession(controller.signal)
      .then((session) => {
        setConfigured(session.configured);
        setAuthenticated(session.authenticated);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(messageFrom(error));
      });
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!filed) return undefined;
    const controller = new AbortController();
    let stopped = false;
    let timer = 0;

    const tick = () => {
      if (stopped) return;
      getUploadVideo(filed.id, controller.signal)
        .then((next) => {
          if (stopped) return;
          setVideo(next);
          setPollError('');
          if (next.status === 'ready' || next.status === 'failed') {
            stopped = true;
            window.clearInterval(timer);
          }
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || stopped) return;
          setPollError(messageFrom(error));
        });
    };

    tick();
    timer = window.setInterval(tick, 2000);
    return () => {
      stopped = true;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [filed]);

  const onLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    void loginToUpload(password)
      .then(() => {
        setAuthenticated(true);
        setPassword('');
      })
      .catch((error: unknown) => {
        setLoginError(messageFrom(error));
      })
      .finally(() => {
        setLoggingIn(false);
      });
  };

  const onLogout = () => {
    void logoutUpload().finally(() => {
      setAuthenticated(false);
      setFiled(null);
      setVideo(null);
      setPollError('');
    });
  };

  const onUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const trimmedTitle = title.trim();
    if (!file) {
      setFormError('Choose a video file.');
      return;
    }
    if (!trimmedTitle) {
      setFormError('Enter a title.');
      return;
    }
    if (!/^[1-9]\d{0,9}$/.test(tmdbId.trim())) {
      setFormError('Enter the TMDB id as a positive number.');
      return;
    }
    const parsedTmdbId = Number(tmdbId.trim());
    let parsedSeason: number | undefined;
    let parsedEpisode: number | undefined;
    if (mediaType === 'tv') {
      if (!/^\d{1,9}$/.test(season.trim()) || !/^[1-9]\d{0,9}$/.test(episode.trim())) {
        setFormError('TV uploads need a season number and an episode number.');
        return;
      }
      parsedSeason = Number(season.trim());
      parsedEpisode = Number(episode.trim());
    }

    const body = new FormData();
    body.set('file', file);
    body.set('title', trimmedTitle);
    body.set('mediaType', mediaType);
    body.set('tmdbId', String(parsedTmdbId));
    if (imdbId.trim()) body.set('imdbId', imdbId.trim());
    if (slug.trim()) body.set('slug', slug.trim());
    if (parsedSeason !== undefined && parsedEpisode !== undefined) {
      body.set('season', String(parsedSeason));
      body.set('episode', String(parsedEpisode));
    }

    setUploading(true);
    setFiled(null);
    setVideo(null);
    setPollError('');
    void uploadVideo(body)
      .then((accepted) => {
        setFiled({
          id: accepted.id,
          mediaType,
          tmdbId: parsedTmdbId,
          ...(parsedSeason !== undefined && parsedEpisode !== undefined
            ? { season: parsedSeason, episode: parsedEpisode }
            : {}),
        });
      })
      .catch((error: unknown) => {
        setFormError(messageFrom(error));
      })
      .finally(() => {
        setUploading(false);
      });
  };

  if (loadError) {
    return (
      <div className="page-gutter pt-28">
        <EmptyState icon={<Film className="size-10" />} title="Couldn't open uploads" description={loadError} />
      </div>
    );
  }

  if (configured === null) {
    return (
      <div className="page-gutter pt-28" role="status">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="page-gutter pt-28">
        <EmptyState
          icon={<Film className="size-10" />}
          title="Uploads aren't configured"
          description="Set UPLOAD_PAGE_PASSWORD, UPLOAD_SESSION_SECRET, and STREAM_ADMIN_API_KEY on the server, then restart."
        />
      </div>
    );
  }

  return (
    <div className="page-gutter pt-24 pb-12 sm:pt-28">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Upload</h1>
        <p className="mt-2 text-sm text-muted">
          Send a video you are allowed to host. The TMDB id is how watch pages find it.
        </p>

        {authenticated ? (
          <div className="mt-8">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted transition hover:text-fg"
              >
                <LogOut aria-hidden="true" className="size-4" />
                Log out
              </button>
            </div>

            <form onSubmit={onUpload} className="mt-4 space-y-4">
              <label className="block text-sm text-fg" htmlFor={`${formId}-file`}>
                Video file
                <input
                  id={`${formId}-file`}
                  className={`${fieldClass} mt-1.5 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-sm file:text-fg`}
                  type="file"
                  accept="video/*,.mp4,.mkv,.mov,.webm"
                  required
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                  }}
                />
              </label>

              <label className="block text-sm text-fg" htmlFor={`${formId}-title`}>
                Title
                <input
                  id={`${formId}-title`}
                  className={`${fieldClass} mt-1.5`}
                  value={title}
                  required
                  onChange={(event) => {
                    setTitle(event.target.value);
                  }}
                />
              </label>

              <label className="block text-sm text-fg" htmlFor={`${formId}-type`}>
                Media type
                <select
                  id={`${formId}-type`}
                  className={`${fieldClass} mt-1.5`}
                  value={mediaType}
                  onChange={(event) => {
                    setMediaType(event.target.value === 'tv' ? 'tv' : 'movie');
                  }}
                >
                  <option value="movie">Movie</option>
                  <option value="tv">TV episode</option>
                </select>
              </label>

              <label className="block text-sm text-fg" htmlFor={`${formId}-tmdb`}>
                TMDB id
                <input
                  id={`${formId}-tmdb`}
                  className={`${fieldClass} mt-1.5`}
                  inputMode="numeric"
                  required
                  value={tmdbId}
                  onChange={(event) => {
                    setTmdbId(event.target.value);
                  }}
                />
              </label>

              {mediaType === 'tv' ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm text-fg" htmlFor={`${formId}-season`}>
                    Season
                    <input
                      id={`${formId}-season`}
                      className={`${fieldClass} mt-1.5`}
                      inputMode="numeric"
                      required
                      value={season}
                      onChange={(event) => {
                        setSeason(event.target.value);
                      }}
                    />
                  </label>
                  <label className="block text-sm text-fg" htmlFor={`${formId}-episode`}>
                    Episode
                    <input
                      id={`${formId}-episode`}
                      className={`${fieldClass} mt-1.5`}
                      inputMode="numeric"
                      required
                      value={episode}
                      onChange={(event) => {
                        setEpisode(event.target.value);
                      }}
                    />
                  </label>
                </div>
              ) : null}

              <label className="block text-sm text-fg" htmlFor={`${formId}-imdb`}>
                IMDB id <span className="text-muted">(optional)</span>
                <input
                  id={`${formId}-imdb`}
                  className={`${fieldClass} mt-1.5`}
                  value={imdbId}
                  placeholder="tt0137523"
                  onChange={(event) => {
                    setImdbId(event.target.value);
                  }}
                />
              </label>

              <label className="block text-sm text-fg" htmlFor={`${formId}-slug`}>
                Slug <span className="text-muted">(optional)</span>
                <input
                  id={`${formId}-slug`}
                  className={`${fieldClass} mt-1.5`}
                  value={slug}
                  onChange={(event) => {
                    setSlug(event.target.value);
                  }}
                />
              </label>

              {formError ? (
                <p role="alert" className="text-sm text-red-300">
                  {formError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={uploading}
                className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </form>

            {filed ? (
              <section aria-live="polite" className="mt-8 rounded-xl border border-line bg-surface p-4 text-sm">
                <h2 className="font-semibold text-fg">Processing</h2>
                <p className="mt-2 text-muted">
                  Id <span className="text-fg">{filed.id}</span>
                </p>
                <p className="mt-1 text-muted">
                  Status <span className="text-fg">{video?.status ?? 'queued'}</span>
                  {video?.processing_stage ? ` · ${video.processing_stage}` : ''}
                  {typeof video?.processing_progress === 'number' ? ` · ${video.processing_progress}%` : ''}
                </p>
                {video?.error_message ? (
                  <p role="alert" className="mt-2 text-red-300">
                    {video.error_message}
                  </p>
                ) : null}
                {pollError ? (
                  <p role="alert" className="mt-2 text-red-300">
                    {pollError}
                  </p>
                ) : null}
                {video?.status === 'ready' && watchPath(filed) ? (
                  <Link
                    to={watchPath(filed) ?? paths.home}
                    className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
                  >
                    Watch
                  </Link>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : (
          <form onSubmit={onLogin} className="mt-8 space-y-4">
            <label className="block text-sm text-fg" htmlFor={`${formId}-password`}>
              Password
              <input
                id={`${formId}-password`}
                className={`${fieldClass} mt-1.5`}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
              />
            </label>
            {loginError ? (
              <p role="alert" className="text-sm text-red-300">
                {loginError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loggingIn}
              className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong disabled:opacity-60"
            >
              {loggingIn ? 'Checking…' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export const Component = UploadPage;
