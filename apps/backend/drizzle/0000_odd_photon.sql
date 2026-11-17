CREATE TABLE `battle_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`source_value` text,
	`requested_count` integer NOT NULL,
	`effective_count` integer NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`winner_song_id` text
);
--> statement-breakpoint
CREATE INDEX `battle_sessions_started_at_idx` ON `battle_sessions` (`started_at`);--> statement-breakpoint
CREATE TABLE `battle_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`matchup_number` integer NOT NULL,
	`winner_song_id` text NOT NULL,
	`loser_song_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `battle_votes_session_idx` ON `battle_votes` (`session_id`);--> statement-breakpoint
CREATE INDEX `battle_votes_winner_idx` ON `battle_votes` (`winner_song_id`);--> statement-breakpoint
CREATE INDEX `battle_votes_loser_idx` ON `battle_votes` (`loser_song_id`);--> statement-breakpoint
CREATE TABLE `cache_refresh_state` (
	`key` text PRIMARY KEY NOT NULL,
	`last_started_at` integer,
	`last_completed_at` integer,
	`last_error` text
);
--> statement-breakpoint
CREATE TABLE `playlist_cache` (
	`playlist_id` text PRIMARY KEY NOT NULL,
	`track_ids_json` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `playlist_cache_expiry_idx` ON `playlist_cache` (`expires_at`);--> statement-breakpoint
CREATE TABLE `song_stats` (
	`song_id` text PRIMARY KEY NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`appearances` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `songs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`artists_json` text NOT NULL,
	`album_name` text NOT NULL,
	`album_image_url` text,
	`release_date` text,
	`duration_ms` integer NOT NULL,
	`popularity` integer NOT NULL,
	`spotify_uri` text NOT NULL,
	`embed_url` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `songs_release_date_idx` ON `songs` (`release_date`);--> statement-breakpoint
CREATE INDEX `songs_popularity_idx` ON `songs` (`popularity`);