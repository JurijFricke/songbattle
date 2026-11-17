import type { Song } from "@songbattle/contracts";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { db, initializeDatabase } from "./client.js";
import {
  BattleVoteError,
  cachePlaylistSongs,
  completeBattleSession,
  createBattleSession,
  getCachedPlaylistSongs,
  getLeaderboard,
  getSongCount,
  getSongsByIds,
  getSongStats,
  pruneExpiredPlaylistCache,
  pruneSongCache,
  recordBattleVote,
  saveSongs,
} from "./repository.js";
import { battleVotes, playlistCache } from "./schema.js";

// Deterministic 22-character alphanumeric Spotify-style IDs prefixed per file
// so they cannot collide with seeds from other test files sharing the run
// database.
const songId = (number: number): string =>
  `integ${String(number).padStart(17, "0")}`;

const makeSong = (number: number, overrides: Partial<Song> = {}): Song => ({
  id: songId(number),
  title: `Integration Song ${number}`,
  artists: [`Artist ${number}`],
  album: { name: `Album ${number}` },
  durationMs: 180_000 + number,
  popularity: 50 + number,
  spotify: {
    provider: "spotify",
    contentType: "track",
    spotifyId: songId(number),
    spotifyUri: `spotify:track:${songId(number)}`,
    embedUrl: `https://open.spotify.com/embed/track/${songId(number)}`,
  },
  ...overrides,
});

const vote = (
  sessionId: string,
  matchupNumber: number,
  winner: number,
  loser: number,
) => ({
  sessionId,
  matchupNumber,
  winnerSongId: songId(winner),
  loserSongId: songId(loser),
});

const createSession = async (
  id: string,
  songNumbers: readonly number[],
): Promise<void> => {
  await createBattleSession({
    id,
    sourceType: "random",
    requestedCount: songNumbers.length,
    effectiveCount: songNumbers.length,
    songIds: songNumbers.map(songId),
  });
};

beforeAll(async () => {
  await initializeDatabase();
  await migrate(db, { migrationsFolder: "./drizzle" });
  // Songs 1-3 back every session in this file; the foreign keys on
  // battle_session_songs require them to exist before any session insert.
  await saveSongs([makeSong(1), makeSong(2), makeSong(3)]);
});

describe("song repository", () => {
  it("roundtrips songs through persistence, preserving optional fields", async () => {
    const plain = makeSong(1);
    const withArtwork = makeSong(2, {
      album: { name: "Album 2", imageUrl: "https://example.com/cover2.jpg" },
      releaseDate: "1987-03-01",
      artists: ["Artist 2", "Featured Artist"],
    });
    await saveSongs([plain, withArtwork]);

    const loaded = await getSongsByIds([songId(1), songId(2), songId(999)]);

    expect(loaded).toHaveLength(2);
    expect(loaded[0]).toEqual(plain);
    expect(loaded[1]).toEqual(withArtwork);
  });
});

