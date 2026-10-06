CREATE TABLE `BotKnowledge` (
	`bot_id` text NOT NULL,
	`kb_id` text NOT NULL,
	PRIMARY KEY(`bot_id`, `kb_id`),
	FOREIGN KEY (`bot_id`) REFERENCES `Chatbot`(`bot_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`kb_id`) REFERENCES `KnowledgeBase`(`kb_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_botknowledge_kb` ON `BotKnowledge` (`kb_id`);--> statement-breakpoint
CREATE TABLE `Chatbot` (
	`bot_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`model_name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `MessageCitation` (
	`conversation_id` text NOT NULL,
	`message_no` integer NOT NULL,
	`kb_id` text NOT NULL,
	`document_no` integer NOT NULL,
	PRIMARY KEY(`conversation_id`, `message_no`, `kb_id`, `document_no`),
	FOREIGN KEY (`conversation_id`,`message_no`) REFERENCES `Message`(`conversation_id`,`message_no`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`kb_id`,`document_no`) REFERENCES `Document`(`kb_id`,`document_no`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_citation_document` ON `MessageCitation` (`kb_id`,`document_no`);--> statement-breakpoint
CREATE TABLE `Conversation` (
	`conversation_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bot_id` text NOT NULL,
	`title` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `User`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`bot_id`) REFERENCES `Chatbot`(`bot_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_conversation_user` ON `Conversation` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_conversation_bot` ON `Conversation` (`bot_id`);--> statement-breakpoint
CREATE INDEX `idx_conversation_created` ON `Conversation` (`created_at`);--> statement-breakpoint
CREATE TABLE `Document` (
	`kb_id` text NOT NULL,
	`document_no` integer NOT NULL,
	`title` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`kb_id`, `document_no`),
	FOREIGN KEY (`kb_id`) REFERENCES `KnowledgeBase`(`kb_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "document_positive_no" CHECK("Document"."document_no">0)
);
--> statement-breakpoint
CREATE TABLE `KnowledgeBase` (
	`kb_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Message` (
	`conversation_id` text NOT NULL,
	`message_no` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`sent_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`conversation_id`, `message_no`),
	FOREIGN KEY (`conversation_id`) REFERENCES `Conversation`(`conversation_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "message_positive_no" CHECK("Message"."message_no">0),
	CONSTRAINT "message_role" CHECK("Message"."role" IN ('user','assistant','system'))
);
--> statement-breakpoint
CREATE TABLE `User` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	CONSTRAINT "user_name_nonempty" CHECK(length(trim("User"."name")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_email` ON `User` (`email`);