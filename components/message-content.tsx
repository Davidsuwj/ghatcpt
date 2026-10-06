"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MessageContent({text}:{text:string}) {
  return <div className="markdown-content"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
    a: ({href,children}) => href && /^https?:\/\//i.test(href) ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
    img: ({alt}) => <span>{alt}</span>,
  }}>{text}</Markdown></div>;
}
