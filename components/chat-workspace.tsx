"use client";
import { useEffect,useLayoutEffect,useRef,useState } from "react";
import { ArrowDown,ArrowUp,Check,ChevronDown,Copy,FileText,LoaderCircle,MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu,DropdownMenuContent,DropdownMenuTrigger,DropdownMenuLabel,DropdownMenuRadioGroup,DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { MessageContent } from "@/components/message-content";
import { Row } from "@/lib/catalog";
import { toast } from "sonner";

export function ModelMenu({bots,value,onChange,disabled}:{bots:Row[];value:string;onChange:(id:string)=>void;disabled:boolean}){
 const current=bots.find(b=>b.bot_id===value);
 return <DropdownMenu><DropdownMenuTrigger asChild><button className="model-trigger" aria-label="選擇模型" disabled={disabled}><span>{current?.name||"GhatCPT"}</span><ChevronDown size={17}/></button></DropdownMenuTrigger><DropdownMenuContent align="start" sideOffset={10} className="model-menu"><DropdownMenuLabel>模型</DropdownMenuLabel><DropdownMenuRadioGroup value={value} onValueChange={onChange}>{bots.map(b=><DropdownMenuRadioItem key={b.bot_id} value={String(b.bot_id)} className="model-item"><span><b>{b.name}</b><small>{b.model_name==="retrieval-v1"?"文件檢索":b.model_name==="deepseek-flash"?"AI · 文件檢索":`${b.model_name} · 尚未連線`}</small></span></DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>;
}

function CopyMessage({text}:{text:string}){
 const[copied,setCopied]=useState(false);
 useEffect(()=>{if(!copied)return;const timer=setTimeout(()=>setCopied(false),1800);return()=>clearTimeout(timer)},[copied]);
 return <button className="copy-message" aria-label={copied?"已複製":"複製回覆"} title={copied?"已複製":"複製"} onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true)}catch{toast.error("無法複製，請選取文字複製。")}}}>{copied?<Check size={16}/>:<Copy size={16}/>}</button>;
}

type Props={id:string;messages:Row[];references:Row[];documents:Row[];draft:string;setDraft:(s:string)=>void;onSend:()=>void;onSource:(r:Row)=>void;loading:boolean;disabled:boolean;pending:{id:string;content:string;answer?:string}|null;noModels:boolean;onSeed:()=>void;seeding:boolean;modelName:string;modelId:string;sendError:string;onClearError:()=>void};
export function ChatWorkspace({id,messages,references,documents,draft,setDraft,onSend,onSource,loading,disabled,pending,noModels,onSeed,seeding,modelName,modelId,sendError,onClearError}:Props){
 const scroller=useRef<HTMLDivElement>(null),textarea=useRef<HTMLTextAreaElement>(null),nearBottom=useRef(true),positions=useRef(new Map<string,number>()),lastId=useRef(id);
 const[showBottom,setShowBottom]=useState(false);const activePending=pending?.id===id?pending:null;const empty=!messages.length&&!activePending;
 const bottom=(smooth=false)=>{const el=scroller.current;if(el)el.scrollTo({top:el.scrollHeight,behavior:smooth&&!matchMedia("(prefers-reduced-motion: reduce)").matches?"smooth":"instant"});nearBottom.current=true;setShowBottom(false)};
 useLayoutEffect(()=>{const el=scroller.current;if(!el)return;if(empty){el.scrollTop=0;lastId.current=id;nearBottom.current=true;setShowBottom(false);return;}if(lastId.current!==id){lastId.current=id;el.scrollTop=positions.current.get(id)??el.scrollHeight;nearBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<100;setShowBottom(!nearBottom.current)}else if(nearBottom.current)bottom();},[id,messages.length,activePending,loading]);
 useLayoutEffect(()=>{const el=textarea.current;if(el){el.style.height="0px";el.style.height=`${Math.min(200,Math.max(48,el.scrollHeight))}px`}},[draft]);
 useEffect(()=>{if(matchMedia("(min-width: 768px)").matches)textarea.current?.focus()},[id]);
 return <div className={`chat-workspace ${empty?"is-empty":""}`}>
  <div className="chat-scroll" ref={scroller} onScroll={()=>{const el=scroller.current;if(!el)return;positions.current.set(id,el.scrollTop);nearBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<100;setShowBottom(!nearBottom.current)}}>
   {loading?<div className="chat-loading" role="status"><LoaderCircle className="spin" size={22}/><span className="sr-only">載入對話</span></div>:empty?<div className="welcome"><div className="welcome-mark"><img src="/ghat-cpt-logo.png" alt="GhatCPT" width={68} height={68}/></div><h1>有什麼可以幫你的？</h1>{noModels&&<Button onClick={onSeed} disabled={seeding}>{seeding?"準備中…":"開始使用"}</Button>}</div>:<div className="messages" role="log" aria-label="對話訊息" aria-live="polite" aria-relevant="additions">
    {messages.map(m=><article key={`${m.conversation_id}-${m.message_no}`} className={`message ${m.role}`}><div className="message-role">{m.role==="assistant"?"GhatCPT":m.role==="user"?"你":"系統"}</div><div className="message-text">{m.role==="assistant"?<MessageContent text={String(m.content)}/>:m.content}</div>{m.role==="assistant"&&<><div className="message-sources">{references.filter(c=>c.conversation_id===m.conversation_id&&c.message_no===m.message_no).map(c=>{const d=documents.find(d=>d.kb_id===c.kb_id&&d.document_no===c.document_no);return d?<button className="citation-chip" key={`${c.kb_id}-${c.document_no}`} onClick={()=>onSource(d)}><FileText size={14}/>{d.title}</button>:null})}</div><CopyMessage text={String(m.content)}/></>}</article>)}
    {activePending&&<><article className="message user entering"><div className="message-text">{activePending.content}</div></article>{activePending.answer?<article className="message assistant streaming"><MessageContent text={activePending.answer}/><span className="stream-cursor" aria-label="正在回覆"/></article>:<div className="thinking" role="status" aria-label="正在回覆"><span/><span/><span/></div>}</>}
   </div>}
  </div>
  <div className="composer-wrap">{showBottom&&<Button className="scroll-bottom" variant="outline" size="icon" aria-label="回到最新訊息" onClick={()=>bottom(true)}><ArrowDown size={18}/></Button>}
   {sendError&&<div className="send-error" role="alert"><span>{sendError}</span><button onClick={onClearError}>關閉</button></div>}
   <form className="composer" onSubmit={e=>{e.preventDefault();nearBottom.current=true;onSend()}}>
    <Textarea ref={textarea} aria-label="訊息" placeholder="傳送訊息給 GhatCPT" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={4000} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing&&e.keyCode!==229){e.preventDefault();nearBottom.current=true;onSend()}}}/>
    <div className="composer-actions"><span>{modelName}</span><Button type="submit" size="icon" aria-label="傳送訊息" disabled={disabled||!draft.trim()||noModels}>{pending?<LoaderCircle className="spin" size={18}/>:<ArrowUp size={20}/>}</Button></div>
   </form>
   {empty&&!noModels&&!loading&&<div className="prompt-chips">{["什麼是複合主鍵？","專案繳交項目","說明外鍵"].map(q=><button key={q} onClick={()=>{setDraft(q);textarea.current?.focus()}}>{q}</button>)}</div>}
   {!empty&&<div className="composer-note">{modelId==="deepseek-flash"?"DeepSeek Flash":"文件檢索"}</div>}
  </div>
 </div>;
}
