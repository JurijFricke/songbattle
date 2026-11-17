import { describe, expect, it } from 'vitest';
import { normalizeTrack } from './normalizer.js';
import type { SpotifyTrack } from './types.js';

const track = (overrides: Partial<SpotifyTrack> = {}): SpotifyTrack => ({
  id: '4uLU6hMCjMI75M1A2tKUQC',
  name: 'Example Song',
  type: 'track',
  is_local: false,
  duration_ms: 180_000,
  popularity: 50,
  uri: 'spotify:track:4uLU6hMCjMI75M1A2tKUQC',
  artists: [{ name: 'Example Artist' }],
  album: { name: 'Example Album', release_date: '2024-01-01', images: [] },
  ...overrides,
});

describe('normalizeTrack', () => {
  it('returns structured song and Embed data', () => {
    const song = normalizeTrack(track());
    expect(song?.spotify.contentType).toBe('track');
    expect(song?.artists).toEqual(['Example Artist']);
    expect(song?.releaseDate).toBe('2024-01-01');
  });

  it('rejects local tracks and spoken-word content', () => {
    expect(normalizeTrack(track({ is_local: true }))).toBeNull();
    expect(normalizeTrack(track({ name: 'Audiobook Chapter 1' }))).toBeNull();
  });

  it('rejects tracks above the duration limit or popularity threshold', () => {
    expect(normalizeTrack(track({ duration_ms: 600_001 }))).toBeNull();
    expect(normalizeTrack(track({ popularity: 1 }))).toBeNull();
  });
});
