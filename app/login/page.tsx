import { BookOpen,ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chatGPTSignInPath } from "@/app/chatgpt-auth";
export const dynamic="force-dynamic";
export default function Login(){return <main className="login-page"><a href="/" className="login-brand"><img className="brand-logo" src="/ghat-cpt-logo.png" alt="" width={36} height={36}/><span>GhatCPT</span></a><section className="login-card"><h1>登入</h1><Button asChild><a href={chatGPTSignInPath("/")} target="_top">使用 ChatGPT 帳號繼續<ArrowRight size={17}/></a></Button></section><span className="login-footer">GhatCPT</span></main>}
