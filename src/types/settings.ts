/** Which AI company's API the viewer's key belongs to. */
export type AiProvider = 'anthropic' | 'openai';

/** What a random pick may be. "anime" is Japanese animation (movies and series). */
export type PickKind = 'any' | 'movie' | 'tv' | 'anime';

/** How many picks one tap deals. */
export type PickCount = 1 | 3 | 5;

export interface AiSettings {
  provider: AiProvider;
  /** Empty means the provider's default model. */
  model: string;
  /** The viewer's own key. Kept in this browser only. Empty means no AI. */
  apiKey: string;
}

export interface SurpriseSettings {
  /** What "Surprise me" starts on. */
  kind: PickKind;
  count: PickCount;
  /** Leave out titles already in My List, favorites or recently viewed. */
  skipSeen: boolean;
  /** Tell the AI what is in My List and favorites so it can match the taste. */
  personalize: boolean;
}

export interface AppSettings {
  ai: AiSettings;
  surprise: SurpriseSettings;
}
