import { expect, test, type Page, type Route } from "@playwright/test";
import { statValue, type SongStats } from "./helpers";

const bracketSize = 16;
const sessionId = "11111111-1111-4111-8111-111111111111";
const matchupsInBracket = bracketSize - 1;

const songId = (index: number): string => String(index).padStart(22, "0");

const mockSongs = Array.from({ length: bracketSize }, (_, index) => {
  const id = songId(index);
  return {
    id,
    title: `Mock Song ${index + 1}`,
    artists: [`Mock Artist ${index + 1}`],
    album: {
      name: `Mock Album ${index + 1}`,
      imageUrl: `https://example.com/album-${index + 1}.jpg`,
    },
    releaseDate: "2024-01-01",
    durationMs: 180_000,
    popularity: 50,
    spotify: {
      provider: "spotify",
      contentType: "track",
      spotifyId: id,
      spotifyUri: `spotify:track:${id}`,
      embedUrl: `https://open.spotify.com/embed/track/${id}`,
    },
  };
});

interface VoteBody {
  sessionId: string;
  matchupNumber: number;
  winnerSongId: string;
  loserSongId: string;
}

interface MockBackend {
  votes: VoteBody[];
  completions: { sessionId: string; winnerSongId: string }[];
  stats: Map<string, SongStats>;
  songCountParams: string[];
  spotifyRequests: number;
  unhandledRoutes: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseVote = (body: unknown): VoteBody | null => {
  if (!isRecord(body)) return null;
  const {
    sessionId: parsedSessionId,
    matchupNumber,
    winnerSongId,
    loserSongId,
  } = body;
  if (
    typeof parsedSessionId !== "string" ||
    typeof matchupNumber !== "number" ||
    typeof winnerSongId !== "string" ||
    typeof loserSongId !== "string"
  ) {
    return null;
  }
  return {
    sessionId: parsedSessionId,
    matchupNumber,
    winnerSongId,
    loserSongId,
  };
};

const parseWinner = (body: unknown): string | null =>
  isRecord(body) && typeof body.winnerSongId === "string"
    ? body.winnerSongId
    : null;

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

const errorJson = (route: Route, status: number, message: string) =>
  json(route, { error: { code: status, message } }, status);

const statsFor = (backend: MockBackend, id: string): SongStats => {
  const existing = backend.stats.get(id);
  if (existing) return existing;
  const created = {
    wins: 0,
    losses: 0,
    appearances: 0,
    bracketWins: 0,
    bracketAppearances: 0,
  };
  backend.stats.set(id, created);
  return created;
};

const withWinRate = (stats: SongStats) => ({
  ...stats,
  winRate: stats.appearances > 0 ? stats.wins / stats.appearances : 0,
});

const installMockBackend = async (page: Page): Promise<MockBackend> => {
  const backend: MockBackend = {
    votes: [],
    completions: [],
    stats: new Map(),
    songCountParams: [],
    spotifyRequests: 0,
    unhandledRoutes: [],
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const { pathname, searchParams } = new URL(request.url());
    const method = request.method();

    if (method === "GET" && pathname === "/api/songs") {
      backend.songCountParams.push(searchParams.get("count") ?? "");
      await json(route, {
        sessionId,
        songs: mockSongs,
        requestedCount: bracketSize,
        effectiveCount: bracketSize,
      });
      return;
    }

    if (method === "POST" && pathname === "/api/votes") {
      const vote = parseVote(request.postDataJSON());
      if (!vote) {
        await errorJson(route, 400, "Invalid vote request.");
        return;
      }
      if (vote.sessionId !== sessionId) {
        await errorJson(route, 409, "Unknown battle session.");
        return;
      }
      if (
        backend.votes.some(
          (existing) => existing.matchupNumber === vote.matchupNumber,
        )
      ) {
        await errorJson(
          route,
          409,
          `Matchup ${vote.matchupNumber} was already recorded.`,
        );
        return;
      }
      const knownSongIds = new Set(mockSongs.map((song) => song.id));
      if (
        !knownSongIds.has(vote.winnerSongId) ||
        !knownSongIds.has(vote.loserSongId) ||
        vote.winnerSongId === vote.loserSongId
      ) {
        await errorJson(route, 400, "Unknown song in vote request.");
        return;
      }

      const winner = statsFor(backend, vote.winnerSongId);
      winner.wins += 1;
      winner.appearances += 1;
      const loser = statsFor(backend, vote.loserSongId);
      loser.losses += 1;
      loser.appearances += 1;
      backend.votes.push(vote);
      await json(route, { recorded: true, duplicate: false }, 201);
      return;
    }

    if (
      method === "POST" &&
      pathname === `/api/sessions/${sessionId}/complete`
    ) {
      const winnerSongId = parseWinner(request.postDataJSON());
      if (!winnerSongId) {
        await errorJson(route, 400, "Invalid completion request.");
        return;
      }
      if (!mockSongs.some((song) => song.id === winnerSongId)) {
        await errorJson(route, 409, "Unknown winner.");
        return;
      }
      const existing = backend.completions[0];
      if (existing) {
        if (existing.winnerSongId !== winnerSongId) {
          await errorJson(
            route,
            409,
            "This battle session is already complete with a different winner.",
          );
          return;
        }
        await route.fulfill({ status: 204 });
        return;
      }

      statsFor(backend, winnerSongId).bracketWins += 1;
      for (const song of mockSongs) {
        statsFor(backend, song.id).bracketAppearances += 1;
      }
      backend.completions.push({ sessionId, winnerSongId });
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === "GET" && pathname === "/api/stats") {
      const entries = mockSongs
        .map((song) => ({ song, stats: backend.stats.get(song.id) }))
        .filter(
          (
            entry,
          ): entry is { song: (typeof mockSongs)[number]; stats: SongStats } =>
            entry.stats !== undefined,
        )
        .sort(
          (left, right) =>
            right.stats.bracketWins - left.stats.bracketWins ||
            right.stats.wins - left.stats.wins ||
            left.stats.losses - right.stats.losses,
        )
        .slice(0, 10)
        .map(({ song, stats }) => ({
          songId: song.id,
          title: song.title,
          artists: song.artists,
          ...withWinRate(stats),
        }));
      await json(route, entries);
      return;
    }

    const statsMatch = pathname.match(/^\/api\/stats\/([A-Za-z0-9]{22})$/);
    if (method === "GET" && statsMatch) {
      const id = statsMatch[1] ?? "";
      const song = mockSongs.find((candidate) => candidate.id === id);
      const stats = backend.stats.get(id);
      if (!song || !stats) {
        await errorJson(route, 404, "No statistics exist for this song yet.");
        return;
      }
      await json(route, {
        songId: song.id,
        title: song.title,
        artists: song.artists,
        ...withWinRate(stats),
      });
      return;
    }

    backend.unhandledRoutes.push(`${method} ${pathname}`);
    await errorJson(route, 404, "Unhandled mock route.");
  });

