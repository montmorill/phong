CREATE TABLE `user_bindings` (
	`username` text NOT NULL,
	`platform` text NOT NULL,
	`platform_id` text NOT NULL,
	PRIMARY KEY(`username`, `platform`),
	FOREIGN KEY (`username`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
