import {
  battleResponseSchema,
  leaderboardResponseSchema,
  type BattleResponse,
  type BattleSource,
  type LeaderboardEntry,
  songStatsSchema,
  type SongStats,
  type VoteRequest,
} from '@songbattle/contracts';

const requestJson = async (input: RequestInfo | URL, init?: RequestInit): Promise<unknown> => {
  const response = await fetch(input, init);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body
      ? JSON.stringify(body.error)
      : `Request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  return body;
};

export const fetchSongsAPI = async (count: number, source: BattleSource): Promise<BattleResponse> => {
  const params = new URLSearchParams({ count: String(count) });
  if (source.type === 'playlist') params.set('playlistUrl', source.playlistUrl);
  if (source.type === 'decade') params.set('decade', source.decade);
  if (source.type === 'genre') params.set('genre', source.genre);
  return battleResponseSchema.parse(await requestJson(`/api/songs?${params}`));
};

export const saveBattleVoteAPI = async (vote: VoteRequest): Promise<void> => {
  await requestJson('/api/votes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vote),
  });
};

export const completeBattleAPI = async (sessionId: string, winnerSongId: string): Promise<void> => {
  await requestJson(`/api/sessions/${sessionId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winnerSongId }),
  });
};

export const fetchStatsAPI = async (): Promise<LeaderboardEntry[]> =>
  leaderboardResponseSchema.parse(await requestJson('/api/stats'));

export const fetchSongStatsAPI = async (songId: string): Promise<SongStats | null> => {
  const response = await fetch(`/api/stats/${songId}`);
  if (response.status === 404) return null;
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(`Statistics request failed with HTTP ${response.status}.`);
  return songStatsSchema.parse(body);
};
