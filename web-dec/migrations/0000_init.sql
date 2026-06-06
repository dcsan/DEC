CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT 'Untitled decision' NOT NULL,
	`decision_type` text DEFAULT 'unknown' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`kind` text DEFAULT 'concept' NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`x` real DEFAULT 0 NOT NULL,
	`y` real DEFAULT 0 NOT NULL,
	`data` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `edges` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`source` text NOT NULL,
	`target` text NOT NULL,
	`label` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nodes_board_idx` ON `nodes` (`board_id`);--> statement-breakpoint
CREATE INDEX `edges_board_idx` ON `edges` (`board_id`);--> statement-breakpoint
CREATE INDEX `messages_board_idx` ON `messages` (`board_id`);
