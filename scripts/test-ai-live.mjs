import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='http://localhost:5173';
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=login.headers.get('set-cookie').split(';')[0];
const headers={Cookie:cookie,Origin:base,'Content-Type':'application/json'};
async function req(path,method='GET',data){const response=await fetch(base+path,{method,headers,body:data?JSON.stringify(data):undefined});const json=await response.json();assert.ok(response.ok,JSON.stringify({status:response.status,error:json.error}));return json;}
const data=await req('/api/data');const bot=data.tables.Chatbot.find(b=>b.bot_id==='bot-deepseek-flash');assert.ok(bot);
const c=(await req('/api/records','POST',{table:'Conversation',values:{bot_id:bot.bot_id,title:'DeepSeek 串流驗證'}})).record;
const evidence=[];
try{
 const start=Date.now();const response=await fetch(base+'/api/chat',{method:'POST',headers,body:JSON.stringify({conversation_id:c.conversation_id,content:'請記住我的代號 ORBIT-731。依據知識庫，用兩句話說明複合主鍵，並標示來源。',stream:true})});
 assert.ok(response.ok);assert.ok(response.headers.get('content-type').includes('ndjson'));
 let buffer='',answer='',deltas=0,result,firstMs;const decoder=new TextDecoder();
 for await(const chunk of response.body){buffer+=decoder.decode(chunk,{stream:true});let n;while((n=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,n);buffer=buffer.slice(n+1);if(!line)continue;const e=JSON.parse(line);if(e.type==='error')throw Error(e.error);if(e.type==='delta'){answer+=e.text;deltas++;firstMs??=Date.now()-start;}if(e.type==='done')result=e;}}
 assert.ok(answer.length>5);assert.ok(deltas>1);assert.equal(result.model,'deepseek-flash');assert.ok(result.citations>0);assert.equal(result.messages.length,2);
 evidence.push({test:'真實 DeepSeek 串流、保存與引用',status:'PASS',deltas,firstMs,totalMs:Date.now()-start,answer});
 const follow=await req('/api/chat','POST',{conversation_id:c.conversation_id,content:'我的測試代號是什麼？只輸出代號。'});
 const last=follow.messages.at(-1).content;assert.ok(last.includes('ORBIT-731'));assert.equal(follow.messages.length,4);
 evidence.push({test:'後續追問使用對話歷史',status:'PASS',reply:last});
 const restored=await req('/api/data');assert.equal(restored.tables.Message.filter(m=>m.conversation_id===c.conversation_id).length,4);assert.ok(restored.tables.MessageCitation.some(m=>m.conversation_id===c.conversation_id));
 evidence.push({test:'重新讀取保留 AI 對話和引用',status:'PASS'});
 fs.writeFileSync('../deliverables/deepseek-live-test.json',JSON.stringify({at:new Date().toISOString(),results:evidence},null,2));console.log(JSON.stringify(evidence,null,2));
}finally{await req('/api/records','DELETE',{table:'Conversation',keys:{conversation_id:c.conversation_id}})}
