CREATE TABLE `ean_cache` (
	`ean` text PRIMARY KEY NOT NULL,
	`service` text,
	`name` text NOT NULL,
	`brand` text,
	`extra` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ean_cache_ean_service_unique` ON `ean_cache` (`ean`,`service`);