  await page.route("https://open.spotify.com/**", async (route) => {
    backend.spotifyRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body>Mock Spotify player</body></html>",
    });
  });

  return backend;
};

test("plays a deterministic bracket against a mocked API", async ({ page }) => {
  const backend = await installMockBackend(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Song Battle" }),
  ).toBeVisible();
  await expect(
    page.getByText(/no battles have been recorded yet/i),
  ).toBeVisible();

  await page.getByRole("button", { name: /start battle/i }).click();
  await expect(page.getByRole("heading", { name: "Round 1" })).toBeVisible();
  await expect(
    page.locator('iframe[title^="Spotify player for Mock Song 1 "]'),
  ).toBeVisible();
  await expect(
    page.locator('iframe[title^="Spotify player for Mock Song 2 "]'),
  ).toBeVisible();

  for (let matchup = 1; matchup <= matchupsInBracket; matchup += 1) {
    const voteButton = page.getByRole("button", { name: "Vote" }).first();
    await expect(voteButton).toBeVisible({ timeout: 10_000 });
    await voteButton.click();
    if (matchup < matchupsInBracket) {
      await expect(page.getByText("Loading next battle...")).toBeVisible();
      await expect(page.getByText("Loading next battle...")).toBeHidden();
    }
  }

  await expect(page.getByRole("heading", { name: "Winner!" })).toBeVisible({
    timeout: 10_000,
  });

  expect(backend.songCountParams.length).toBeGreaterThan(0);
  expect(
    backend.songCountParams.every((count) => count === String(bracketSize)),
  ).toBe(true);
  expect(backend.votes).toHaveLength(matchupsInBracket);
  expect(backend.votes.map((vote) => vote.matchupNumber)).toEqual(
    Array.from({ length: matchupsInBracket }, (_, index) => index + 1),
  );
  expect(backend.completions).toEqual([{ sessionId, winnerSongId: songId(0) }]);
  expect(backend.unhandledRoutes).toEqual([]);
  expect(backend.spotifyRequests).toBeGreaterThan(0);

  const champion = backend.stats.get(songId(0));
  expect(champion).toEqual({
    wins: 4,
    losses: 0,
    appearances: 4,
    bracketWins: 1,
    bracketAppearances: 1,
  });
  const runnerUp = backend.stats.get(songId(8));
  expect(runnerUp).toEqual({
    wins: 3,
    losses: 1,
    appearances: 4,
    bracketWins: 0,
    bracketAppearances: 1,
  });
  expect(backend.stats.size).toBe(bracketSize);

  await expect(statValue(page, "Brackets won")).toHaveText("1");
  await expect(statValue(page, "Bracket appearances")).toHaveText("1");
  await expect(statValue(page, "Match wins")).toHaveText("4");
  await expect(statValue(page, "Match losses")).toHaveText("0");
  await expect(statValue(page, "Match appearances")).toHaveText("4");
  await expect(statValue(page, "Match win rate")).toHaveText("100%");

  await page.getByRole("button", { name: "Hall of Fame" }).click();
  await expect(page.getByText("1 bracket · 4 match wins")).toBeVisible();

  await page.getByRole("button", { name: "Play Again" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose your battle" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hall of Fame" }).click();
  await expect(page.getByText("Mock Song 1", { exact: true })).toBeVisible();
  await expect(page.getByText("1 bracket · 4 match wins")).toBeVisible();
});
