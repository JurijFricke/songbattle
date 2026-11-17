import type { Song } from "@songbattle/contracts";
import { createTrackEmbed } from "./embed.js";
import type { SpotifyTrack } from "./types.js";

const spokenWordPattern = /hörbuch|audiobook|unabridged|part \d+|chapter \d+/i;
const maximumTrackDurationMs = 10 * 60 * 1000;
const minimumTrackPopularity = 2;

export const normalizeTrack = (track: SpotifyTrack): Song | null => {
  if (!track.id || track.is_local || track.artists.length === 0) return null;
  if (
    spokenWordPattern.test(track.name) ||
    spokenWordPattern.test(track.album.name)
  )
    return null;
  if (
    track.duration_ms > maximumTrackDurationMs ||
    track.popularity < minimumTrackPopularity
  )
    return null;

  const imageUrl = track.album.images[0]?.url;
  const song: Song = {
    id: track.id,
    title: track.name,
    artists: track.artists.map((artist) => artist.name),
    album: {
      name: track.album.name,
      ...(imageUrl ? { imageUrl } : {}),
    },
    ...(track.album.release_date
      ? { releaseDate: track.album.release_date }
      : {}),
    durationMs: track.duration_ms,
    popularity: track.popularity,
    spotify: createTrackEmbed(track.id),
  };

  return song;
};

export const deduplicateSongs = (songs: readonly Song[]): Song[] => {
  const uniqueSongs = new Map<string, Song>();
  for (const song of songs) uniqueSongs.set(song.id, song);
  return [...uniqueSongs.values()];
};
