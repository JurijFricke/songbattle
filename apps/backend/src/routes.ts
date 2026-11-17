import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import {
  battleRequestSchema,
  errorResponseSchema,
  sourceSchema,
  voteRequestSchema,
} from '@songbattle/contracts';
import {
  completeBattleSession,
  createBattleSession,
  getLeaderboard,
  getSongCount,
  getSongStats,
  recordBattleVote,
} from './database/repository.js';
import { SpotifyApiError } from './spotify/client.js';
import { resolveBattleSongs, spotifyClient } from './services/song-service.js';

const battleQuerySchema = z.object({
  count: z.coerce.number().int().refine((value) => [16, 32, 64, 128, 256].includes(value), 'Invalid bracket size.'),
  playlistUrl: z.url().optional(),
  decade: z.enum(['1970s', '1980s', '1990s', '2000s', '2010s', '2020s']).optional(),
  genre: z.string().trim().min(1).max(64).optional(),
}).superRefine((query, context) => {
  const selectedSources = [query.playlistUrl, query.decade, query.genre].filter(Boolean);
  if (selectedSources.length > 1) {
    context.addIssue({ code: 'custom', message: 'Choose only one of playlistUrl, decade, or genre.' });
  }
});

const sourceFromQuery = (query: z.infer<typeof battleQuerySchema>) => {
  if (query.playlistUrl) return sourceSchema.parse({ type: 'playlist', playlistUrl: query.playlistUrl });
  if (query.decade) return sourceSchema.parse({ type: 'decade', decade: query.decade });
  if (query.genre) return sourceSchema.parse({ type: 'genre', genre: query.genre });
  return sourceSchema.parse({ type: 'random' });
};

const asyncHandler = (handler: RequestHandler): RequestHandler => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

export const apiRouter = Router();

apiRouter.get('/health', asyncHandler(async (_request, response) => {
  const songCount = await getSongCount();
  response.json({
    status: spotifyClient.isConfigured ? 'ok' : 'degraded',
    uptimeSeconds: process.uptime(),
    database: { connected: true, songCount },
    spotify: { configured: spotifyClient.isConfigured, authenticated: spotifyClient.isAuthenticated },
  });
}));

apiRouter.get('/songs', asyncHandler(async (request, response) => {
  const parsedQuery = battleQuerySchema.safeParse({
    count: request.query.count ?? 16,
    playlistUrl: request.query.playlistUrl,
    decade: request.query.decade,
    genre: request.query.genre,
  });
  if (!parsedQuery.success) {
    response.status(400).json({ error: { code: 400, message: 'Invalid song request.', details: parsedQuery.error.flatten() } });
    return;
  }

  const source = sourceFromQuery(parsedQuery.data);
  const result = await resolveBattleSongs(source, parsedQuery.data.count);
  const sessionId = randomUUID();
  const sourceValue = source.type === 'playlist'
    ? source.playlistUrl
    : source.type === 'decade'
      ? source.decade
      : source.type === 'genre'
        ? source.genre
        : undefined;
  await createBattleSession({
    id: sessionId,
    sourceType: source.type,
    requestedCount: parsedQuery.data.count,
    effectiveCount: result.effectiveCount,
    ...(sourceValue ? { sourceValue } : {}),
  });

  response.json({
    sessionId,
    songs: result.songs,
    requestedCount: parsedQuery.data.count,
    effectiveCount: result.effectiveCount,
    ...(result.warning ? { warning: result.warning } : {}),
  });
}));

apiRouter.post('/votes', asyncHandler(async (request, response) => {
  const parsedBody = voteRequestSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({ error: { code: 400, message: 'Invalid vote request.', details: parsedBody.error.flatten() } });
    return;
  }

  await recordBattleVote(parsedBody.data);
  response.status(201).json({ recorded: true });
}));

apiRouter.post('/sessions/:sessionId/complete', asyncHandler(async (request, response) => {
  const sessionId = z.string().uuid().parse(request.params.sessionId);
  const winnerSongId = z.string().regex(/^[A-Za-z0-9]{22}$/).parse(request.body?.winnerSongId);
  await completeBattleSession(sessionId, winnerSongId);
  response.status(204).send();
}));

apiRouter.get('/stats', asyncHandler(async (_request, response) => {
  response.json(await getLeaderboard());
}));

apiRouter.get('/stats/:songId', asyncHandler(async (request, response) => {
  const songId = z.string().regex(/^[A-Za-z0-9]{22}$/).parse(request.params.songId);
  const stats = await getSongStats(songId);
  if (!stats) {
    response.status(404).json({ error: { code: 404, message: 'No statistics exist for this song yet.' } });
    return;
  }
  response.json(stats);
}));

export const formatError = (error: unknown): { status: number; body: unknown } => {
  if (error instanceof SpotifyApiError && error.status === 429) {
    return {
      status: 503,
      body: { error: { code: 503, message: 'Spotify is temporarily rate-limiting requests.', details: { retryAfterSeconds: error.retryAfterSeconds } } },
    };
  }
  if (error instanceof z.ZodError) {
    return { status: 400, body: { error: { code: 400, message: 'Invalid request.', details: error.flatten() } } };
  }
  return { status: 503, body: { error: { code: 503, message: error instanceof Error ? error.message : 'Request failed.' } } };
};

void battleRequestSchema;
void errorResponseSchema;
