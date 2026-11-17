import type { BattleSource, Song } from '@songbattle/contracts';
import {
  cachePlaylistSongs,
  getCachedPlaylistSongs,
  getRandomSongs,
  getSongsByReleaseYear,
  saveSongs,
} from '../database/repository.js';
import { selectBracket } from '../domain/bracket.js';
import { SpotifyClient } from '../spotify/client.js';
import { deduplicateSongs, normalizeTrack } from '../spotify/normalizer.js';

const genreQueries = [
  'genre:pop',
  'genre:rock',
  'genre:indie',
  'genre:hip-hop',
  'genre:r-n-b',
  'genre:alternative',
  'genre:dance',
  'genre:metal',
  'genre:latin',
  'genre:soul',
  'genre:reggae',
  'genre:country',
  'genre:folk',
  'genre:disco',
  'genre:german',
  'genre:german-hip-hop',
  'genre:neue-deutsche-welle',
  'genre:german-indie',
  'genre:deutschrock',
  'top hits',
] as const;

const decadeRanges = {
  '1970s': [1970, 1979],
  '1980s': [1980, 1989],
  '1990s': [1990, 1999],
  '2000s': [2000, 2009],
  '2010s': [2010, 2019],
  '2020s': [2020, 2029],
} as const;

const maximumPlaylistTracks = 1000;

export interface BattleSongsResult {
  songs: Song[];
  effectiveCount: number;
  warning?: string;
}

export const spotifyClient = new SpotifyClient({
  clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
  market: process.env.SPOTIFY_MARKET ?? 'DE',
});

const searchSongs = async (queries: readonly string[], yearRange?: string): Promise<Song[]> => {
  const results = await Promise.all(
    queries.map(async (query) => {
      const response = await spotifyClient.searchTracks(query, yearRange);
      return response.tracks.items.flatMap((track) => {
        const song = normalizeTrack(track);
        return song ? [song] : [];
      });
    }),
  );
  return deduplicateSongs(results.flat());
};

const extractPlaylistId = (playlistUrl: string): string | null => {
  try {
    const url = new URL(playlistUrl);
    if (url.protocol === 'spotify:') {
      const [, type, id] = url.pathname.split(':');
      return type === 'playlist' && id ? id : null;
    }
    if (url.hostname !== 'open.spotify.com') return null;
    const [type, id] = url.pathname.split('/').filter(Boolean);
    return type === 'playlist' && id && /^[A-Za-z0-9]+$/.test(id) ? id : null;
  } catch {
    return null;
  }
};

const getPlaylistSongs = async (playlistId: string): Promise<Song[]> => {
  const cachedSongs = await getCachedPlaylistSongs(playlistId);
  if (cachedSongs) return cachedSongs;

  const tracks: Song[] = [];
  for (let offset = 0; offset < maximumPlaylistTracks;) {
    const limit = Math.min(100, maximumPlaylistTracks - offset);
    const response = await spotifyClient.getPlaylistTracks(playlistId, offset, limit);
    const pageSongs = response.items.flatMap(({ track }) => {
      const song = track ? normalizeTrack(track) : null;
      return song ? [song] : [];
    });
    tracks.push(...pageSongs);
    offset += response.items.length;
    if (!response.next || response.items.length === 0) break;
  }

  const uniqueSongs = deduplicateSongs(tracks);
  if (uniqueSongs.length > 0) {
    await cachePlaylistSongs(playlistId, uniqueSongs);
  }
  return uniqueSongs;
};

const refreshGeneralPool = async (): Promise<Song[]> => {
  const queries = [...genreQueries].sort(() => Math.random() - 0.5).slice(0, 6);
  const freshSongs = await searchSongs(queries);
  await saveSongs(freshSongs);
  return freshSongs;
};

export const resolveBattleSongs = async (
  source: BattleSource,
  requestedCount: number,
): Promise<BattleSongsResult> => {
  let pool: Song[];
  let warning: string | undefined;
  let relaxArtistLimit = false;

  if (source.type === 'playlist') {
    const playlistId = extractPlaylistId(source.playlistUrl);
    if (!playlistId) throw new Error('The Spotify playlist URL is invalid.');
    pool = await getPlaylistSongs(playlistId);
    relaxArtistLimit = true;
  } else if (source.type === 'decade') {
    const [startYear, endYear] = decadeRanges[source.decade];
    pool = await getSongsByReleaseYear(startYear, endYear, requestedCount * 4);
    if (pool.length < requestedCount * 2) {
      const freshSongs = await searchSongs(['top hits', 'genre:pop', 'genre:rock', 'genre:dance'], `${startYear}-${endYear}`);
      await saveSongs(freshSongs);
      pool = await getSongsByReleaseYear(startYear, endYear, requestedCount * 4);
    }
  } else if (source.type === 'genre') {
    pool = await searchSongs([`genre:${source.genre}`]);
    await saveSongs(pool);
  } else {
    pool = await getRandomSongs(requestedCount * 4);
    if (pool.length < requestedCount * 2) pool = [...pool, ...(await refreshGeneralPool())];
  }

  if (pool.length < 16) {
    throw new Error('Not enough playable Spotify tracks are available for a 16-song bracket.');
  }

  const bracket = selectBracket(pool, requestedCount, relaxArtistLimit);
  warning = bracket.warning;
  return {
    songs: bracket.songs,
    effectiveCount: bracket.effectiveCount,
    ...(warning ? { warning } : {}),
  };
};
