import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pgClient} from './pg-config.mjs';
const path=process.argv[2];if(!path)throw Error('Usage: node --env-file=.env.local scripts/import-d1-snapshot.mjs <private-snapshot.json>');
const snapshot=JSON.parse(await fs.readFile(path,'utf8'));
const tables={User:['user_id','name','email'],Chatbot:['bot_id','name','model_name'],KnowledgeBase:['kb_id','name','description'],Conversation:['conversation_id','user_id','bot_id','title','created_at'],Document:['kb_id','document_no','title','source_url','content'],BotKnowledge:['bot_id','kb_id'],Message:['conversation_id','message_no','role','content','sent_at'],MessageCitation:['conversation_id','message_no','kb_id','document_no']};
const client=pgClient();const evidence=[];
try{
 await client.connect();await client.query('BEGIN');
 for(const [table,columns] of Object.entries(tables)){
  assert.ok(Array.isArray(snapshot.tables[table]),'Incomplete snapshot: '+table);
  // Cutover imports into empty app tables. A rerun is intentionally rejected.
  assert.equal(Number((await client.query(`SELECT COUNT(*) AS n FROM "${table}"`)).rows[0].n),0,'Target must be empty: '+table);
  for(const row of snapshot.tables[table]){
   assert.deepEqual(Object.keys(row).sort(),[...columns].sort(),'Unexpected columns: '+table);
   await client.query(`INSERT INTO "${table}" (${columns.map(c=>'"'+c+'"').join(',')}) VALUES (${columns.map((_,i)=>'$'+(i+1)).join(',')})`,columns.map(c=>row[c]));
  }
  const actual=(await client.query(`SELECT * FROM "${table}"`)).rows;
  const normalize=rows=>rows.map(row=>JSON.stringify(Object.fromEntries(columns.map(c=>[c,c.endsWith('_at')?new Date(row[c]).toISOString():row[c]])))).sort();
  assert.deepEqual(normalize(actual),normalize(snapshot.tables[table]),'Content mismatch: '+table);
  evidence.push({table,rows:actual.length,contentVerified:true});
 }
 await client.query('COMMIT');await fs.mkdir('../deliverables',{recursive:true});
 await fs.writeFile('../deliverables/postgres-migration.json',JSON.stringify({at:new Date().toISOString(),database:process.env.PGDATABASE,schema:'ghatcpt',tables:evidence},null,2));
 console.log(JSON.stringify(evidence));
}catch(error){await client.query('ROLLBACK').catch(()=>{});console.error('Import failed',{code:error.code||'unknown',message:error.message});process.exitCode=1;}
finally{await client.end().catch(()=>{});}
