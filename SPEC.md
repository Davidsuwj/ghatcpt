# GhatCPT 系統規格

版本：1.0.0 · 更新日期：2026-10-06 · 狀態：GPT Sites D1 實作

## 1. 目標與範圍

建立具登入、個人對話、共享知識庫、真實 AI 回答及文件引用的資料庫課程應用系統。界面採聊天布局，保留精簡文字，品牌為 GhatCPT 與使用者提供的 logo。

網站與 API 使用 GPT Sites；資料庫使用 GPT Sites 的 Cloudflare D1，透過 `DB` binding 維持原 ERD。模型統一使用 `deepseek-flash`。原「資料庫助教」「課程小幫手」從選單移除，歷史對話不被刪除。

## 2. 使用者與資料權限

| 對象 | 能力 | 邊界 |
| --- | --- | --- |
| 尚未登入 | 進入登入頁 | 不可讀寫 API 資料 |
| 有 Site 存取權且登入的成員 | 聊天、維護共享知識庫、檢視統計 | 只可操作自己的對話、訊息與引用 |
| Site owner | 另可管理 Sites 部署、環境、分享權限 | 不會因身分而在站內 API 自動看見所有人的對話 |

User 主鍵取自受信任的 Sites 登入主體。姓名及 email 由登入資料同步；站內不提供人工新增、切換、修改或刪除帳號。Chatbot、KnowledgeBase、Document、BotKnowledge 為共享資源；本版所有獲允許的登入成員皆可維護，沒有另一套角色權限。

## 3. 功能需求與驗收

| ID | 需求 | 驗收條件 |
| --- | --- | --- |
| AUTH-01 | 登入／登出 | `/login` 可登入；登出可回登入頁；未登入 API 回 401 |
| AUTH-02 | 使用者隔離 | 指定他人的 conversation_id 讀寫／刪除皆回 404 |
| CHAT-01 | 建立空對話 | 自動產生 ID、登入 user_id、建立時間；允許尚無訊息 |
| CHAT-02 | 發送與串流 | 1–4000 字訊息；先顯示問題，逐段呈現真實 DeepSeek 回覆 |
| CHAT-03 | 上下文 | 保留最近最多 20 則 user/assistant 訊息，32,000 字元预算 |
| CHAT-04 | 更名／刪除 | 個人側欄與頁面選單可操作；刪除有確認並 CASCADE 訊息、引用 |
| CHAT-05 | 歷史相容 | 舊助理 ID 仍可使用 DeepSeek Flash；模型選單只提供內建單一模型 |
| KB-01 | 知識庫及文件 CRUD | 支援新增、修改、搜尋、刪除與 JSON 匯出；遵守 PK / FK / trigger |
| KB-02 | 檢索 | 從允許的知識庫全文中取得相關段落，長文件尾端亦可命中 |
| KB-03 | 引用 | 回覆中有效 [n] 來源寫入 MessageCitation，點來源可查看原文 |
| KB-04 | 新資料生效 | 內建 AI 下一次發問自動納入新增的共享知識庫 |
| DATA-01 | 八表應用 | API 及界面可操作 ERD 所定義的八張業務資料表 |
| STAT-01 | 統計 | 顯示個人對話量、訊息、每日量、引用率，及共享文件／知識庫數據 |
| UX-01 | 操作流暢 | 支援 IME、Shift+Enter、複製、捲動保留、返回最新、行動側欄 |
| OPS-01 | 可重建與部署 | lockfile、環境範本、schema migrations、操作文件與 CI 均納入 repo |

## 4. 資料與完整性

六個實體：User、Chatbot、Conversation、Message、KnowledgeBase、Document。
兩個關聯表：BotKnowledge、MessageCitation。

- Message 為依賴 Conversation 的弱實體，PK `(conversation_id,message_no)`。
- Document 為依賴 KnowledgeBase 的弱實體，PK `(kb_id,document_no)`。
- BotKnowledge PK `(bot_id,kb_id)`。
- MessageCitation PK 四欄，兩組 composite FK 分別參照 Message、Document。
- 正序號、合法訊息角色、唯一 email、非空姓名由 D1 SQLite 約束保護。
- 只有 assistant 可引用，且文件必須在該對話 bot 的連結知識庫中。
- 已被引用的文件、知識庫連結與助理角色受保護；已有訊息的對話不可改 bot_id。
- 刪除 Conversation 級聯刪除 Message 及 MessageCitation。

資料字典、索引、刪除規則與 ERD：[DATABASE](docs/DATABASE.md)。

