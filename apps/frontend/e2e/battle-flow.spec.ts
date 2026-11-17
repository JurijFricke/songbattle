import { expect, test } from '@playwright/test';

const playlistUrl = 'https://open.spotify.com/playlist/3q9Fh1QK2OMBHh3FIHE7kV';

test('plays a complete playlist battle and persists the winner statistic', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Song Battle' })).toBeVisible();
  await page.getByLabel(/spotify playlist url/i).fill(playlistUrl);
  await page.getByRole('button', { name: /start battle/i }).click();

  const players = page.locator('iframe[title^="Spotify player for"]');
  await expect(players).toHaveCount(2, { timeout: 30_000 });
  await expect(players.first()).toHaveAttribute('src', /https:\/\/open\.spotify\.com\/embed\/track\//);

  for (let vote = 0; vote < 14; vote += 1) {
    await page.getByRole('button', { name: 'Vote' }).first().click();
    await expect(page.getByRole('button', { name: 'Vote' }).first()).toBeVisible({ timeout: 10_000 });
  }

  await page.getByRole('button', { name: 'Vote' }).first().click();
  await expect(page.getByRole('heading', { name: 'Winner!' })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('iframe[title^="Spotify player for"]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Play Again' }).click();
  await page.getByRole('button', { name: /hall of fame/i }).click();
  await expect(page.getByText(/Wins/).first()).toBeVisible({ timeout: 10_000 });
});
