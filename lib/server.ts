import { db } from "@/db/raw";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export async function guard(request:Request,write=false){
 const user=await getChatGPTUser();if(!user)throw new HttpError(401,"請先登入。");
 if(write){const origin=request.headers.get("origin");if(origin && origin!==new URL(request.url).origin)throw new HttpError(403,"不接受跨站操作。");if(!request.headers.get("content-type")?.includes("application/json"))throw new HttpError(415,"請使用 JSON 格式。");}
 return user;
}
export async function body(request:Request){const text=await request.text();if(text.length>60000)throw new HttpError(413,"資料過長，請縮短內容。");try{return JSON.parse(text)}catch{throw new HttpError(400,"資料格式不正確。");}}
export function fail(error:unknown){
 if(error instanceof HttpError)return Response.json({error:error.message},{status:error.status});
 const code=typeof error==="object"&&error!==null&&"code" in error?String(error.code):"unknown";
 const message=error instanceof Error?error.message:"";
 console.error("Database/API operation failed",{code});
 if(code==="23505")return Response.json({error:"編號、電子郵件或這筆關聯已存在。"},{status:409});
 if(code==="23503")return Response.json({error:"資料仍被使用或參照的資料不存在。請先檢查對話、文件與關聯。"},{status:409});
 if(["citation_rule","linked_knowledge","cited_message"].some(rule=>message.includes(rule)))return Response.json({error:"引用規則不允許此操作，請先處理既有引用。"},{status:409});
 if(code==="23514"||code==="23502")return Response.json({error:"資料不符合欄位限制，請檢查序號與角色。"},{status:400});
 return Response.json({error:"資料暫時無法讀取或儲存，輸入內容已保留，請稍後再試。"},{status:503});
}

export async function syncUser(user:NonNullable<Awaited<ReturnType<typeof getChatGPTUser>>>){
 const profile={user_id:user.userId,name:user.fullName||user.email.split("@")[0],email:user.email.toLowerCase()};
 await db().prepare('INSERT INTO "User" (user_id,name,email) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,email=excluded.email WHERE "User".name<>excluded.name OR "User".email<>excluded.email').bind(profile.user_id,profile.name,profile.email).run();return profile;
}
export async function ownConversation(id:unknown,userId:string){
 if(typeof id!=="string")throw new HttpError(400,"缺少對話編號。");
 const record=await db().prepare('SELECT * FROM "Conversation" WHERE conversation_id=? AND user_id=?').bind(id,userId).first<{conversation_id:string;user_id:string;bot_id:string;title:string;created_at:string}>();
 if(!record)throw new HttpError(404,"找不到這段對話。");return record;
}
