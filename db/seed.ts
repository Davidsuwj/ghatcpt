export const seedRows:Record<string,Record<string,string|number>[]>={
 User:[{user_id:"u-demo-1",name:"陳同學",email:"chen@example.test"},{user_id:"u-demo-2",name:"林同學",email:"lin@example.test"},{user_id:"u-demo-3",name:"王同學",email:"wang@example.test"}],
 Chatbot:[{bot_id:"bot-deepseek-flash",name:"DeepSeek Flash",model_name:"deepseek-flash"}],
 KnowledgeBase:[{kb_id:"kb-db",name:"資料庫課程",description:"ERD、主鍵、外鍵與正規化的教學文件。"},{kb_id:"kb-project",name:"專案指引",description:"專案一需求與操作範圍。"}],
 Document:[
 {kb_id:"kb-db",document_no:1,title:"主鍵與複合主鍵",source_url:"",content:"主鍵用來唯一識別一筆資料，不可為 NULL，也不可重複。複合主鍵由兩個或多個欄位共同組成。例如 Message 使用 conversation_id 與 message_no 作為複合主鍵；不同對話可各自出現訊息序號 1。Document 使用 kb_id 與 document_no 作為複合主鍵，因此文件序號只須在同一知識庫中唯一。"},
 {kb_id:"kb-db",document_no:2,title:"外鍵與參照完整性",source_url:"",content:"外鍵用來連結被參照資料表的主鍵，確保參照完整性。MessageCitation 以前兩欄 conversation_id、message_no 組成複合外鍵指向 Message，後兩欄 kb_id、document_no 組成另一組複合外鍵指向 Document。刪除對話時採用 CASCADE 一併刪除訊息與引用；已被引用的文件採用 RESTRICT，避免來源失去追蹤。"},
 {kb_id:"kb-db",document_no:3,title:"弱實體與識別關係",source_url:"",content:"弱實體必須依賴擁有者實體與部分鍵才能唯一識別。訊息 Message 依赖 Conversation 與 message_no；文件 Document 依賴 KnowledgeBase 與 document_no。Chen ERD 以雙框表示弱實體、雙菱形表示識別關係，部分鍵以虛線底線表示。"},
 {kb_id:"kb-db",document_no:4,title:"第三正規化",source_url:"",content:"第一正規化要求欄位值具有原子性。第二正規化要求非鍵屬性完全相依於候選鍵，不可只依賴複合鍵的一部分。第三正規化排除非鍵屬性對候選鍵的遞移相依。例如使用者名稱與電子郵件保留在 User 中，不重複存入 Conversation；知識庫名稱保留在 KnowledgeBase 中，不重複存入 Document。"},
 {kb_id:"kb-project",document_no:1,title:"專案一繳交項目",source_url:"",content:"專案一需完成資料與功能需求分析、至少五個實體型態的 ERD、關聯綱目、可執行的資料庫應用系統。功能包含新增、刪除、修改、查詢與統計。報告需說明架構與工具、系統 URL、執行方式及代表性操作畫面。繳交日期為 2026 年 11 月 10 日。網站與資料庫均由 GPT Sites 提供，資料儲存於 Cloudflare D1。"},
 {kb_id:"kb-project",document_no:2,title:"對話與引用規則",source_url:"",content:"每段對話只屬於一位使用者及一個機器人，且允許空對話。機器人可使用多個知識庫，知識庫也可供多個機器人共用。只有 assistant 角色的訊息可引用文件，而且文件必須屬於該機器人已連結的知識庫。系統會檢索知識庫的相關段落，再由 DeepSeek Flash 整理回答，並保存實際引用的文件來源。"}],
 BotKnowledge:[{bot_id:"bot-deepseek-flash",kb_id:"kb-db"},{bot_id:"bot-deepseek-flash",kb_id:"kb-project"}],
 Conversation:[{conversation_id:"conv-demo-1",user_id:"u-demo-1",bot_id:"bot-deepseek-flash",title:"複合主鍵是什麼？",created_at:"2026-09-24T02:00:00.000Z"},{conversation_id:"conv-demo-2",user_id:"u-demo-2",bot_id:"bot-deepseek-flash",title:"專案需要繳交哪些項目？",created_at:"2026-09-24T02:05:00.000Z"}],
 Message:[{conversation_id:"conv-demo-1",message_no:1,role:"user",content:"複合主鍵是什麼？",sent_at:"2026-09-24T02:00:10.000Z"},{conversation_id:"conv-demo-1",message_no:2,role:"assistant",content:"文件摘錄：\n\n[1] 主鍵與複合主鍵\n複合主鍵由兩個或多個欄位共同組成。例如 Message 使用 conversation_id 與 message_no 作為複合主鍵；不同對話可各自出現訊息序號 1。",sent_at:"2026-09-24T02:00:11.000Z"},{conversation_id:"conv-demo-2",message_no:1,role:"user",content:"專案需要繳交哪些項目？",sent_at:"2026-09-24T02:05:10.000Z"},{conversation_id:"conv-demo-2",message_no:2,role:"assistant",content:"文件摘錄：\n\n[1] 專案一繳交項目\n專案一需完成資料與功能需求分析、至少五個實體型態的 ERD、關聯綱目、可執行的資料庫應用系統。功能包含新增、刪除、修改、查詢與統計。",sent_at:"2026-09-24T02:05:11.000Z"}],
 MessageCitation:[{conversation_id:"conv-demo-1",message_no:2,kb_id:"kb-db",document_no:1},{conversation_id:"conv-demo-2",message_no:2,kb_id:"kb-project",document_no:1}]
};
