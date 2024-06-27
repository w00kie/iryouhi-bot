CREATE TABLE `receipts` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`storage` text,
	`total` integer,
	`patient_name` text,
	`vendor_name` text,
	`bill_type` text,
	`processed` integer DEFAULT false,
	`issue_date` integer,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`storage` text NOT NULL,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`telegram_id` integer,
	`username` text,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_id_unique` ON `users` (`telegram_id`);