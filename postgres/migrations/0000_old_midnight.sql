CREATE SCHEMA "ghatcpt";
--> statement-breakpoint
CREATE TABLE "ghatcpt"."BotKnowledge" (
	"bot_id" text NOT NULL,
	"kb_id" text NOT NULL,
	CONSTRAINT "BotKnowledge_bot_id_kb_id_pk" PRIMARY KEY("bot_id","kb_id")
);
--> statement-breakpoint
CREATE TABLE "ghatcpt"."Chatbot" (
	"bot_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"model_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ghatcpt"."MessageCitation" (
	"conversation_id" text NOT NULL,
	"message_no" integer NOT NULL,
	"kb_id" text NOT NULL,
	"document_no" integer NOT NULL,
	CONSTRAINT "MessageCitation_conversation_id_message_no_kb_id_document_no_pk" PRIMARY KEY("conversation_id","message_no","kb_id","document_no")
);
--> statement-breakpoint
CREATE TABLE "ghatcpt"."Conversation" (
	"conversation_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bot_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ghatcpt"."Document" (
	"kb_id" text NOT NULL,
	"document_no" integer NOT NULL,
	"title" text NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT "Document_kb_id_document_no_pk" PRIMARY KEY("kb_id","document_no"),
	CONSTRAINT "document_positive_no" CHECK ("ghatcpt"."Document"."document_no">0)
);
--> statement-breakpoint
CREATE TABLE "ghatcpt"."KnowledgeBase" (
	"kb_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ghatcpt"."Message" (
	"conversation_id" text NOT NULL,
	"message_no" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Message_conversation_id_message_no_pk" PRIMARY KEY("conversation_id","message_no"),
	CONSTRAINT "message_positive_no" CHECK ("ghatcpt"."Message"."message_no">0),
	CONSTRAINT "message_role" CHECK ("ghatcpt"."Message"."role" IN ('user','assistant','system'))
);
--> statement-breakpoint
CREATE TABLE "ghatcpt"."User" (
	"user_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "user_name_nonempty" CHECK (length(trim("ghatcpt"."User"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "ghatcpt"."BotKnowledge" ADD CONSTRAINT "BotKnowledge_bot_id_Chatbot_bot_id_fk" FOREIGN KEY ("bot_id") REFERENCES "ghatcpt"."Chatbot"("bot_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghatcpt"."BotKnowledge" ADD CONSTRAINT "BotKnowledge_kb_id_KnowledgeBase_kb_id_fk" FOREIGN KEY ("kb_id") REFERENCES "ghatcpt"."KnowledgeBase"("kb_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghatcpt"."MessageCitation" ADD CONSTRAINT "MessageCitation_conversation_id_message_no_Message_conversation_id_message_no_fk" FOREIGN KEY ("conversation_id","message_no") REFERENCES "ghatcpt"."Message"("conversation_id","message_no") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghatcpt"."MessageCitation" ADD CONSTRAINT "MessageCitation_kb_id_document_no_Document_kb_id_document_no_fk" FOREIGN KEY ("kb_id","document_no") REFERENCES "ghatcpt"."Document"("kb_id","document_no") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghatcpt"."Conversation" ADD CONSTRAINT "Conversation_user_id_User_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "ghatcpt"."User"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghatcpt"."Conversation" ADD CONSTRAINT "Conversation_bot_id_Chatbot_bot_id_fk" FOREIGN KEY ("bot_id") REFERENCES "ghatcpt"."Chatbot"("bot_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghatcpt"."Document" ADD CONSTRAINT "Document_kb_id_KnowledgeBase_kb_id_fk" FOREIGN KEY ("kb_id") REFERENCES "ghatcpt"."KnowledgeBase"("kb_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghatcpt"."Message" ADD CONSTRAINT "Message_conversation_id_Conversation_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "ghatcpt"."Conversation"("conversation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_botknowledge_kb" ON "ghatcpt"."BotKnowledge" USING btree ("kb_id");--> statement-breakpoint
CREATE INDEX "idx_citation_document" ON "ghatcpt"."MessageCitation" USING btree ("kb_id","document_no");--> statement-breakpoint
CREATE INDEX "idx_conversation_user" ON "ghatcpt"."Conversation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_bot" ON "ghatcpt"."Conversation" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_created" ON "ghatcpt"."Conversation" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_email" ON "ghatcpt"."User" USING btree ("email");