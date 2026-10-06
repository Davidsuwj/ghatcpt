export type Doc={kb_id:string;document_no:number;title:string;content:string;source_url:string;excerpt?:string};
const stop=new Set(["什麼","如何","請問","可以","怎麼","的話","一下","說明","這個","那個","文件","知識","根據","請用","告訴"]);
function termsFor(text:string){
 const lower=text.toLowerCase();
 return [...new Set([...(lower.match(/[a-z0-9_]+/g)??[]),...(lower.match(/[\u3400-\u9fff]+/g)??[]).flatMap(s=>Array.from({length:Math.max(0,s.length-1)},(_,i)=>s.slice(i,i+2)))])].filter(t=>!stop.has(t));
}
export function retrieve(question:string,documents:Doc[],previousQuestion=""){
 const followup=question.length<100&&/(它|那個|這個|上述|剛才|前面|再說|詳細|繼續|為什麼|再舉|更多|其)/.test(question);
 const terms=termsFor(question+(followup?" "+previousQuestion:""));
 const ranked=documents.map(d=>{
  const title=d.title.toLowerCase();
  const passages=[];
  for(let start=0;start<d.content.length;start+=700){
   const text=d.content.slice(start,start+1000),lower=text.toLowerCase();
   const score=terms.reduce((n,t)=>n+(lower.includes(t)?1:0),0);
   passages.push({text,score,start});
  }
  passages.sort((a,b)=>b.score-a.score||a.start-b.start);
  const score=terms.reduce((n,t)=>n+(title.includes(t)?4:0),0)+(passages[0]?.score??0);
  const selected=passages.filter(p=>p.score>0).slice(0,4).sort((a,b)=>a.start-b.start);
  const excerpt=selected.length?selected.map(p=>p.text).join("\n[…]\n"):d.content.slice(0,4000);
  return {d:{...d,excerpt},score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.d.kb_id.localeCompare(b.d.kb_id)||a.d.document_no-b.d.document_no);
 const matched=ranked.filter(x=>x.score>=Math.max(1,(ranked[0]?.score??0)*0.3)).slice(0,4).map(x=>x.d);
 return {matched,content:matched.length?matched.map((d,i)=>`[${i+1}] ${d.title}\n${d.excerpt}`).join("\n\n"):"找不到相關文件。"};
}

