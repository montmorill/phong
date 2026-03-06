CREATE TABLE `user_follows` (
	`follower_username` text NOT NULL,
	`following_username` text NOT NULL,
	PRIMARY KEY(`follower_username`, `following_username`),
	FOREIGN KEY (`follower_username`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`following_username`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
