import 'dotenv/config';

const integerEnvironment = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
};

export const config = {
  nodeEnvironment: process.env.NODE_ENV ?? 'development',
  port: integerEnvironment('PORT', 3001),
  rateLimitWindowMs: integerEnvironment('RATE_LIMIT_WINDOW_MS', 60_000),
  rateLimitMaxRequests: integerEnvironment('RATE_LIMIT_MAX_REQUESTS', 60),
  songCacheMaxSize: integerEnvironment('SONG_POOL_MAX_SIZE', 20_000),
  playlistCacheTtlMs: integerEnvironment('SONG_CACHE_TTL_SECONDS', 86_400) * 1000,
  spotifyMaxAttempts: integerEnvironment('SPOTIFY_MAX_ATTEMPTS', 3),
  spotifyMaxRetryDelayMs: integerEnvironment('SPOTIFY_MAX_RETRY_DELAY_SECONDS', 10) * 1000,
} as const;
