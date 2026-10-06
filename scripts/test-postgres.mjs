import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PostgresDatabase} from '../db/postgres.ts';
import {pgClient} from './pg-config.mjs';
const config=pgClient().connectionParameters;
const db=new PostgresDatabase({host:config.host,port:config.port,user:config.user,password:config.password,database:config.database,ssl:config.ssl,options:config.options,connectionTimeoutMillis:8000});
const id='test-'+randomUUID(),user=id+'-user',bot=id+'-bot',kb=id+'-kb',conv=id+'-conv';
const run=(sql,...values)=>db.prepare(sql).bind(...values).run();
const evidence=[];const check=(name,test)=>{assert.ok(test,name);evidence.push(name)};
try{
 const quoted=await db.prepare("SELECT '?' AS literal,?::text AS value").bind("x' OR 1=1 --").first();
 check('bound parameters preserve SQL literals and injection strings',quoted.literal==='?'&&quoted.value==="x' OR 1=1 --");
 await db.batch([
  db.prepare('INSERT INTO "User" VALUES (?,?,?)').bind(user,'Test',user+'@example.test'),
  db.prepare('INSERT INTO "Chatbot" VALUES (?,?,?)').bind(bot,'Test','deepseek-flash'),
  db.prepare('INSERT INTO "KnowledgeBase" VALUES (?,?,?)').bind(kb,'Test','temporary'),
  db.prepare('INSERT INTO "Document" VALUES (?,1,?,\'\',?)').bind(kb,'Test','temporary'),
  db.prepare('INSERT INTO "BotKnowledge" VALUES (?,?)').bind(bot,kb),
  db.prepare('INSERT INTO "Conversation" (conversation_id,user_id,bot_id,title) VALUES (?,?,?,?)').bind(conv,user,bot,'Test')]);
 const exchange=()=>db.batch([
  db.prepare('INSERT INTO "Message" SELECT ?,COALESCE(MAX(message_no),0)+1,\'user\',\'Test\',now() FROM "Message" WHERE conversation_id=?').bind(conv,conv),
  db.prepare('INSERT INTO "Message" SELECT ?,COALESCE(MAX(message_no),0)+1,\'assistant\',\'Test [1]\',now() FROM "Message" WHERE conversation_id=?').bind(conv,conv),
  db.prepare('INSERT INTO "MessageCitation" SELECT ?,MAX(message_no),?,1 FROM "Message" WHERE conversation_id=?').bind(conv,kb,conv)],{conversationId:conv});
 await Promise.all([exchange(),exchange()]);
 const messages=(await db.prepare('SELECT message_no,role FROM "Message" WHERE conversation_id=? ORDER BY message_no').bind(conv).all()).results;
 check('concurrent exchanges keep unique adjacent message sequences',JSON.stringify(messages.map(x=>x.message_no))==='[1,2,3,4]'&&messages.map(x=>x.role).join(',')==='user,assistant,user,assistant');
 await assert.rejects(run('INSERT INTO "MessageCitation" VALUES (?,1,?,1)',conv,kb),e=>e.code==='23514');check('assistant-only citation trigger',true);
 await assert.rejects(run('DELETE FROM "Document" WHERE kb_id=?',kb),e=>e.code==='23503');check('cited documents are protected',true);
 await assert.rejects(run('DELETE FROM "BotKnowledge" WHERE bot_id=?',bot),e=>e.code==='23514');check('cited knowledge links are protected',true);
 const rollbackId=id+'-rollback';
 await assert.rejects(db.batch([
  db.prepare('INSERT INTO "Conversation" (conversation_id,user_id,bot_id,title) VALUES (?,?,?,\'rollback\')').bind(rollbackId,user,bot),
  db.prepare('INSERT INTO "Message" VALUES (?,0,\'user\',\'bad\',now())').bind(rollbackId)]),e=>e.code==='23514');
 check('failed batches roll back all prior writes',!(await db.prepare('SELECT 1 FROM "Conversation" WHERE conversation_id=?').bind(rollbackId).first()));
 await run('DELETE FROM "Conversation" WHERE conversation_id=?',conv);
 check('conversation deletion cascades to messages and citations',!(await db.prepare('SELECT 1 FROM "Message" WHERE conversation_id=?').bind(conv).first())&&!(await db.prepare('SELECT 1 FROM "MessageCitation" WHERE conversation_id=?').bind(conv).first()));
 console.log(JSON.stringify({status:'PASS',checks:evidence},null,2));
}finally{
 await run('DELETE FROM "Conversation" WHERE conversation_id=?',conv);
 await run('DELETE FROM "BotKnowledge" WHERE bot_id=?',bot);
 await run('DELETE FROM "Document" WHERE kb_id=?',kb);
 await run('DELETE FROM "KnowledgeBase" WHERE kb_id=?',kb);
 await run('DELETE FROM "Chatbot" WHERE bot_id=?',bot);
 await run('DELETE FROM "User" WHERE user_id=?',user);
}
