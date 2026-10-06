# API 規格

同源路徑，皆需 Sites 已驗證的登入身分。未登入回 401。寫入需要 `Content-Type: application/json`；Origin 若存在必須與 request URL 同源。request body 上限 60,000 字元；JSON 格式錯誤回 400。

## GET /api/data

回傳 `{user,tables}`。tables 的 keys 固定為八張業務表，values 為列陣列。

- User 只有當前帳號；對話、訊息、引用只含目前使用者資料。
- Chatbot、KnowledgeBase、Document、BotKnowledge 為共享資料。
- 同步登入名稱／email，建立必要的內建模型設定。
- response `Cache-Control: private, no-store`。

## POST /api/records

建立白名單資料表的記錄：

```json
{"table":"Conversation","values":{"bot_id":"bot-deepseek-flash","title":"複合主鍵"}}
```

成功 201：`{"ok":true,"record":{...}}`。

ID 與時間 auto 欄位由伺服器產生；Conversation.user_id 固定綁定登入主體。若傳入其他人的 user_id，回 403。User 表所有 mutation 回 403。其餘非 auto 欄位必須提供（optional 文字可傳空字串）。

Document 範例：

```json
{"table":"Document","values":{"kb_id":"<knowledge-base-id>","document_no":1,"title":"主鍵","source_url":"","content":"主鍵用來唯一識別資料。"}}
```

## PUT /api/records

```json
{"table":"Conversation","keys":{"conversation_id":"<id>"},"values":{"user_id":"<current-user-id>","bot_id":"bot-deepseek-flash","title":"新標題"}}
```

成功 200：`{"ok":true,"record":{...}}`。完整 PK 放在 keys；values 提供該表可修改的非 auto 欄位。主鍵不可改，引用完整性由 DB 檢查。只有主鍵欄位的關聯表以新增／刪除維護，PUT 回 400。

## DELETE /api/records

```json
{"table":"Conversation","keys":{"conversation_id":"<id>"}}
```

成功 200：`{"ok":true}`。刪除個人對話會連同訊息與引用清除。指定他人的對話、訊息或引用回 404；不存在資料回 404。被其他資料參照／trigger 保護的資料回 409。

複合 PK 必須提供全部欄位，例如 Document keys 為 `{kb_id,document_no}`，MessageCitation keys 為四欄。

## POST /api/chat

```json
{"conversation_id":"<id>","content":"說明複合主鍵並附文件來源。","stream":true}
```

conversation_id 必須是自己的對話；content 需非空且不超過 4000 字元。支援的 model_name 為 deepseek-flash（或歷史 retrieval-v1 相容設定），實際 provider 一律 deepseek-flash；未支援模型回 409。

`stream:false` 或未傳 stream，成功回 JSON：

```json
{"ok":true,"mode":"deepseek","model":"deepseek-flash","citations":1,"messages":[],"references":[]}
```

messages 是該對話全部訊息，references 是該對話全部引用。citations 是此次新增回覆的有效來源數量。

`stream:true` 回 `application/x-ndjson; charset=utf-8`，每行一個事件：

```jsonl
{"type":"delta","text":"複合主鍵"}
{"type":"delta","text":"由多個欄位組成 [1]。"}
{"type":"done","ok":true,"mode":"deepseek","model":"deepseek-flash","citations":1,"messages":[],"references":[]}
```

上例陣列只展示格式；實際 done 附完整對話與引用。串流開始前的錯誤使用 HTTP 狀態碼；開始後錯誤為 NDJSON `{"type":"error","error":"...","status":503}`，即使 HTTP 已為 200，client 仍須將 error 視為失敗。只有收到 done 才能視為已完成保存。

生成完成才開啟 D1 batch，依序保存 user、assistant、有效引用。失敗不保存半段回覆。串流斷線與回覆保存之間仍可能有網路競態，client 重讀 `/api/data` 後再決定重送。此版本沒有 idempotency key。

## GET /api/stats

回傳 `{bots,knowledge,documents,daily,coverage}`。

| 欄位 | 列／數值 |
| --- | --- |
| bots | bot_id、name、conversations、messages（只計當前使用者） |
| knowledge | kb_id、name、documents（共享）、citations（個人） |
| documents | kb_id、document_no、title、citations，最多前 10 |
| daily | day（UTC）、messages，最多最近 14 個有訊息的日期 |
| coverage | assistants、cited；引用率為 cited / assistants |

## POST /api/seed

body `{}`。KnowledgeBase 為空時加入共享模型、知識庫、文件、連結。成功 `{ok:true}`；已有知識庫回 409。不建立假 User 或假個人對話。

## GET /api/ready

不要求站內登入，仍受 Sites 存取權保護。只執行 `SELECT 1`，不讀取業務資料，不揭露主機、帳號、DB 名稱或錯誤內容。

成功回傳 HTTP 200：`{"ok":true,"backend":"d1","connected":true}`；無法連線回 HTTP 503，`ok` 與 `connected` 為 false。回覆一律 `Cache-Control: no-store`。

## GET /api/health

登入後執行一個 D1 SELECT，成功範例：

```json
{"ok":true,"backend":"d1","binding":"DB","connected":true}
```

失敗回 503。只提供 backend、binding 與連通狀態，不提供密碼、SQL 或資料內容。

## 錯誤契約

一般錯誤 response：`{"error":"使用者可閱讀的簡短原因"}`。

| HTTP | 情況 |
| --- | --- |
| 400 | 缺欄位、非法角色／序號、PK 修改、JSON 錯誤、字數超限 |
| 401 | 未登入 |
| 403 | User mutation、偽造 user_id、跨來源寫入 |
| 404 | 資料不存在或非自己的對話（不洩漏他人記錄是否存在） |
| 409 | 重複鍵、FK / 引用規則衝突、未連線模型、重複 seed |
| 413 | request body 過長 |
| 415 | 非 JSON 寫入 |
| 429 | DeepSeek rate limit |
| 503 | DB 故障、AI 不可用、key 不可用／額度不足、空回覆、保存失敗 |
| 504 | AI 等候逾時 |

不回傳 provider 原始錯誤、SQL 或堆疊。API 個人資料回覆使用 no-store。
