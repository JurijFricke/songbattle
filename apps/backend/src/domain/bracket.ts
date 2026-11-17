import type { Song } from '@songbattle/contracts';

export const allowedBracketSizes = [16, 32, 64, 128, 256] as const;

const shuffle = <T>(items: readonly T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = result[index]!;
    const swap = result[swapIndex]!;
    result[index] = swap;
    result[swapIndex] = current;
  }
  return result;
};

const normalizeTitle = (title: string): string => title
  .toLowerCase()
  .replace(/\s*[([].*?(remaster|live|remix|edit|deluxe|version|mono|stereo|acoustic|anniversary|feat\.).*?[)\]]/gi, '')
  .replace(/\s+(with|feat\.?|featuring)\s+.*$/gi, '')
  .replace(/\s*[-–]\s*.*?(remaster|live|remix|edit|version|radio|acoustic).*$/gi, '')
  .replace(/[^\w\s]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const primaryArtist = (song: Song): string => song.artists[0]?.toLowerCase() ?? 'unknown';

export interface BracketResult {
  songs: Song[];
  effectiveCount: number;
  warning?: string;
}

export const selectBracket = (
  pool: readonly Song[],
  requestedCount: number,
  relaxArtistLimit: boolean,
): BracketResult => {
  const selected: Song[] = [];
  const artistCounts = new Map<string, number>();
  const seenTitles = new Set<string>();
  const shuffled = shuffle(pool);

  for (const artistLimit of [2, relaxArtistLimit ? Number.POSITIVE_INFINITY : 4]) {
    for (const song of shuffled) {
      if (selected.length >= requestedCount) break;
      const artist = primaryArtist(song);
      const titleKey = `${artist}:${normalizeTitle(song.title)}`;
      if (seenTitles.has(titleKey) || (artistCounts.get(artist) ?? 0) >= artistLimit) continue;
      selected.push(song);
      seenTitles.add(titleKey);
      artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
    }
    if (selected.length >= requestedCount) break;
  }

  const effectiveCount = [...allowedBracketSizes].reverse().find((size) => size <= selected.length);
  if (!effectiveCount) {
    throw new Error('Not enough unique songs for the minimum 16-song bracket.');
  }

  return {
    songs: selected.slice(0, effectiveCount),
    effectiveCount,
    ...(effectiveCount < requestedCount
      ? { warning: `Only enough songs were available for a ${effectiveCount}-song bracket.` }
      : {}),
  };
};
