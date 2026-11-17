import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { Song } from "@songbattle/contracts";
import { db } from "./client.js";
import { config } from "../config.js";
import {
  battleSessions,
  battleSessionSongs,
  battleVotes,
  playlistCache,
  songStats,
  songs,
  type NewSongRow,
  type SongRow,
} from "./schema.js";

const now = (): number => Date.now();

const releaseYearFromSong = (song: Song): number => {
  const year = song.releaseDate
    ? Number.parseInt(song.releaseDate.slice(0, 4), 10)
    : 0;
  return Number.isInteger(year) ? year : 0;
};

const toSongRow = (song: Song, timestamp: number): NewSongRow => ({
  id: song.id,
  title: song.title,
  artistsJson: JSON.stringify(song.artists),
  albumName: song.album.name,
  ...(song.album.imageUrl ? { albumImageUrl: song.album.imageUrl } : {}),
  ...(song.releaseDate ? { releaseDate: song.releaseDate } : {}),
  releaseYear: releaseYearFromSong(song),
  durationMs: song.durationMs,
  popularity: song.popularity,
  spotifyUri: song.spotify.spotifyUri,
  embedUrl: song.spotify.embedUrl,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const parseArtists = (value: string): string[] => {
  try {
    const artists: unknown = JSON.parse(value);
    return Array.isArray(artists) &&
      artists.every((artist): artist is string => typeof artist === "string")
      ? artists
      : [];
  } catch {
    return [];
  }
};

const rowToSong = (row: SongRow): Song => ({
  id: row.id,
  title: row.title,
  artists: parseArtists(row.artistsJson),
  album: {
    name: row.albumName,
    ...(row.albumImageUrl ? { imageUrl: row.albumImageUrl } : {}),
  },
  ...(row.releaseDate ? { releaseDate: row.releaseDate } : {}),
  durationMs: row.durationMs,
  popularity: row.popularity,
  spotify: {
    provider: "spotify",
    contentType: "track",
    spotifyId: row.id,
    spotifyUri: row.spotifyUri,
    embedUrl: row.embedUrl,
  },
});

export const saveSongs = async (
  songsToSave: readonly Song[],
): Promise<void> => {
  if (songsToSave.length === 0) return;
  const timestamp = now();
  const values = songsToSave.map((song) => toSongRow(song, timestamp));

  await db
    .insert(songs)
    .values(values)
    .onConflictDoUpdate({
      target: songs.id,
      set: {
        title: sql`excluded.title`,
        artistsJson: sql`excluded.artists_json`,
        albumName: sql`excluded.album_name`,
        albumImageUrl: sql`excluded.album_image_url`,
        releaseDate: sql`excluded.release_date`,
        releaseYear: sql`excluded.release_year`,
        durationMs: sql`excluded.duration_ms`,
        popularity: sql`excluded.popularity`,
        spotifyUri: sql`excluded.spotify_uri`,
        embedUrl: sql`excluded.embed_url`,
        updatedAt: timestamp,
      },
    });
};

const selectSongs = async (
  conditions: ReturnType<typeof and> | undefined,
  limit: number,
): Promise<Song[]> => {
  const rows = await db
    .select()
    .from(songs)
    .where(conditions)
    .orderBy(sql`RANDOM()`)
    .limit(limit);
  return rows.map(rowToSong);
};

export const getRandomSongs = (limit: number): Promise<Song[]> =>
  selectSongs(undefined, limit);

export const getSongsByReleaseYear = (
  startYear: number,
  endYear: number,
  limit: number,
): Promise<Song[]> =>
  selectSongs(
    and(gte(songs.releaseYear, startYear), lte(songs.releaseYear, endYear)),
    limit,
  );

export const getSongCount = async (): Promise<number> => {
  const rows = await db.select({ count: sql<number>`count(*)` }).from(songs);
  return rows[0]?.count ?? 0;
};

export const getSongsByIds = async (
  ids: readonly string[],
): Promise<Song[]> => {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(songs)
    .where(inArray(songs.id, [...ids]));
  const songsById = new Map(rows.map((row) => [row.id, rowToSong(row)]));
  return ids.flatMap((id) => {
    const song = songsById.get(id);
    return song ? [song] : [];
  });
};

export const getCachedPlaylistSongs = async (
  playlistId: string,
): Promise<Song[] | null> => {
  const row = await db.query.playlistCache.findFirst({
    where: eq(playlistCache.playlistId, playlistId),
  });
  if (!row || row.expiresAt <= now()) return null;

  try {
    const ids: unknown = JSON.parse(row.trackIdsJson);
    if (
      !Array.isArray(ids) ||
      !ids.every((id): id is string => typeof id === "string")
    )
      return null;
    const cachedSongs = await getSongsByIds(ids);
    return cachedSongs.length > 0 ? cachedSongs : null;
  } catch {
    return null;
  }
};

export const cachePlaylistSongs = async (
  playlistId: string,
  cachedSongs: readonly Song[],
): Promise<void> => {
  if (cachedSongs.length === 0) return;
  await saveSongs(cachedSongs);
  const fetchedAt = now();
  await db
    .insert(playlistCache)
    .values({
      playlistId,
      trackIdsJson: JSON.stringify(cachedSongs.map((song) => song.id)),
      fetchedAt,
      expiresAt: fetchedAt + config.playlistCacheTtlMs,
    })
    .onConflictDoUpdate({
      target: playlistCache.playlistId,
      set: {
        trackIdsJson: JSON.stringify(cachedSongs.map((song) => song.id)),
        fetchedAt,
        expiresAt: fetchedAt + config.playlistCacheTtlMs,
      },
    });
};

export const pruneExpiredPlaylistCache = async (): Promise<void> => {
  await db.delete(playlistCache).where(lte(playlistCache.expiresAt, now()));
};

export const pruneSongCache = async (
  maxSize = config.songCacheMaxSize,
): Promise<number> => {
  const allSongs = await db
    .select({ id: songs.id, updatedAt: songs.updatedAt })
    .from(songs)
    .orderBy(sql`${songs.updatedAt} ASC`);
  if (allSongs.length <= maxSize) return 0;

  const protectedRows = await db
    .select({ id: battleSessionSongs.songId })
    .from(battleSessionSongs);
  const protectedIds = new Set(protectedRows.map(({ id }) => id));
  const statsRows = await db.select({ id: songStats.songId }).from(songStats);
  for (const { id } of statsRows) protectedIds.add(id);

  const removable = allSongs
    .filter(({ id }) => !protectedIds.has(id))
    .slice(0, Math.max(0, allSongs.length - maxSize));
  if (removable.length === 0) return 0;
  await db.delete(songs).where(
    inArray(
      songs.id,
      removable.map(({ id }) => id),
    ),
  );
  return removable.length;
};

export interface NewBattleSession {
  id: string;
  sourceType: string;
  sourceValue?: string;
  requestedCount: number;
  effectiveCount: number;
  songIds: readonly string[];
}

export const createBattleSession = async (
  session: NewBattleSession,
): Promise<void> => {
  await db.transaction(async (transaction) => {
    await transaction.insert(battleSessions).values({
      id: session.id,
      sourceType: session.sourceType,
      ...(session.sourceValue ? { sourceValue: session.sourceValue } : {}),
      requestedCount: session.requestedCount,
      effectiveCount: session.effectiveCount,
      startedAt: now(),
    });
    await transaction.insert(battleSessionSongs).values(
      session.songIds.map((songId, position) => ({
        sessionId: session.id,
        songId,
        position,
      })),
    );
  });
};

export interface NewBattleVote {
  sessionId: string;
  matchupNumber: number;
  winnerSongId: string;
  loserSongId: string;
}

export class BattleVoteError extends Error {
  public constructor(
    public readonly status: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = "BattleVoteError";
  }
}

export const recordBattleVote = async (
  vote: NewBattleVote,
): Promise<"recorded" | "duplicate"> => {
  if (vote.winnerSongId === vote.loserSongId) {
    throw new BattleVoteError(400, "Winner and loser must be different songs.");
  }

  const session = await db
    .select({ id: battleSessions.id, completedAt: battleSessions.completedAt })
    .from(battleSessions)
    .where(eq(battleSessions.id, vote.sessionId))
    .limit(1);
  const sessionRow = session[0];
  if (!sessionRow)
    throw new BattleVoteError(404, "Battle session was not found.");
  if (sessionRow.completedAt !== null)
    throw new BattleVoteError(409, "This battle session is already complete.");

  const sessionSongs = await db
    .select({ songId: battleSessionSongs.songId })
    .from(battleSessionSongs)
    .where(eq(battleSessionSongs.sessionId, vote.sessionId));
  const allowedSongIds = new Set(sessionSongs.map(({ songId }) => songId));
  if (
    !allowedSongIds.has(vote.winnerSongId) ||
    !allowedSongIds.has(vote.loserSongId)
  ) {
    throw new BattleVoteError(
      409,
      "Both voted songs must belong to this battle session.",
    );
  }

  const existingVote = await db
    .select({ id: battleVotes.id })
    .from(battleVotes)
    .where(
      and(
        eq(battleVotes.sessionId, vote.sessionId),
        eq(battleVotes.matchupNumber, vote.matchupNumber),
      ),
    )
    .limit(1);
  if (existingVote.length > 0) return "duplicate";

  const timestamp = now();
  await db.transaction(async (transaction) => {
    await transaction
      .insert(battleVotes)
      .values({ ...vote, createdAt: timestamp });
    await transaction
      .insert(songStats)
      .values([
        {
          songId: vote.winnerSongId,
          wins: 1,
          losses: 0,
          appearances: 1,
          updatedAt: timestamp,
        },
        {
          songId: vote.loserSongId,
          wins: 0,
          losses: 1,
          appearances: 1,
          updatedAt: timestamp,
        },
      ])
      .onConflictDoUpdate({
        target: songStats.songId,
        set: {
          wins: sql`${songStats.wins} + excluded.wins`,
          losses: sql`${songStats.losses} + excluded.losses`,
          appearances: sql`${songStats.appearances} + excluded.appearances`,
          updatedAt: timestamp,
        },
      });
  });
  return "recorded";
};

export const completeBattleSession = async (
  sessionId: string,
  winnerSongId: string,
): Promise<void> => {
  const sessionRows = await db
    .select({
      completedAt: battleSessions.completedAt,
      winnerSongId: battleSessions.winnerSongId,
    })
    .from(battleSessions)
    .where(eq(battleSessions.id, sessionId))
    .limit(1);
  const session = sessionRows[0];
  if (!session) throw new BattleVoteError(404, "Battle session was not found.");
  if (session.completedAt !== null) {
    if (session.winnerSongId !== winnerSongId) {
      throw new BattleVoteError(
        409,
        "This battle session is already complete with a different winner.",
      );
    }
    return;
  }
  const sessionSongs = await db
    .select({ songId: battleSessionSongs.songId })
    .from(battleSessionSongs)
    .where(eq(battleSessionSongs.sessionId, sessionId));
  if (!sessionSongs.some(({ songId }) => songId === winnerSongId)) {
    throw new BattleVoteError(
      409,
      "The winning song must belong to this battle session.",
    );
  }
  await db
    .update(battleSessions)
    .set({ completedAt: now(), winnerSongId })
    .where(
      and(
        eq(battleSessions.id, sessionId),
        sql`${battleSessions.completedAt} IS NULL`,
      ),
    );
};

export interface LeaderboardEntry {
  songId: string;
  title: string;
  artists: string[];
  wins: number;
  losses: number;
  appearances: number;
  winRate: number;
}

export const getLeaderboard = async (
  limit = 10,
): Promise<LeaderboardEntry[]> => {
  const rows = await db
    .select({
      song: songs,
      stats: songStats,
    })
    .from(songStats)
    .innerJoin(songs, eq(songStats.songId, songs.id))
    .orderBy(sql`${songStats.wins} DESC`, sql`${songStats.losses} ASC`)
    .limit(limit);

  return rows.map(({ song, stats }) => ({
    songId: song.id,
    title: song.title,
    artists: parseArtists(song.artistsJson),
    wins: stats.wins,
    losses: stats.losses,
    appearances: stats.appearances,
    winRate: stats.appearances > 0 ? stats.wins / stats.appearances : 0,
  }));
};

export const getSongStats = async (
  songId: string,
): Promise<LeaderboardEntry | null> => {
  const rows = await db
    .select({ song: songs, stats: songStats })
    .from(songStats)
    .innerJoin(songs, eq(songStats.songId, songs.id))
    .where(eq(songStats.songId, songId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  return {
    songId: row.song.id,
    title: row.song.title,
    artists: parseArtists(row.song.artistsJson),
    wins: row.stats.wins,
    losses: row.stats.losses,
    appearances: row.stats.appearances,
    winRate:
      row.stats.appearances > 0 ? row.stats.wins / row.stats.appearances : 0,
  };
};
