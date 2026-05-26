CREATE TABLE `favorites` (
	`video_id` text PRIMARY KEY NOT NULL,
	`added_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `tracks`(`video_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` text NOT NULL,
	`played_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `tracks`(`video_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `history_video_id_idx` ON `history` (`video_id`);--> statement-breakpoint
CREATE INDEX `history_played_at_idx` ON `history` (`played_at`);--> statement-breakpoint
CREATE TABLE `lyrics` (
	`video_id` text PRIMARY KEY NOT NULL,
	`lrclib_id` integer,
	`track_name` text NOT NULL,
	`artist_name` text NOT NULL,
	`album_name` text,
	`duration` integer,
	`instrumental` integer DEFAULT false NOT NULL,
	`plain_lyrics` text,
	`synced_lyrics` text,
	`fetched_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `tracks`(`video_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lyrics_track_name_idx` ON `lyrics` (`track_name`);--> statement-breakpoint
CREATE INDEX `lyrics_artist_name_idx` ON `lyrics` (`artist_name`);--> statement-breakpoint
CREATE TABLE `playlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`playlist_id` integer NOT NULL,
	`video_id` text NOT NULL,
	`position` integer NOT NULL,
	`added_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`video_id`) REFERENCES `tracks`(`video_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playlist_items_playlist_position_unique_idx` ON `playlist_items` (`playlist_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `playlist_items_playlist_track_unique_idx` ON `playlist_items` (`playlist_id`,`video_id`);--> statement-breakpoint
CREATE INDEX `playlist_items_playlist_id_idx` ON `playlist_items` (`playlist_id`);--> statement-breakpoint
CREATE INDEX `playlist_items_video_id_idx` ON `playlist_items` (`video_id`);--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playlists_name_unique_idx` ON `playlists` (`name`);--> statement-breakpoint
CREATE TABLE `tracks` (
	`type` text DEFAULT 'SONG' NOT NULL,
	`video_id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Unknown' NOT NULL,
	`artist` text DEFAULT 'Unknown' NOT NULL,
	`duration` integer,
	`thumbnails` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tracks_artist_idx` ON `tracks` (`artist`);--> statement-breakpoint
CREATE INDEX `tracks_name_idx` ON `tracks` (`name`);