import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const songs = sqliteTable(
  'songs',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    artistsJson: text('artists_json').notNull(),
    albumName: text('album_name').notNull(),
    albumImageUrl: text('album_image_url'),
    releaseDate: text('release_date'),
    durationMs: integer('duration_ms').notNull(),
    popularity: integer('popularity').notNull(),
    spotifyUri: text('spotify_uri').notNull(),
    embedUrl: text('embed_url').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('songs_release_date_idx').on(table.releaseDate),
    index('songs_popularity_idx').on(table.popularity),
  ],
);

export const playlistCache = sqliteTable(
  'playlist_cache',
  {
    playlistId: text('playlist_id').primaryKey(),
    trackIdsJson: text('track_ids_json').notNull(),
    fetchedAt: integer('fetched_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [index('playlist_cache_expiry_idx').on(table.expiresAt)],
);

export const cacheRefreshState = sqliteTable('cache_refresh_state', {
  key: text('key').primaryKey(),
  lastStartedAt: integer('last_started_at'),
  lastCompletedAt: integer('last_completed_at'),
  lastError: text('last_error'),
});

export const battleSessions = sqliteTable(
  'battle_sessions',
  {
    id: text('id').primaryKey(),
    sourceType: text('source_type').notNull(),
    sourceValue: text('source_value'),
    requestedCount: integer('requested_count').notNull(),
    effectiveCount: integer('effective_count').notNull(),
    startedAt: integer('started_at').notNull(),
    completedAt: integer('completed_at'),
    winnerSongId: text('winner_song_id'),
  },
  (table) => [index('battle_sessions_started_at_idx').on(table.startedAt)],
);

export const battleVotes = sqliteTable(
  'battle_votes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id').notNull(),
    matchupNumber: integer('matchup_number').notNull(),
    winnerSongId: text('winner_song_id').notNull(),
    loserSongId: text('loser_song_id').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('battle_votes_session_idx').on(table.sessionId),
    index('battle_votes_winner_idx').on(table.winnerSongId),
    index('battle_votes_loser_idx').on(table.loserSongId),
  ],
);

export const songStats = sqliteTable(
  'song_stats',
  {
    songId: text('song_id').notNull(),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    appearances: integer('appearances').notNull().default(0),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.songId] })],
);

export type SongRow = typeof songs.$inferSelect;
export type NewSongRow = typeof songs.$inferInsert;
export type PlaylistCacheRow = typeof playlistCache.$inferSelect;
export type BattleSessionRow = typeof battleSessions.$inferSelect;
export type BattleVoteRow = typeof battleVotes.$inferSelect;
export type SongStatsRow = typeof songStats.$inferSelect;
