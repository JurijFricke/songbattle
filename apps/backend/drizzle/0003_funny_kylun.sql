ALTER TABLE `song_stats` ADD `bracket_wins` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `song_stats` ADD `bracket_appearances` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
INSERT INTO `song_stats` (`song_id`, `wins`, `losses`, `appearances`, `bracket_wins`, `bracket_appearances`, `updated_at`)
SELECT
  `bss`.`song_id`,
  0,
  0,
  0,
  SUM(CASE WHEN `bs`.`winner_song_id` = `bss`.`song_id` THEN 1 ELSE 0 END),
  COUNT(*),
  CAST(strftime('%s', 'now') AS integer) * 1000
FROM `battle_session_songs` `bss`
INNER JOIN `battle_sessions` `bs` ON `bs`.`id` = `bss`.`session_id`
WHERE `bs`.`completed_at` IS NOT NULL
GROUP BY `bss`.`song_id`
ON CONFLICT (`song_id`) DO UPDATE SET
  `bracket_wins` = excluded.`bracket_wins`,
  `bracket_appearances` = excluded.`bracket_appearances`,
  `updated_at` = excluded.`updated_at`;