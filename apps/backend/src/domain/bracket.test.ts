import { describe, expect, it } from 'vitest';
import type { Song } from '@songbattle/contracts';
import { selectBracket } from './bracket.js';

const songs = (count: number): Song[] => Array.from({ length: count }, (_, index) => ({
  id: `4uLU6hMCjMI75M${String(index).padStart(2, '0')}QC`,
  title: `Song ${index}`,
  artists: [`Artist ${index % 8}`],
  album: { name: `Album ${index}` },
  durationMs: 180_000,
  popularity: 50,
  spotify: {
    provider: 'spotify',
    contentType: 'track',
    spotifyId: `4uLU6hMCjMI75M${String(index).padStart(2, '0')}QC`,
    spotifyUri: `spotify:track:4uLU6hMCjMI75M${String(index).padStart(2, '0')}QC`,
    embedUrl: `https://open.spotify.com/embed/track/4uLU6hMCjMI75M${String(index).padStart(2, '0')}QC`,
  },
}));

describe('selectBracket', () => {
  it('returns the requested power-of-two bracket', () => {
    const result = selectBracket(songs(64), 16, false);
    expect(result.songs).toHaveLength(16);
    expect(result.effectiveCount).toBe(16);
    expect(result.warning).toBeUndefined();
  });

  it('downsized when the source cannot fill the requested bracket', () => {
    const result = selectBracket(songs(20), 32, false);
    expect(result.effectiveCount).toBe(16);
    expect(result.songs).toHaveLength(16);
    expect(result.warning).toBeDefined();
  });

  it('rejects sources that cannot fill the minimum bracket', () => {
    expect(() => selectBracket(songs(8), 16, false)).toThrow(/minimum 16/i);
  });
});
