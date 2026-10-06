import {pgClient} from './pg-config.mjs';
const client=pgClient();
const updates=[
 ['課程原則上使用 PostgreSQL；此實作依專案負責人指定使用 GPT Sites D1，應與教師確認是否接受。','系統後端使用 PostgreSQL 16；網站部署於 GPT Sites，資料存放在課程提供的 project_17 資料庫之 ghatcpt 綱目。'],
 ['文件檢索模式採用關鍵字比對與原文摘錄，不會呼叫生成式模型。','系統會檢索知識庫的相關段落，再由 DeepSeek Flash 整理回答，並保存實際引用的文件來源。']];
try{
 await client.connect();await client.query('BEGIN');
 for(const [before,after] of updates){const r=await client.query('UPDATE "Document" SET content=replace(content,$1,$2) WHERE kb_id=\'kb-project\' AND document_no IN (1,2) AND strpos(content,$1)>0',[before,after]);console.log('Updated known system description: '+r.rowCount);}
 await client.query('COMMIT');
}catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
finally{await client.end().catch(()=>{});}
