import { expect, type APIRequestContext, type Page } from "@playwright/test";

export interface SongStats {
  wins: number;
  losses: number;
  appearances: number;
  bracketWins: number;
  bracketAppearances: number;
}

export const createEmptyStats = (): SongStats => ({
  wins: 0,
  losses: 0,
  appearances: 0,
  bracketWins: 0,
  bracketAppearances: 0,
});

export const readStats = async (
  request: APIRequestContext,
  songId: string,
): Promise<SongStats> => {
  const response = await request.get(`/api/stats/${songId}`);
  if (response.status() === 404) return createEmptyStats();
  expect(response.ok()).toBe(true);
  return (await response.json()) as SongStats;
};

export const statValue = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator("xpath=following-sibling::dd");
