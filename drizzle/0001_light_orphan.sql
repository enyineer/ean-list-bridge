PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ean_cache` (
	`ean` text PRIMARY KEY NOT NULL,
	`service` text,
	`name` text NOT NULL,
	`brand` text,
	`extra` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_ean_cache`("ean", "service", "name", "brand", "extra", "created_at", "updated_at") SELECT "ean", "service", "name", "brand", "extra", "created_at", "updated_at" FROM `ean_cache`;--> statement-breakpoint
DROP TABLE `ean_cache`;--> statement-breakpoint
ALTER TABLE `__new_ean_cache` RENAME TO `ean_cache`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ean_cache_ean_service_unique` ON `ean_cache` (`ean`,`service`);