## 5. 回答與檢索流程

1. 驗證登入、同源 JSON、訊息格式與對話擁有者。
2. 內建模型及歷史助理加入全部共享知識庫；自訂模型仍依 BotKnowledge 範圍查詢。
3. 以英文詞及中文雙字片段比對文件標題和重疊段落。段落長 1000 字元、步進 700；標題命中權重 4，段落命中權重 1。
4. 排除低分來源（低於第一名 30% 或 1 分），選最多四份文件，每份最多四個片段。短句且含指涉詞的追問沿用上一個使用者問題。
5. 將來源片段及歷史訊息傳給 DeepSeek。文件內容視為不可信參考資料，不能變更 system 指令。
6. 提示模型根據文件回答並標記 [n]；查不到專案／課程具體規定時明確說明，一般知識可直接回答。
7. 檢查 upstream SSE 完成，解析有效引用；在同一 D1 batch 保存問題、完整回答及引用。
8. 同一對話以 `FOR UPDATE` row lock 保證並行寫入的訊息序號一致。

檢索是關鍵字段落檢索，沒有 embeddings 或向量索引。引用標記來自模型，系統驗證編號及關聯完整性，不保證每個語意判斷必然正確。

## 6. API 與頁面

頁面：`/` 聊天與工作空間；`/login` 登入。

API：`/api/data`、`/api/records`、`/api/chat`、`/api/stats`、`/api/seed`、`/api/health`。皆要求登入；所有寫入要求 JSON 並驗證 Origin。`/api/ready` 僅回報 DB 是否可連線，不回傳資料、連線設定或使用者身分；不要求站內登入，仍受 Sites 存取權保護。詳細 payload、狀態碼與串流格式：[API](docs/API.md)。

## 7. 非功能要求

| 類別 | 約束／做法 |
| --- | --- |
| 保密 | DB 密碼、DeepSeek key、部署 token 不進 repo、不進瀏覽器 bundle |
| 查詢安全 | D1 prepared statements 綁定參數；動態表／欄只取自 catalog 白名單 |
| 交易 | D1 batch 依序執行並原子提交；失敗整批回滾；同批保存訊息與引用 |
| 連線 | 由 Sites 注入 D1 binding；不使用外部 PostgreSQL socket |
| 錯誤 | 不公開 DB 堆疊、SQL 或 provider 原始錯誤；界面保留可重試內容 |
| 超時 | DB 限制由 D1 平台管理；AI upstream 90 秒 |
| 輸出 | AI 最大 4096 tokens；輸出達上限時提示可繼續 |
| 顯示 | Markdown 禁止 raw HTML、AI 圖片自動載入；外部來源限 http(s) |
| 易用 | 主要字體 16px、鍵盤操作、IME、防誤刪確認、reduced motion |
| 時間 | 時間以 UTC 文字儲存；應用寫入 ISO UTC；每日統計使用 SQLite date() |
| 部署 | 保留 Site 存取權；Sites 在發布時套用 D1 migration；health 可驗證連線 |

## 8. 資料移轉

從 PostgreSQL 切回 D1 時，先保留兩端私人快照、暫停網站操作並鎖住來源八表。確認沒有 D1 獨有記錄後，以單一 batch 匯入，再逐筆比對主鍵、欄位及完整內容。確認正式網站使用 D1 後，僅刪除 project_17 的 ghatcpt 八張業務表；不修改 public 或其他專案。移轉端點與秘密隨後移除，正式應用沒有 PostgreSQL fallback。

## 9. 排除範圍與已知限制

- 未提供檔案上傳、OCR、網址內容自動擷取、網際網路即時搜尋或語音。
- 未串接 Codex；AI 為使用者指定 DeepSeek Flash。
- 未提供軟刪除或對話回收桶；刪除對話是永久資料刪除。
- 草稿與捲動位置只保留目前頁面生命週期，重整後不復原。
- 共享管理資源沒有額外 RBAC；此 Site 限獲允許的課程成員使用。
- 沒有應用層的付費額度管理或 per-user AI rate limit。
- 歷史 SQL / Word 報告可能描述舊版 D1；現行實作以本 repo 規格為準。

## 10. 可追蹤驗證

目前以 TypeScript、DeepSeek 解析器測試、隔離 Miniflare D1 整合測試及 Workers build 驗證。歷史 PostgreSQL 測試結果不代表目前 D1 驗證；本次移轉另保存逐表內容比對紀錄。詳見 [TESTING](docs/TESTING.md)。
