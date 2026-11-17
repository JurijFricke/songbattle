import { z } from 'zod';

const spotifyIdSchema = z.string().regex(/^[A-Za-z0-9]{22}$/, 'Invalid Spotify ID');

export const spotifyEmbedSchema = z.object({
  provider: z.literal('spotify'),
  contentType: z.literal('track'),
  spotifyId: spotifyIdSchema,
  spotifyUri: z.string().regex(/^spotify:track:[A-Za-z0-9]{22}$/),
  embedUrl: z.url(),
});

export const songSchema = z.object({
  id: spotifyIdSchema,
  title: z.string().min(1),
  artists: z.array(z.string().min(1)).min(1),
  album: z.object({
    name: z.string().min(1),
    imageUrl: z.url().optional(),
  }),
  releaseDate: z.string().min(4).optional(),
  durationMs: z.number().int().nonnegative(),
  popularity: z.number().int().min(0).max(100),
  spotify: spotifyEmbedSchema,
});

export const sourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('random') }),
  z.object({ type: z.literal('decade'), decade: z.enum(['1970s', '1980s', '1990s', '2000s', '2010s', '2020s']) }),
  z.object({ type: z.literal('genre'), genre: z.string().trim().min(1).max(64) }),
  z.object({ type: z.literal('playlist'), playlistUrl: z.url() }),
]);

export const battleRequestSchema = z.object({
  count: z.coerce.number().int().min(16).max(256),
  source: sourceSchema,
});

export const battleResponseSchema = z.object({
  sessionId: z.string().uuid(),
  songs: z.array(songSchema),
  requestedCount: z.number().int(),
  effectiveCount: z.number().int(),
  warning: z.string().optional(),
});

export const voteRequestSchema = z.object({
  sessionId: z.string().uuid(),
  matchupNumber: z.number().int().positive(),
  winnerSongId: spotifyIdSchema,
  loserSongId: spotifyIdSchema,
});

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  uptimeSeconds: z.number().nonnegative(),
  database: z.object({ connected: z.boolean(), songCount: z.number().int().nonnegative() }),
  spotify: z.object({ configured: z.boolean(), authenticated: z.boolean() }),
});

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.number().int(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type SpotifyEmbed = z.infer<typeof spotifyEmbedSchema>;
export type Song = z.infer<typeof songSchema>;
export type BattleSource = z.infer<typeof sourceSchema>;
export type BattleRequest = z.infer<typeof battleRequestSchema>;
export type BattleResponse = z.infer<typeof battleResponseSchema>;
export type VoteRequest = z.infer<typeof voteRequestSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
