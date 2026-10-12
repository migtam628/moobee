/**
 * Public surface of the TMDB integration. Application code imports from here (or from
 * `./images`) and receives normalized `MediaItem` / `MediaPage` models only.
 */
export { getErrorMessage, isAbortError, TmdbError } from './errors';
export type { TmdbErrorKind } from './errors';
export * from './discover';
export * from './genres';
export * from './movies';
export * from './people';
export * from './trending';
export * from './tv';
export * from './search';
