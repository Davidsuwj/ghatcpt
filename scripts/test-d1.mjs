import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Miniflare} from 'miniflare';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});
const evidence=[];
try{
 const db=await mf.getD1Database('DB');
 for(const name of (await fs.readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort()){
  for(const sql of (await fs.readFile('drizzle/'+name,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 }
 const run=(sql,...values)=>db.prepare(sql).bind(...values).run();
 const reject=async(name,sql,...values)=>{await assert.rejects(run(sql,...values));evidence.push(name)};
 await db.batch([
  db.prepare('INSERT INTO User VALUES (?,?,?)').bind('u','Test','test@example.test'),
  db.prepare('INSERT INTO Chatbot VALUES (?,?,?)').bind('b','Test','deepseek-flash'),
  db.prepare('INSERT INTO KnowledgeBase VALUES (?,?,?)').bind('k','Test',''),
  db.prepare('INSERT INTO Document VALUES (?,1,?,?,?)').bind('k','Test','','Text'),
  db.prepare('INSERT INTO BotKnowledge SELECT ?,kb_id FROM KnowledgeBase WHERE true ON CONFLICT DO NOTHING').bind('b'),
  db.prepare('INSERT INTO Conversation (conversation_id,user_id,bot_id,title) VALUES (?,?,?,?)').bind('c','u','b','Test')]);
 const exchange=()=>db.batch([
  db.prepare("INSERT INTO Message SELECT ?,COALESCE(MAX(message_no),0)+1,'user','Question',? FROM Message WHERE conversation_id=?").bind('c','2026-10-06T01:00:00.000Z','c'),
  db.prepare("INSERT INTO Message SELECT ?,COALESCE(MAX(message_no),0)+1,'assistant','Answer [1]',? FROM Message WHERE conversation_id=?").bind('c','2026-10-06T01:00:00.000Z','c'),
  db.prepare('INSERT INTO MessageCitation SELECT ?,MAX(message_no),?,1 FROM Message WHERE conversation_id=?').bind('c','k','c')]);
 await Promise.all([exchange(),exchange()]);
 assert.deepEqual((await db.prepare('SELECT message_no,role FROM Message ORDER BY message_no').all()).results.map(r=>[r.message_no,r.role]),[[1,'user'],[2,'assistant'],[3,'user'],[4,'assistant']]);evidence.push('Concurrent D1 batches preserve message sequences and citations');
 await reject('Only assistant messages can cite','INSERT INTO MessageCitation VALUES (?,1,?,1)','c','k');
 await reject('Cited documents are protected','DELETE FROM Document WHERE kb_id=?','k');
 await reject('Cited knowledge links are protected','DELETE FROM BotKnowledge WHERE bot_id=?','b');
 await reject('Invalid message roles are rejected',"UPDATE Message SET role='other' WHERE message_no=1");
 await assert.rejects(db.batch([db.prepare("INSERT INTO KnowledgeBase VALUES ('rollback','Test','')"),db.prepare("INSERT INTO Message VALUES ('c',0,'user','Bad',CURRENT_TIMESTAMP)")]));
 assert.equal(await db.prepare("SELECT 1 FROM KnowledgeBase WHERE kb_id='rollback'").first(),null);evidence.push('Failed batch rolls back all writes');
 const daily=await db.prepare('SELECT date(sent_at) AS day,COUNT(*) AS messages FROM Message GROUP BY date(sent_at)').first();assert.equal(daily.day,'2026-10-06');assert.equal(daily.messages,4);
 const coverage=await db.prepare("SELECT COUNT(*) AS assistants,COALESCE(SUM((EXISTS(SELECT 1 FROM MessageCitation c WHERE c.conversation_id=m.conversation_id AND c.message_no=m.message_no))),0) AS cited FROM Message m WHERE role='assistant'").first();assert.deepEqual(coverage,{assistants:2,cited:2});evidence.push('SQLite daily statistics and citation coverage');
 await run('DELETE FROM Conversation WHERE conversation_id=?','c');
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM Message').first()).n,0);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM MessageCitation').first()).n,0);evidence.push('Conversation deletion cascades to messages and citations');
 console.log(JSON.stringify({status:'PASS',checks:evidence},null,2));
}finally{await mf.dispose()}
