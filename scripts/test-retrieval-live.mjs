import assert from 'node:assert/strict';
import fs from 'node:fs';
import {retrieve} from '../lib/retrieve.ts';
import {buildMessages} from '../lib/deepseek.ts';
const tail='星芒計畫的驗證代號為 NEBULA-8462；保管箱位於紫色書櫃第三層。';
const content='這是無關的背景段落。'.repeat(900)+'\n'+tail;
const doc={kb_id:'test',document_no:1,title:'測試手冊',content,source_url:''};
const matches=retrieve('星芒計畫的驗證代號？',[doc]).matched;
assert.ok(matches[0].excerpt.includes(tail));
assert.ok(buildMessages([],'代號？',matches)[0].content.includes('NEBULA-8462'));
assert.ok(retrieve('它的保管箱在哪裡？',[doc],'星芒計畫的驗證代號？').matched.length);
assert.equal(retrieve('zzzzzzzz',[doc]).matched.length,0);

const base='http://localhost:5173';
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:base,'Content-Type':'application/json'};
async function req(path,method='GET',data){const r=await fetch(base+path,{method,headers,body:data?JSON.stringify(data):undefined});const j=await r.json();assert.ok(r.ok,JSON.stringify({status:r.status,error:j.error}));return j;}
const create=async(table,values)=>(await req('/api/records','POST',{table,values})).record;
const del=async(table,keys)=>req('/api/records','DELETE',{table,keys});
const initial=await req('/api/data');
assert.ok(!initial.tables.Chatbot.some(b=>['資料庫助教','課程小幫手'].includes(b.name)));
const k=await create('KnowledgeBase',{name:'全文檢索自動驗證',description:'temporary'});
const conversations=[],evidence=[];
try{
 await create('Document',{kb_id:k.kb_id,document_no:1,title:doc.title,content,source_url:''});
 const c=await create('Conversation',{bot_id:'bot-deepseek-flash',title:'全文檢索驗證'});conversations.push(c.conversation_id);
 const result=await req('/api/chat','POST',{conversation_id:c.conversation_id,content:'請查知識庫，星芒計畫的驗證代號是什麼？附來源。'});
 assert.equal(result.model,'deepseek-flash');assert.ok(result.messages.at(-1).content.includes('NEBULA-8462'));
 assert.ok(result.references.some(r=>r.kb_id===k.kb_id));
 evidence.push({test:'新知識庫自動可搜尋、長文件尾端檢索、真實 AI 與來源保存',result:'PASS',answer:result.messages.at(-1).content});
 const follow=await req('/api/chat','POST',{conversation_id:c.conversation_id,content:'它的保管箱在哪裡？附來源。'});
 assert.ok(follow.messages.at(-1).content.includes('紫色書櫃'));assert.ok(follow.references.some(r=>r.message_no===4&&r.kb_id===k.kb_id));
 evidence.push({test:'追問解析與同一文件引用',result:'PASS',answer:follow.messages.at(-1).content});
 const oldBot=initial.tables.Chatbot.find(b=>b.bot_id==='bot-db');
 if(oldBot){
  const old=await create('Conversation',{bot_id:oldBot.bot_id,title:'舊助理相容驗證'});conversations.push(old.conversation_id);
  const answer=await req('/api/chat','POST',{conversation_id:old.conversation_id,content:'星芒計畫的驗證代號？請依文件回答並附來源。'});
  assert.equal(answer.model,'deepseek-flash');assert.ok(answer.messages.at(-1).content.includes('NEBULA-8462'));assert.ok(answer.references.some(r=>r.kb_id===k.kb_id));
  evidence.push({test:'歷史助理 ID 統一 DeepSeek Flash 與全部知識庫',result:'PASS'});
 }
}finally{
 for(const id of conversations)await del('Conversation',{conversation_id:id});
 const clean=await req('/api/data');
 assert.ok(!clean.tables.Message.some(m=>conversations.includes(m.conversation_id)));
 assert.ok(!clean.tables.MessageCitation.some(m=>conversations.includes(m.conversation_id)));
 for(const link of clean.tables.BotKnowledge.filter(x=>x.kb_id===k.kb_id))await del('BotKnowledge',{bot_id:link.bot_id,kb_id:k.kb_id});
 await del('Document',{kb_id:k.kb_id,document_no:1});await del('KnowledgeBase',{kb_id:k.kb_id});
}
evidence.push({test:'刪除對話、訊息、來源及清理測試資料',result:'PASS'});
fs.writeFileSync('../deliverables/retrieval-live-test.json',JSON.stringify({at:new Date().toISOString(),results:evidence},null,2));
console.log(JSON.stringify(evidence,null,2));
