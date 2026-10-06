# GhatCPT

ChatGPT 風格的課程聊天系統，使用 **DeepSeek Flash** 回答問題並檢索知識庫，後端資料儲存於 **PostgreSQL 16**。網站與 API 部署於 GPT Sites / Cloudflare Workers。

- [正式網站](https://knowledge-chat-db-lab.davidsu881209.chatgpt.site/)（需具備 Site 存取權並登入）
- [完整規格 SPEC](SPEC.md)
- [架構](docs/ARCHITECTURE.md) · [資料庫與資料字典](docs/DATABASE.md) · [API](docs/API.md)
- [部署](docs/DEPLOYMENT.md) · [測試](docs/TESTING.md) · [安全與維運](docs/OPERATIONS.md)

## 功能

- ChatGPT 帳號登入，依真實登入身分區分使用者。
- 新增、搜尋、重新命名與刪除個人對話；刪除會一併清除訊息及引用。
- DeepSeek Flash 逐段串流回覆、Markdown、複製、連續追問。
- 知識庫文件全文分段搜尋、相關片段整理、可點擊的引用來源。
- 工作空間內的知識庫、文件、模型、關聯資料 CRUD 及 JSON 匯出。
- 對話、訊息、文件引用與每日使用量統計。
- 保留原 ERD 的六個實體與兩個關聯表、複合主鍵和複合外鍵。
- 行動版側欄、中文輸入法、Shift+Enter 換行、草稿與捲動位置保留。

模型選單只顯示 DeepSeek Flash。舊「資料庫助教」「課程小幫手」的對話仍可繼續使用同一 AI；必要的歷史 bot_id 保留以維持外鍵完整性。

## 技術

| 層 | 使用工具 |
| --- | --- |
| 網頁 | React 19、TypeScript、Tailwind CSS 4、Radix / Shadcn |
| 伺服器 | Vinext、Next.js 相容 API routes、Cloudflare Workers |
| 資料庫 | PostgreSQL 16、node-postgres、Drizzle schema / migrations |
| AI | DeepSeek Chat Completions，`deepseek-flash` |
| 身分與部署 | GPT Sites Sign in with ChatGPT、Sites runtime secrets |
| 驗證 | TypeScript、PostgreSQL 整合測試、API / AI 實測、GitHub Actions |

## 開發環境

使用 Node.js **24 LTS**、npm、Git，以及可連線的 PostgreSQL。正式 PostgreSQL 位於課程提供的 `project_17` DB，本系統使用 `ghatcpt` schema；`public` 中的其他專案資料表不會被修改。

```sh
git clone https://github.com/Davidsuwj/ghatcpt.git
cd ghatcpt
npm ci
cp .env.example .env.local
```

Windows PowerShell 可用 `Copy-Item .env.example .env.local`。在 `.env.local` 填入 PostgreSQL 連線參數與 DeepSeek 金鑰；完整說明見 [部署文件](docs/DEPLOYMENT.md#環境變數)。密碼及金鑰不在此 repository 中。

```sh
npm run db:migrate
npm run dev
```

依終端機顯示網址開啟網站；測試腳本固定使用 `http://localhost:5173`。Portable 本機預覽使用模擬 ChatGPT 身分，正式網站由 Sites 驗證登入身分。**本機預覽也會連到 `.env.local` 指定的真實 PostgreSQL**；請用測試 DB 進行一般開發。

空 DB 可登入後使用工作空間的示範資料初始化功能。初始化只建立共享教學資料，不建立虛構登入帳號或個人對話。若 DB 已有知識庫，初始化回傳 409，不覆蓋資料。

## 操作

1. 登入正式網站，選「新對話」，輸入問題；Enter 傳送、Shift+Enter 換行。
2. 點回答下方文件名稱查看引用全文與來源網址。
3. 點左側對話旁的「⋯」重新命名或刪除。刪除前會顯示對話名稱及確認框。
4. 左下「工作空間」可開啟資料管理、統計與 ERD。
5. 左下帳號選單可登出；登入頁為 `/login`。

知識庫文件目前以貼上文字方式維護，來源網址供查看。PDF / DOCX 檔案上傳、網址自動抓取、向量搜尋及 Codex 串接不在此版功能範圍。檢索採中英文關鍵字與重疊段落比對，由 DeepSeek 整理答案。

## 驗證與建置

```sh
npm run typecheck
npm test
node --env-file=.env.local scripts/test-postgres.mjs
npm run build
```

預覽已啟動且本機金鑰設定完成後，可進行實際 API / AI 測試：

```sh
npm run test:api
npm run test:retrieval
npm run test:ai
```

這些實測會建立及清理測試資料，並產生少量 DeepSeek API 用量；API 完整回歸需有歷史跨使用者測試 fixture，詳見 [測試文件](docs/TESTING.md)。GitHub Actions 使用獨立 PostgreSQL container，執行型別、解析器、交易 / 約束及建置檢查，不使用正式 DB 或 AI 金鑰。

## 部署與資料移轉

部署沿用現有 GPT Sites URL 與存取設定。`.openai/hosting.json` 的 `d1` 已設為 `null`，正式資料讀寫使用 PostgreSQL；舊 `drizzle/` 的 SQLite migration 保留作歷史參考，**不再執行**。有效 migration 位於 `postgres/migrations/`。

2026-10-06 已將原 D1 的 6 位使用者、3 筆歷史模型設定、2 個知識庫、11 段對話、6 份文件、5 筆知識库連結、28 則訊息及 4 筆引用匯入 PostgreSQL，逐表內容驗證通過。原教學文件中的 D1 與純摘錄模式說明已更新。私人資料快照、環境檔與密碼不會提交 GitHub。

正式部署程序、DB migration、原 D1 回復限制與維運方式見 [DEPLOYMENT](docs/DEPLOYMENT.md) 及 [OPERATIONS](docs/OPERATIONS.md)。

## 專案結構

```text
app/                 網頁、登入、API routes
components/          聊天元件及共用 UI
db/                  PostgreSQL adapter、Drizzle schema、示範資料
lib/                 驗證、資料表目錄、檢索、DeepSeek、串流 client
postgres/migrations/ PostgreSQL schema 與資料完整性 trigger
drizzle/             舊 D1 migrations（唯讀歷史）
scripts/             本機環境、migration、匯入、測試工具
docs/                架構、DB、API、部署、測試、維運
public/              使用者 logo、ERD 與關聯綱目圖
.github/workflows/   自動驗證
.openai/hosting.json 既有 Sites 專案對應
```

## 安全與資料範圍

個人對話、訊息、引用及相關統計依登入帳號隔離。共享知識庫與管理資料供獲允許的 Site 成員共用，本版沒有額外的站內管理者角色。Sites 私人／分享權限與站內資料範圍是兩個不同層次。

金鑰與密碼只存在 Sites secrets 或被 Git 忽略的本機環境檔；查詢使用 bound parameters。課程提供的 PostgreSQL 目前未啟用 TLS，因此正式 `PGSSLMODE=disable`；支援 TLS 的環境應使用預設的 `verify-full`。更多限制與維護方式見 [OPERATIONS](docs/OPERATIONS.md)。

專案圖與 logo 由使用者提供。保留第三方元件的授權文件，未宣告本專案為開源授權。
