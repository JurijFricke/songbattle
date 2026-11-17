import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import type { Song } from '@songbattle/contracts';
import { db } from './client.js';
import { playlistCache, songs, type NewSongRow, type SongRow } from './schema.js';

const now = (): number => Date.now();

const releaseYearFromSong = (song: Song): number => {
  const year = song.releaseDate ? Number.parseInt(song.releaseDate.slice(0, 4), 10) : 0;
  return Number.isInteger(year) ? year : 0;
};

const toSongRow = (song: Song, timestamp: number): NewSongRow => ({
  id: song.id,
  title: song.title,
  artistsJson: JSON.stringify(song.artists),
  albumName: song.album.name,
  ...(song.album.imageUrl ? { albumImageUrl: song.album.imageUrl } : {}),
  ...(song.releaseDate ? { releaseDate: song.releaseDate } : {}),
  releaseYear: releaseYearFromSong(song),
  durationMs: song.durationMs,
  popularity: song.popularity,
  spotifyUri: song.spotify.spotifyUri,
  embedUrl: song.spotify.embedUrl,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const parseArtists = (value: string): string[] => {
  try {
    const artists: unknown = JSON.parse(value);
    return Array.isArray(artists) && artists.every((artist): artist is string => typeof artist === 'string')
      ? artists
      : [];
  } catch {
    return [];
  }
};

const rowToSong = (row: SongRow): Song => ({
  id: row.id,
  title: row.title,
  artists: parseArtists(row.artistsJson),
  album: {
    name: row.albumName,
    ...(row.albumImageUrl ? { imageUrl: row.albumImageUrl } : {}),
  },
  ...(row.releaseDate ? { releaseDate: row.releaseDate } : {}),
  durationMs: row.durationMs,
  popularity: row.popularity,
  spotify: {
    provider: 'spotify',
    contentType: 'track',
    spotifyId: row.id,
    spotifyUri: row.spotifyUri,
    embedUrl: row.embedUrl,
  },
});

export const saveSongs = async (songsToSave: readonly Song[]): Promise<void> => {
  if (songsToSave.length === 0) return;
  const timestamp = now();
  const values = songsToSave.map((song) => toSongRow(song, timestamp));

  await db.insert(songs).values(values).onConflictDoUpdate({
    target: songs.id,
    set: {
      title: sql`excluded.title`,
      artistsJson: sql`excluded.artists_json`,
      albumName: sql`excluded.album_name`,
      albumImageUrl: sql`excluded.album_image_url`,
      releaseDate: sql`excluded.release_date`,
      releaseYear: sql`excluded.release_year`,
      durationMs: sql`excluded.duration_ms`,
      popularity: sql`excluded.popularity`,
      spotifyUri: sql`excluded.spotify_uri`,
      embedUrl: sql`excluded.embed_url`,
      updatedAt: timestamp,
    },
  });
};

const selectSongs = async (conditions: ReturnType<typeof and> | undefined, limit: number): Promise<Song[]> => {
  const rows = await db
    .select()
    .from(songs)
    .where(conditions)
    .orderBy(sql`RANDOM()`)
    .limit(limit);
  return rows.map(rowToSong);
};

export const getRandomSongs = (limit: number): Promise<Song[]> => selectSongs(undefined, limit);

export const getSongsByReleaseYear = (startYear: number, endYear: number, limit: number): Promise<Song[]> =>
  selectSongs(and(gte(songs.releaseYear, startYear), lte(songs.releaseYear, endYear)), limit);

export const getSongCount = async (): Promise<number> => {
  const rows = await db.select({ count: sql<number>`count(*)` }).from(songs);
  return rows[0]?.count ?? 0;
};

export const getSongsByIds = async (ids: readonly string[]): Promise<Song[]> => {
  if (ids.length === 0) return [];
  const rows = await db.select().from(songs).where(inArray(songs.id, [...ids]));
  const songsById = new Map(rows.map((row) => [row.id, rowToSong(row)]));
  return ids.flatMap((id) => {
    const song = songsById.get(id);
    return song ? [song] : [];
  });
};

const playlistCacheTtlMs = 24 * 60 * 60 * 1000;

export const getCachedPlaylistSongs = async (playlistId: string): Promise<Song[] | null> => {
  const row = await db.query.playlistCache.findFirst({
    where: eq(playlistCache.playlistId, playlistId),
  });
  if (!row || row.expiresAt <= now()) return null;

  try {
    const ids: unknown = JSON.parse(row.trackIdsJson);
    if (!Array.isArray(ids) || !ids.every((id): id is string => typeof id === 'string')) return null;
    const cachedSongs = await getSongsByIds(ids);
    return cachedSongs.length > 0 ? cachedSongs : null;
  } catch {
    return null;
  }
};

export const cachePlaylistSongs = async (playlistId: string, cachedSongs: readonly Song[]): Promise<void> => {
  if (cachedSongs.length === 0) return;
  await saveSongs(cachedSongs);
  const fetchedAt = now();
  await db.insert(playlistCache).values({
    playlistId,
    trackIdsJson: JSON.stringify(cachedSongs.map((song) => song.id)),
    fetchedAt,
    expiresAt: fetchedAt + playlistCacheTtlMs,
  }).onConflictDoUpdate({
    target: playlistCache.playlistId,
    set: {
      trackIdsJson: JSON.stringify(cachedSongs.map((song) => song.id)),
      fetchedAt,
      expiresAt: fetchedAt + playlistCacheTtlMs,
    },
  });
};
