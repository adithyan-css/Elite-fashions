CREATE TABLE `admin_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'owner' NOT NULL,
	`session_version` integer DEFAULT 1 NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_uq` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `counters` (
	`key` text PRIMARY KEY NOT NULL,
	`value` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`invoice_no` text NOT NULL,
	`fy` text NOT NULL,
	`seq` integer NOT NULL,
	`snapshot` text NOT NULL,
	`issued_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_no_uq` ON `invoices` (`invoice_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_fy_seq_uq` ON `invoices` (`fy`,`seq`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_order_uq` ON `invoices` (`order_id`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ip` text NOT NULL,
	`email` text NOT NULL,
	`success` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_attempts_ip_idx` ON `login_attempts` (`ip`,`created_at`);--> statement-breakpoint
CREATE INDEX `login_attempts_email_idx` ON `login_attempts` (`email`,`created_at`);--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`status` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer,
	`name` text NOT NULL,
	`design_no` text DEFAULT '' NOT NULL,
	`size_label` text NOT NULL,
	`unit_price_paise` integer NOT NULL,
	`qty` integer NOT NULL,
	`image_url` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_no` text NOT NULL,
	`status` text DEFAULT 'awaiting_payment' NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`fulfilment` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`subtotal_paise` integer NOT NULL,
	`discount_paise` integer DEFAULT 0 NOT NULL,
	`total_paise` integer NOT NULL,
	`view_token` text NOT NULL,
	`stock_applied` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_no_uq` ON `orders` (`order_no`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`method` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`received_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`url` text NOT NULL,
	`alt` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_images_product_idx` ON `product_images` (`product_id`);--> statement-breakpoint
CREATE TABLE `product_sizes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`label` text NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_sizes_uq` ON `product_sizes` (`product_id`,`label`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`design_no` text DEFAULT '' NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`colour` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price_paise` integer NOT NULL,
	`mrp_paise` integer,
	`tags` text DEFAULT '' NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`group_key` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_uq` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
