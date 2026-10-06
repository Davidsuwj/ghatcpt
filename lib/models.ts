import { db } from "@/db/raw";
import { DEEPSEEK_BOT,DEEPSEEK_MODEL } from "@/lib/deepseek";

// Preserve historical foreign keys; retired roles are excluded from model choices.
export async function ensureDeepSeekModel() {
  await db().batch([
    db().prepare('INSERT INTO "Chatbot" (bot_id,name,model_name) VALUES (?,?,?) ON CONFLICT DO NOTHING').bind(DEEPSEEK_BOT,"DeepSeek Flash",DEEPSEEK_MODEL),
    db().prepare(`UPDATE "Chatbot" SET name='DeepSeek Flash',model_name=? WHERE bot_id IN (?,?,?) AND (name<>'DeepSeek Flash' OR model_name<>?)`).bind(DEEPSEEK_MODEL,DEEPSEEK_BOT,"bot-db","bot-guide",DEEPSEEK_MODEL),
    db().prepare(`DELETE FROM "BotKnowledge" WHERE bot_id IN ('bot-db','bot-guide') AND NOT EXISTS (SELECT 1 FROM "Conversation" c WHERE c.bot_id="BotKnowledge".bot_id)`),
    db().prepare(`DELETE FROM "Chatbot" WHERE bot_id IN ('bot-db','bot-guide') AND NOT EXISTS (SELECT 1 FROM "Conversation" c WHERE c.bot_id="Chatbot".bot_id)`),
  ]);
}

// New shared knowledge bases are available on the next message, including old chats.
export async function connectSharedKnowledge(botId:string) {
  if (![DEEPSEEK_BOT,"bot-db","bot-guide"].includes(botId)) return;
  await db().prepare('INSERT INTO "BotKnowledge" (bot_id,kb_id) SELECT ?,kb_id FROM "KnowledgeBase" ON CONFLICT DO NOTHING').bind(botId).run();
}
