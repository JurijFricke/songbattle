CREATE TABLE `battle_session_songs` (
	`session_id` text NOT NULL,
	`song_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`session_id`, `song_id`),
	FOREIGN KEY (`session_id`) REFERENCES `battle_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `battle_session_songs_session_idx` ON `battle_session_songs` (`session_id`);--> statement-breakpoint
DELETE FROM `battle_votes`
WHERE `id` NOT IN (
  SELECT MIN(`id`)
  FROM `battle_votes`
  GROUP BY `session_id`, `matchup_number`
);--> statement-breakpoint
CREATE UNIQUE INDEX `battle_votes_session_matchup_unique` ON `battle_votes` (`session_id`,`matchup_number`);