describe("battle session persistence", () => {
  it("rejects session songs that do not exist because foreign keys are enforced", async () => {
    await expect(
      createBattleSession({
        id: "11111111-1111-4111-8111-111111111111",
        sourceType: "random",
        requestedCount: 1,
        effectiveCount: 1,
        songIds: [songId(1), songId(999)],
      }),
    ).rejects.toThrow();
  });

  it("rejects a second vote row for the same session and matchup at the database level", async () => {
    const sessionId = "22222222-2222-4222-8222-222222222222";
    await saveSongs([makeSong(5), makeSong(6)]);
    await createSession(sessionId, [5, 6]);

    await db.insert(battleVotes).values({
      sessionId,
      matchupNumber: 1,
      winnerSongId: songId(5),
      loserSongId: songId(6),
      createdAt: Date.now(),
    });

    await expect(
      db.insert(battleVotes).values({
        sessionId,
        matchupNumber: 1,
        winnerSongId: songId(6),
        loserSongId: songId(5),
        createdAt: Date.now(),
      }),
    ).rejects.toThrow();
  });

  it("aggregates statistics transactionally across votes", async () => {
    const sessionId = "33333333-3333-4333-8333-333333333333";
    await saveSongs([
      makeSong(30),
      makeSong(31),
      makeSong(32),
      makeSong(33),
      makeSong(34),
      makeSong(35),
    ]);
    await createSession(sessionId, [30, 31, 32, 33, 34, 35]);

    await expect(recordBattleVote(vote(sessionId, 1, 30, 31))).resolves.toBe(
      "recorded",
    );
    await expect(recordBattleVote(vote(sessionId, 2, 30, 32))).resolves.toBe(
      "recorded",
    );
    await expect(recordBattleVote(vote(sessionId, 3, 30, 33))).resolves.toBe(
      "recorded",
    );
    await expect(recordBattleVote(vote(sessionId, 4, 30, 34))).resolves.toBe(
      "recorded",
    );
    await expect(recordBattleVote(vote(sessionId, 5, 30, 35))).resolves.toBe(
      "recorded",
    );
    await expect(recordBattleVote(vote(sessionId, 6, 31, 32))).resolves.toBe(
      "recorded",
    );

    const winner = await getSongStats(songId(30));
    expect(winner).toMatchObject({ wins: 5, losses: 0, appearances: 5 });
    expect(winner?.winRate).toBeCloseTo(1, 10);

    const runnerUp = await getSongStats(songId(31));
    expect(runnerUp).toMatchObject({ wins: 1, losses: 1, appearances: 2 });

    const last = await getSongStats(songId(32));
    expect(last).toMatchObject({ wins: 0, losses: 2, appearances: 2 });

    for (const stats of [winner, runnerUp, last]) {
      expect(stats).not.toBeNull();
      if (!stats) continue;
      expect(stats.wins + stats.losses).toBe(stats.appearances);
    }

    // Other test files sharing the run database also record votes, so the
    // leaderboard is asserted by dominant record and ordering properties
    // instead of exact membership.
    const leaderboard = await getLeaderboard();
    expect(leaderboard[0]?.songId).toBe(songId(30));
    expect(leaderboard[0]).toMatchObject({
      wins: 5,
      losses: 0,
      appearances: 5,
    });
    const leaderboardIds = leaderboard.map((entry) => entry.songId);
    for (const number of [31, 32, 33, 34, 35]) {
      expect(leaderboardIds).toContain(songId(number));
    }
    for (let index = 1; index < leaderboard.length; index += 1) {
      const previous = leaderboard[index - 1];
      const current = leaderboard[index];
      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      if (!previous || !current) continue;
      expect(previous.wins).toBeGreaterThanOrEqual(current.wins);
    }
  });

  it("rejects invariant-violating votes with precise statuses", async () => {
    const sessionId = "44444444-4444-4444-8444-444444444444";
    await createSession(sessionId, [30, 31, 32]);

    await expect(
      recordBattleVote(vote(sessionId, 1, 30, 30)),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      recordBattleVote(vote("55555555-5555-4555-8555-555555555555", 1, 30, 31)),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      recordBattleVote(vote(sessionId, 4, 30, 999)),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("treats repeated votes on a matchup as duplicates without changing statistics", async () => {
    const sessionId = "66666666-6666-4666-8666-666666666666";
    await saveSongs([makeSong(40), makeSong(41)]);
    await createSession(sessionId, [40, 41]);

    await expect(recordBattleVote(vote(sessionId, 1, 40, 41))).resolves.toBe(
      "recorded",
    );
    await expect(recordBattleVote(vote(sessionId, 1, 40, 41))).resolves.toBe(
      "duplicate",
    );

    const stats = await getSongStats(songId(40));
    expect(stats).toMatchObject({ wins: 1, losses: 0, appearances: 1 });
  });

  it("completes sessions idempotently and rejects conflicting winners", async () => {
    const sessionId = "77777777-7777-4777-8777-777777777777";
    await saveSongs([makeSong(50), makeSong(51), makeSong(52)]);
    await createSession(sessionId, [50, 51, 52]);

    await expect(
      completeBattleSession(sessionId, songId(50)),
    ).resolves.toBeUndefined();
    await expect(
      completeBattleSession(sessionId, songId(50)),
    ).resolves.toBeUndefined();
    await expect(
      completeBattleSession(sessionId, songId(51)),
    ).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("already complete"),
    });

    await expect(
      recordBattleVote(vote(sessionId, 1, 50, 51)),
    ).rejects.toMatchObject({ status: 409 });

    await expect(
      completeBattleSession("88888888-8888-4888-8888-888888888888", songId(50)),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("reports BattleVoteError as its rejection type", async () => {
    await expect(
      recordBattleVote(vote("99999999-9999-4999-8999-999999999999", 1, 1, 2)),
    ).rejects.toBeInstanceOf(BattleVoteError);
  });
});

describe("cache persistence", () => {
  it("caches playlist songs and expires them", async () => {
    const playlistSongs = [makeSong(10), makeSong(11), makeSong(12)];
    await cachePlaylistSongs("playlist-under-test", playlistSongs);

    await expect(
      getCachedPlaylistSongs("playlist-under-test"),
    ).resolves.toEqual(playlistSongs);

    await db
      .update(playlistCache)
      .set({ expiresAt: Date.now() - 1 })
      .where(eq(playlistCache.playlistId, "playlist-under-test"));

    await expect(
      getCachedPlaylistSongs("playlist-under-test"),
    ).resolves.toBeNull();

    await pruneExpiredPlaylistCache();
    await expect(
      getCachedPlaylistSongs("playlist-under-test"),
    ).resolves.toBeNull();
  });

  it("prunes the song cache while protecting session and statistics songs", async () => {
    // Songs 1-3 (saved in beforeAll but never in a committed session), 10-12
    // (from the previous test in this file), and 20-22 are all unprotected, so
    // every currently unprotected song must be part of the expected deletion
    // set for the count assertions to hold.
    const unprotectedIds = [
      songId(1),
      songId(2),
      songId(3),
      songId(10),
      songId(11),
      songId(12),
      songId(20),
      songId(21),
      songId(22),
    ];
    await saveSongs([makeSong(20), makeSong(21), makeSong(22)]);

    // A session song and a stats song must survive pruning even though they
    // were saved least recently.
    const sessionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await saveSongs([makeSong(23, { popularity: 1 }), makeSong(24)]);
    await createSession(sessionId, [23, 24]);
    await recordBattleVote(vote(sessionId, 1, 23, 24));

    const totalSongs = await getSongCount();
    const protectedCount = totalSongs - unprotectedIds.length;

    const deleted = await pruneSongCache(protectedCount);

    expect(deleted).toBe(unprotectedIds.length);
    await expect(getSongsByIds(unprotectedIds)).resolves.toEqual([]);
    await expect(getSongsByIds([songId(23), songId(24)])).resolves.toHaveLength(
      2,
    );
  });
});
