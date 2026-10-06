export type Row = Record<string,string|number>;
export type Field = {key:string;label:string;kind?:"long"|"email"|"url"|"number";ref?:string;options?:string[];optional?:boolean;auto?:boolean};
export type Spec = {label:string;singular:string;pk:string[];fields:Field[];note:string};
export const catalog:Record<string,Spec> = {
 User:{label:"使用者",singular:"使用者",pk:["user_id"],note:"發起對話的使用者資料；電子郵件不可重複。",fields:[{key:"user_id",label:"使用者編號",auto:true},{key:"name",label:"姓名"},{key:"email",label:"電子郵件",kind:"email"}]},
 Chatbot:{label:"聊天機器人",singular:"機器人",pk:["bot_id"],note:"內建模型為 DeepSeek Flash，檢索知識庫後生成回答並保存來源。",fields:[{key:"bot_id",label:"機器人編號",auto:true},{key:"name",label:"名稱"},{key:"model_name",label:"模型名稱"}]},
 KnowledgeBase:{label:"知識庫",singular:"知識庫",pk:["kb_id"],note:"知識庫可以由多個機器人共用。",fields:[{key:"kb_id",label:"知識庫編號",auto:true},{key:"name",label:"知識庫名稱"},{key:"description",label:"說明",kind:"long",optional:true}]},
 Document:{label:"文件",singular:"文件",pk:["kb_id","document_no"],note:"文件由「知識庫編號＋文件序號」唯一識別。已被引用的文件需先移除引用才能刪除。",fields:[{key:"kb_id",label:"所屬知識庫",ref:"KnowledgeBase"},{key:"document_no",label:"文件序號",kind:"number"},{key:"title",label:"文件標題"},{key:"source_url",label:"來源網址",kind:"url",optional:true},{key:"content",label:"文件內容",kind:"long"}]},
 Conversation:{label:"對話",singular:"對話",pk:["conversation_id"],note:"每段對話對應一位使用者和一個機器人。刪除對話會一併刪除其訊息與引用。",fields:[{key:"conversation_id",label:"對話編號",auto:true},{key:"user_id",label:"使用者",ref:"User"},{key:"bot_id",label:"機器人",ref:"Chatbot"},{key:"title",label:"對話標題"},{key:"created_at",label:"建立時間",auto:true}]},
 Message:{label:"訊息",singular:"訊息",pk:["conversation_id","message_no"],note:"訊息序號只在同一段對話內唯一。只有 assistant 角色可以引用文件。",fields:[{key:"conversation_id",label:"所屬對話",ref:"Conversation"},{key:"message_no",label:"訊息序號",kind:"number"},{key:"role",label:"角色",options:["user","assistant","system"]},{key:"content",label:"訊息內容",kind:"long"},{key:"sent_at",label:"傳送時間",auto:true}]},
 BotKnowledge:{label:"機器人知識庫",singular:"知識庫連結",pk:["bot_id","kb_id"],note:"設定每個機器人可以檢索的知識庫。已有對話引用的連結受到保護。",fields:[{key:"bot_id",label:"機器人",ref:"Chatbot"},{key:"kb_id",label:"知識庫",ref:"KnowledgeBase"}]},
 MessageCitation:{label:"訊息引用",singular:"引用",pk:["conversation_id","message_no","kb_id","document_no"],note:"四個欄位構成複合主鍵，分別以兩組複合外鍵指向訊息與文件。",fields:[{key:"conversation_id",label:"對話",ref:"Conversation"},{key:"message_no",label:"助理訊息序號",kind:"number"},{key:"kb_id",label:"知識庫",ref:"KnowledgeBase"},{key:"document_no",label:"文件序號",kind:"number"}]}
};
export const keysOf = (table:string,row:Row)=>Object.fromEntries(catalog[table].pk.map(k=>[k,row[k]]));
