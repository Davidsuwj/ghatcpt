export async function sendChat(id: string, content: string, onDelta: (text: string) => void) {
  const response = await fetch("/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: id, content, stream: true }),
  });
  if (!response.headers.get("Content-Type")?.includes("application/x-ndjson")) {
    const data: any = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || "無法傳送訊息。"), { status: response.status });
    return data;
  }
  if (!response.body) throw new Error("回覆傳輸中斷，請再試一次。");
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = "", result: any;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "delta") onDelta(event.text);
        if (event.type === "error") throw Object.assign(new Error(event.error), { status: event.status });
        if (event.type === "done") result = event;
      }
      if (done) break;
    }
    if (!result) throw new Error("回覆傳輸中斷，請再試一次。");
    return result;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
