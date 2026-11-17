import type { SpotifyEmbed } from '@songbattle/contracts';

const spotifyIdPattern = /^[A-Za-z0-9]{22}$/;

export const createTrackEmbed = (spotifyId: string): SpotifyEmbed => {
  if (!spotifyIdPattern.test(spotifyId)) {
    throw new Error('Cannot create a Spotify Embed for an invalid track ID.');
  }

  return {
    provider: 'spotify',
    contentType: 'track',
    spotifyId,
    spotifyUri: `spotify:track:${spotifyId}`,
    embedUrl: `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`,
  };
};
