CREATE TABLE `config_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`mcp_instance_id` text NOT NULL,
	`config_json` text NOT NULL,
	`author` text,
	`diff_summary` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`mcp_instance_id`) REFERENCES `mcp_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` text PRIMARY KEY NOT NULL,
	`mcp_instance_id` text NOT NULL,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`tags` text,
	`correlation_id` text,
	`payload` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`mcp_instance_id`) REFERENCES `mcp_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mcp_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`uptime` integer DEFAULT 0,
	`host` text,
	`port` integer,
	`pid` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `metrics_timeseries` (
	`id` text PRIMARY KEY NOT NULL,
	`mcp_instance_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`cpu_percent` real,
	`memory_rss` integer,
	`memory_heap` integer,
	`avg_execution_time` real,
	`tasks_throughput` integer,
	FOREIGN KEY (`mcp_instance_id`) REFERENCES `mcp_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `operation_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`mcp_instance_id` text NOT NULL,
	`command_type` text NOT NULL,
	`target_task_id` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`mcp_instance_id`) REFERENCES `mcp_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `task_history` (
	`id` text PRIMARY KEY NOT NULL,
	`mcp_instance_id` text NOT NULL,
	`task_id` text NOT NULL,
	`event_type` text NOT NULL,
	`details` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`mcp_instance_id`) REFERENCES `mcp_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks_runtime` (
	`id` text PRIMARY KEY NOT NULL,
	`mcp_instance_id` text NOT NULL,
	`task_id` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0,
	`execution_time` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`mcp_instance_id`) REFERENCES `mcp_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`password_hash` text,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);