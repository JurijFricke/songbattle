import { describe, expect, it } from 'vitest';
import { createTrackEmbed } from './embed.js';

describe('createTrackEmbed', () => {
  it('creates the official Spotify track Embed data', () => {
    const embed = createTrackEmbed('4uLU6hMCjMI75M1A2tKUQC');

    expect(embed).toEqual({
      provider: 'spotify',
      contentType: 'track',
      spotifyId: '4uLU6hMCjMI75M1A2tKUQC',
      spotifyUri: 'spotify:track:4uLU6hMCjMI75M1A2tKUQC',
      embedUrl: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?utm_source=generator&theme=0',
    });
  });

  it('rejects malformed track IDs instead of creating arbitrary iframe URLs', () => {
    expect(() => createTrackEmbed('not-a-track-id')).toThrow(/invalid track ID/i);
  });
});
