CREATE TRIGGER citation_insert_guard BEFORE INSERT ON MessageCitation
WHEN NOT EXISTS (SELECT 1 FROM Message m JOIN Conversation c ON c.conversation_id=m.conversation_id JOIN BotKnowledge bk ON bk.bot_id=c.bot_id AND bk.kb_id=NEW.kb_id WHERE m.conversation_id=NEW.conversation_id AND m.message_no=NEW.message_no AND m.role='assistant')
BEGIN SELECT RAISE(ABORT, 'citation_rule'); END;
--> statement-breakpoint
CREATE TRIGGER citation_update_guard BEFORE UPDATE ON MessageCitation
WHEN NOT EXISTS (SELECT 1 FROM Message m JOIN Conversation c ON c.conversation_id=m.conversation_id JOIN BotKnowledge bk ON bk.bot_id=c.bot_id AND bk.kb_id=NEW.kb_id WHERE m.conversation_id=NEW.conversation_id AND m.message_no=NEW.message_no AND m.role='assistant')
BEGIN SELECT RAISE(ABORT, 'citation_rule'); END;
--> statement-breakpoint
CREATE TRIGGER message_role_guard BEFORE UPDATE OF role ON Message
WHEN NEW.role <> 'assistant' AND EXISTS (SELECT 1 FROM MessageCitation mc WHERE mc.conversation_id=OLD.conversation_id AND mc.message_no=OLD.message_no)
BEGIN SELECT RAISE(ABORT, 'cited_message'); END;
--> statement-breakpoint
CREATE TRIGGER knowledge_unlink_guard BEFORE DELETE ON BotKnowledge
WHEN EXISTS (SELECT 1 FROM MessageCitation mc JOIN Conversation c ON c.conversation_id=mc.conversation_id WHERE c.bot_id=OLD.bot_id AND mc.kb_id=OLD.kb_id)
BEGIN SELECT RAISE(ABORT, 'linked_knowledge'); END;
--> statement-breakpoint
CREATE TRIGGER knowledge_link_update_guard BEFORE UPDATE ON BotKnowledge
WHEN (NEW.bot_id<>OLD.bot_id OR NEW.kb_id<>OLD.kb_id) AND EXISTS (SELECT 1 FROM MessageCitation mc JOIN Conversation c ON c.conversation_id=mc.conversation_id WHERE c.bot_id=OLD.bot_id AND mc.kb_id=OLD.kb_id)
BEGIN SELECT RAISE(ABORT, 'linked_knowledge'); END;
--> statement-breakpoint
CREATE TRIGGER conversation_bot_guard BEFORE UPDATE OF bot_id ON Conversation
WHEN NEW.bot_id<>OLD.bot_id AND EXISTS (SELECT 1 FROM Message WHERE conversation_id=OLD.conversation_id)
BEGIN SELECT RAISE(ABORT, 'linked_knowledge'); END;
