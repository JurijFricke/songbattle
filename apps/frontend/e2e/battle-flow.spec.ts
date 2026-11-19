import { expect, test } from "@playwright/test";
import {
  createEmptyStats,
  readStats,
  statValue,
  type SongStats,
} from "./helpers";

const playlistUrl = "https://open.spotify.com/playlist/3q9Fh1QK2OMBHh3FIHE7kV";

test("plays a complete playlist battle and records match and bracket statistics", async ({
  page,
  request,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Song Battle" }),
  ).toBeVisible();
  await page.getByLabel(/spotify playlist url/i).fill(playlistUrl);

  const songsResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === "/api/songs",
  );
  await page.getByRole("button", { name: /start battle/i }).click();

  const songsResponse = await songsResponsePromise;
  expect(songsResponse.ok()).toBe(true);
  const battle = (await songsResponse.json()) as {
    sessionId: string;
    songs: { id: string }[];
  };
  expect(battle.songs).toHaveLength(16);

  const baseline = new Map<string, SongStats>();
  for (const song of battle.songs) {
    baseline.set(song.id, await readStats(request, song.id));
  }

  const players = page.locator('iframe[title^="Spotify player for"]');
  await expect(players).toHaveCount(2, { timeout: 30_000 });
  await expect(players.first()).toHaveAttribute(
    "src",
    /https:\/\/open\.spotify\.com\/embed\/track\//,
  );

  for (let vote = 0; vote < 14; vote += 1) {
    await page.getByRole("button", { name: "Vote" }).first().click();
    await expect(
      page.getByRole("button", { name: "Vote" }).first(),
    ).toBeVisible({ timeout: 10_000 });
  }

  await page.getByRole("button", { name: "Vote" }).first().click();
  await expect(page.getByRole("heading", { name: "Winner!" })).toBeVisible({
    timeout: 10_000,
  });

  const winnerPlayer = page.locator('iframe[title^="Spotify player for"]');
  await expect(winnerPlayer).toHaveCount(1);
  const winnerSrc = await winnerPlayer.getAttribute("src");
  const winnerId = winnerSrc?.match(/\/embed\/track\/([A-Za-z0-9]{22})/)?.[1];
  if (!winnerId) throw new Error("Could not read the winner song ID.");

  const before = baseline.get(winnerId) ?? createEmptyStats();
  const after = await readStats(request, winnerId);

  expect(after.bracketWins - before.bracketWins).toBe(1);
  expect(after.bracketAppearances - before.bracketAppearances).toBe(1);
  expect(after.wins - before.wins).toBe(4);
  expect(after.losses - before.losses).toBe(0);
  expect(after.appearances - before.appearances).toBe(4);

  await expect(statValue(page, "Brackets won")).toHaveText(
    String(after.bracketWins),
  );
  await expect(statValue(page, "Bracket appearances")).toHaveText(
    String(after.bracketAppearances),
  );
  await expect(statValue(page, "Match wins")).toHaveText(String(after.wins));
  await expect(statValue(page, "Match appearances")).toHaveText(
    String(after.appearances),
  );

  await page.getByRole("button", { name: "Play Again" }).click();
  await page.getByRole("button", { name: /hall of fame/i }).click();
  await expect(
    page.getByRole("heading", { name: /hall of fame/i }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/match wins/i).first()).toBeVisible({
    timeout: 10_000,
  });
});
