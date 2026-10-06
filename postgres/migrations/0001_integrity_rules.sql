CREATE FUNCTION ghatcpt.citation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM ghatcpt."Message" m
 JOIN ghatcpt."Conversation" c ON c.conversation_id=m.conversation_id
 JOIN ghatcpt."BotKnowledge" bk ON bk.bot_id=c.bot_id AND bk.kb_id=NEW.kb_id
 WHERE m.conversation_id=NEW.conversation_id AND m.message_no=NEW.message_no AND m.role='assistant')
 THEN RAISE EXCEPTION 'citation_rule' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER citation_guard BEFORE INSERT OR UPDATE ON ghatcpt."MessageCitation" FOR EACH ROW EXECUTE FUNCTION ghatcpt.citation_guard();

CREATE FUNCTION ghatcpt.message_role_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.role<>'assistant' AND EXISTS (SELECT 1 FROM ghatcpt."MessageCitation" WHERE conversation_id=OLD.conversation_id AND message_no=OLD.message_no)
 THEN RAISE EXCEPTION 'cited_message' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER message_role_guard BEFORE UPDATE OF role ON ghatcpt."Message" FOR EACH ROW EXECUTE FUNCTION ghatcpt.message_role_guard();

CREATE FUNCTION ghatcpt.knowledge_link_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.bot_id=OLD.bot_id AND NEW.kb_id=OLD.kb_id THEN RETURN NEW; END IF;
 IF EXISTS (SELECT 1 FROM ghatcpt."MessageCitation" mc JOIN ghatcpt."Conversation" c ON c.conversation_id=mc.conversation_id WHERE c.bot_id=OLD.bot_id AND mc.kb_id=OLD.kb_id)
 THEN RAISE EXCEPTION 'linked_knowledge' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER knowledge_link_guard BEFORE DELETE OR UPDATE ON ghatcpt."BotKnowledge" FOR EACH ROW EXECUTE FUNCTION ghatcpt.knowledge_link_guard();

CREATE FUNCTION ghatcpt.conversation_bot_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.bot_id<>OLD.bot_id AND EXISTS (SELECT 1 FROM ghatcpt."Message" WHERE conversation_id=OLD.conversation_id)
 THEN RAISE EXCEPTION 'linked_knowledge' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER conversation_bot_guard BEFORE UPDATE OF bot_id ON ghatcpt."Conversation" FOR EACH ROW EXECUTE FUNCTION ghatcpt.conversation_bot_guard();
