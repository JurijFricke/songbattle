import { randomUUID } from "node:crypto";
import type { Song } from "@songbattle/contracts";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "./server.js";
import { db, initializeDatabase } from "./database/client.js";
import {
  completeBattleSession,
  createBattleSession,
  getSongStats,
  recordBattleVote,
  saveSongs,
} from "./database/repository.js";
import { migrate } from "drizzle-orm/libsql/migrator";

beforeAll(async () => {
  await initializeDatabase();
  await migrate(db, { migrationsFolder: "./drizzle" });
});

const songId = (number: number): string =>
  `route${String(number).padStart(17, "0")}`;

const makeSong = (number: number): Song => ({
  id: songId(number),
  title: `Route Song ${number}`,
  artists: [`Artist ${number}`],
  album: { name: `Album ${number}` },
  releaseDate: "1999-01-01",
  durationMs: 200_000,
  popularity: 60,
  spotify: {
    provider: "spotify",
    contentType: "track",
    spotifyId: songId(number),
    spotifyUri: `spotify:track:${songId(number)}`,
    embedUrl: `https://open.spotify.com/embed/track/${songId(number)}`,
  },
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

describe("API routes", () => {
  it("returns a health response without requiring Spotify credentials", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.database.connected).toBe(true);
    expect(response.body).toHaveProperty("spotify.configured");
  });

  it("rejects conflicting song source parameters", async () => {
    const response = await request(app).get(
      "/api/songs?count=16&decade=1990s&genre=rock",
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(400);
  });

  describe("battle lifecycle over HTTP", () => {
    let sessionId: string;

    beforeAll(async () => {
      await saveSongs([makeSong(1), makeSong(2), makeSong(3)]);
      sessionId = randomUUID();
      await createBattleSession({
        id: sessionId,
        sourceType: "random",
        requestedCount: 3,
        effectiveCount: 3,
        songIds: [songId(1), songId(2), songId(3)],
      });
    });

    it("records a first vote with 201", async () => {
      const response = await request(app)
        .post("/api/votes")
        .send(vote(sessionId, 1, 1, 2));

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ recorded: true, duplicate: false });
    });

    it("records a repeated vote with 200 without changing statistics", async () => {
      const response = await request(app)
        .post("/api/votes")
        .send(vote(sessionId, 1, 1, 2));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ recorded: false, duplicate: true });
      expect(await getSongStats(songId(1))).toMatchObject({
        wins: 1,
        losses: 0,
        appearances: 1,
      });
    });

    it("rejects reusing a matchup number with a different result with 409", async () => {
      const response = await request(app)
        .post("/api/votes")
        .send(vote(sessionId, 1, 2, 1));

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe(409);
      expect(await getSongStats(songId(2))).toMatchObject({
        wins: 0,
        losses: 1,
        appearances: 1,
      });
    });

    it("rejects votes for songs outside the session with 409", async () => {
      const response = await request(app)
        .post("/api/votes")
        .send(vote(sessionId, 2, 1, 999));

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe(409);
    });

    it("rejects votes for unknown sessions with 404", async () => {
      const response = await request(app)
        .post("/api/votes")
        .send(vote(randomUUID(), 1, 1, 2));

      expect(response.status).toBe(404);
    });

    it("rejects votes with identical winner and loser with 400", async () => {
      const response = await request(app)
        .post("/api/votes")
        .send(vote(sessionId, 2, 1, 1));

      expect(response.status).toBe(400);
    });

    it("rejects malformed vote bodies with 400", async () => {
      const response = await request(app)
        .post("/api/votes")
        .send({ sessionId: "not-a-uuid", matchupNumber: 0 });

      expect(response.status).toBe(400);
    });

    it("completes the session with 204 and exposes final statistics", async () => {
      await recordBattleVote(vote(sessionId, 2, 1, 3));

      const complete = await request(app)
        .post(`/api/sessions/${sessionId}/complete`)
        .send({ winnerSongId: songId(1) });

      expect(complete.status).toBe(204);

      const stats = await request(app).get(`/api/stats/${songId(1)}`);
      expect(stats.status).toBe(200);
      expect(stats.body).toEqual({
        songId: songId(1),
        title: "Route Song 1",
        artists: ["Artist 1"],
        wins: 2,
        losses: 0,
        appearances: 2,
        winRate: 1,
      });
    });

    it("rejects completing a completed session with a different winner with 409", async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/complete`)
        .send({ winnerSongId: songId(2) });

      expect(response.status).toBe(409);
    });

    it("is idempotent when completing again with the same winner", async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/complete`)
        .send({ winnerSongId: songId(1) });

      expect(response.status).toBe(204);
    });

    it("rejects votes after completion with 409", async () => {
      const response = await request(app)
        .post("/api/votes")
        .send(vote(sessionId, 3, 2, 3));

      expect(response.status).toBe(409);
    });

    it("returns the leaderboard including this session's songs", async () => {
      const response = await request(app).get("/api/stats");

      expect(response.status).toBe(200);
      const winner = response.body.find(
        (entry: { songId: string }) => entry.songId === songId(1),
      );
      expect(winner).toMatchObject({
        songId: songId(1),
        wins: 2,
        losses: 0,
        appearances: 2,
        winRate: 1,
      });
    });

    it("rejects completion for unknown sessions with 404", async () => {
      const response = await request(app)
        .post(`/api/sessions/${randomUUID()}/complete`)
        .send({ winnerSongId: songId(1) });

      expect(response.status).toBe(404);
    });

    it("rejects completion with a winner outside the session with 409", async () => {
      const openSessionId = randomUUID();
      await createBattleSession({
        id: openSessionId,
        sourceType: "random",
        requestedCount: 1,
        effectiveCount: 1,
        songIds: [songId(3)],
      });

      const response = await request(app)
        .post(`/api/sessions/${openSessionId}/complete`)
        .send({ winnerSongId: songId(1) });

      expect(response.status).toBe(409);
      await expect(
        completeBattleSession(openSessionId, songId(3)),
      ).resolves.toBeUndefined();
    });
  });
});
