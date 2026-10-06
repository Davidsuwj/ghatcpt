import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='http://localhost:5173';const evidence=[];
let cookie='';
async function request(path,method='GET',data,extra={}){const res=await fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method!=='GET'?{'Content-Type':'application/json',Origin:base}:{}),...extra},body:data?JSON.stringify(data):undefined});return {status:res.status,data:await res.text().then(t=>{try{return JSON.parse(t)}catch{return {error:t}}})};}
function ok(name,test){assert.ok(test,name);evidence.push({test:name,result:'PASS'});}
let r=await request('/api/data');ok('未登入的讀取遭拒絕',r.status===401);
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});cookie=login.headers.get('set-cookie')?.split(';')[0]||'';assert.ok(cookie);
r=await request('/api/records','POST',{table:'User',values:{name:'test',email:'test@example.test'}},{Origin:'https://evil.example'});ok('跨來源寫入遭拒絕',r.status===403);
const initial=await request('/api/data');ok('讀取八張資料表',Object.keys(initial.data.tables).length===8);
const create=async(table,values)=>{const r=await request('/api/records','POST',{table,values});assert.equal(r.status,201,JSON.stringify(r));return r.data.record;};
const remove=async(table,keys)=>request('/api/records','DELETE',{table,keys});
const tag=Date.now();const u=initial.data.user;ok('登入身分自動綁定 User',u.user_id==='local_seedy'&&initial.data.tables.User.length===1);
ok('不顯示其他人的對話、訊息與引用',!initial.data.tables.Conversation.some(x=>x.user_id!==u.user_id)&&!initial.data.tables.Message.some(x=>x.conversation_id==='conv-demo-1')&&!initial.data.tables.MessageCitation.some(x=>x.conversation_id==='conv-demo-1'));
r=await request('/api/records','POST',{table:'Conversation',values:{user_id:'u-demo-1',bot_id:'bot-db',title:'forged'}});ok('拒絕偽造使用者',r.status===403);
for(const [table,keys] of [['Conversation',{conversation_id:'conv-demo-1'}],['Message',{conversation_id:'conv-demo-1',message_no:1}],['MessageCitation',{conversation_id:'conv-demo-1',message_no:2,kb_id:'kb-db',document_no:1}]]){r=await remove(table,keys);ok(`拒絕刪除他人的 ${table}`,r.status===404);}
r=await request('/api/chat','POST',{conversation_id:'conv-demo-1',content:'forged'});ok('拒絕在他人對話傳送訊息',r.status===404);
r=await request('/api/records','POST',{table:'Message',values:{conversation_id:'conv-demo-1',message_no:99,role:'user',content:'forged'}});ok('拒絕手動插入他人的訊息',r.status===404);
const b=await create('Chatbot',{name:'API 測試機器人',model_name:'retrieval-v1'});
const k=await create('KnowledgeBase',{name:'API 測試知識庫',description:'temporary'});
const k2=await create('KnowledgeBase',{name:'未連結知識庫',description:'temporary'});
await create('Document',{kb_id:k.kb_id,document_no:1,title:'測試複合主鍵',source_url:'',content:'複合主鍵由多個欄位共同識別資料。'});
await create('Document',{kb_id:k2.kb_id,document_no:1,title:'測試未連結文件',source_url:'',content:'不應引用。'});
await create('BotKnowledge',{bot_id:b.bot_id,kb_id:k.kb_id});
const c=await create('Conversation',{bot_id:b.bot_id,title:'API 測試對話'});
ok('建立主實體、弱實體與多對多連結',!!c.conversation_id);ok('後端自動填入登入使用者',c.user_id===u.user_id);
r=await request('/api/records','PUT',{table:'Conversation',keys:{conversation_id:c.conversation_id},values:{user_id:'u-demo-1',bot_id:b.bot_id,title:'forged'}});ok('拒絕轉移對話給他人',r.status===403);
r=await request('/api/records','POST',{table:'User',values:{name:'duplicate',email:u.email}});ok('不能手動建立假使用者',r.status===403);
r=await request('/api/records','POST',{table:'Document',values:{kb_id:k.kb_id,document_no:1,title:'duplicate',source_url:'',content:'x'}});ok('拒絕重複複合主鍵',r.status===409);
r=await request('/api/records','POST',{table:'Message',values:{conversation_id:c.conversation_id,message_no:0,role:'user',content:'x'}});ok('拒絕非正整數序號',r.status===400);
r=await request('/api/records','PUT',{table:'User',keys:{user_id:u.user_id},values:{name:'API 測試已修改',email:u.email}});ok('帳號姓名與 email 只能來自登入身分',r.status===403);
r=await request('/api/chat','POST',{conversation_id:c.conversation_id,content:'複合主鍵'});ok('對話自動保存訊息與引用',r.status===200&&r.data.citations===1);ok('增量回傳訊息與引用，無須重抓所有資料',r.data.messages?.length===2&&r.data.references?.length===1);
const data=(await request('/api/data')).data.tables;ok('保存後可重新讀取',data.Message.filter(x=>x.conversation_id===c.conversation_id).length===2&&data.MessageCitation.filter(x=>x.conversation_id===c.conversation_id).length===1);
r=await request('/api/records','POST',{table:'MessageCitation',values:{conversation_id:c.conversation_id,message_no:1,kb_id:k.kb_id,document_no:1}});ok('禁止使用者訊息引用文件',r.status===409);
r=await request('/api/records','POST',{table:'MessageCitation',values:{conversation_id:c.conversation_id,message_no:2,kb_id:k2.kb_id,document_no:1}});ok('禁止引用未連結知識庫',r.status===409);
r=await request('/api/records','PUT',{table:'Message',keys:{conversation_id:c.conversation_id,message_no:2},values:{conversation_id:c.conversation_id,message_no:2,role:'user',content:'bad'}});ok('禁止已引用訊息變更為使用者角色',r.status===409);
r=await remove('Document',{kb_id:k.kb_id,document_no:1});ok('保護已引用文件',r.status===409);
r=await remove('BotKnowledge',{bot_id:b.bot_id,kb_id:k.kb_id});ok('保護已有引用的知識庫連結',r.status===409);
r=await remove('User',{user_id:u.user_id});ok('保護登入帳號',r.status===403);
const concurrent=await Promise.all([request('/api/chat','POST',{conversation_id:c.conversation_id,content:'複合主鍵'}),request('/api/chat','POST',{conversation_id:c.conversation_id,content:'複合主鍵'})]);ok('並行聊天的交易與序號',concurrent.every(x=>x.status===200));
const after=(await request('/api/data')).data.tables;ok('並行請求產生六個不重複訊息序號',new Set(after.Message.filter(x=>x.conversation_id===c.conversation_id).map(x=>x.message_no)).size===6);
r=await request('/api/chat','POST',{conversation_id:c.conversation_id,content:'zzzzzzzz'});ok('查無來源時不生成引用',r.status===200&&r.data.citations===0);
const s=await request('/api/stats');ok('統計查詢與引用率',s.status===200&&s.data.coverage.assistants>=4&&s.data.coverage.cited>=3);
r=await remove('Conversation',{conversation_id:c.conversation_id});assert.equal(r.status,200);
const cleaned=(await request('/api/data')).data.tables;ok('刪除對話級聯刪除訊息和引用',!cleaned.Message.some(x=>x.conversation_id===c.conversation_id)&&!cleaned.MessageCitation.some(x=>x.conversation_id===c.conversation_id));
for(const [table,keys] of [['BotKnowledge',{bot_id:b.bot_id,kb_id:k.kb_id}],['Document',{kb_id:k.kb_id,document_no:1}],['Document',{kb_id:k2.kb_id,document_no:1}],['KnowledgeBase',{kb_id:k.kb_id}],['KnowledgeBase',{kb_id:k2.kb_id}],['Chatbot',{bot_id:b.bot_id}]]){const x=await remove(table,keys);assert.equal(x.status,200,table);}
ok('測試資料清理',true);fs.mkdirSync('../deliverables',{recursive:true});fs.writeFileSync('../deliverables/test-results.json',JSON.stringify({date:new Date().toISOString(),environment:'Local Vinext Worker + external PostgreSQL',results:evidence},null,2));console.log(JSON.stringify(evidence,null,2));

