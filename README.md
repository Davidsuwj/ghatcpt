# GhatCPT

具登入、個人對話、共享知識庫及文件引用的課程聊天系統。AI 使用 **DeepSeek Flash**；網站、API 與 **Cloudflare D1 資料庫**均由 GPT Sites 提供。

- [正式網站](https://knowledge-chat-db-lab.davidsu881209.chatgpt.site/)（需 Site 存取權並登入）
- [完整規格](SPEC.md) · [系統架構](docs/ARCHITECTURE.md) · [資料庫](docs/DATABASE.md)
- [API](docs/API.md) · [部署](docs/DEPLOYMENT.md) · [測試](docs/TESTING.md) · [維運](docs/OPERATIONS.md)

## 功能

- ChatGPT 帳號登入，依真實登入身分區分個人對話。
- 新增、搜尋、更名及刪除對話；刪除會級聯移除訊息與引用。
- DeepSeek Flash 串流回覆、Markdown、複製與上下文追問。
- 文件分段檢索及可點擊的引用來源。
- 共享知識庫、文件、模型及關聯 CRUD、JSON 匯出、個人使用統計。
- 保留原 ERD 的六個實體、兩個關聯表、複合主鍵及外鍵。

模型選單只顯示 DeepSeek Flash；歷史助理 ID 保留以維持既有對話。Agent ERD 屬於設計提案，尚未實作為資料表。

## 技術

| 層 | 工具 |
| --- | --- |
| 前端 | React 19、TypeScript、Tailwind CSS 4、Radix / Shadcn |
| API | Vinext、Cloudflare Workers |
| DB | GPT Sites Cloudflare D1（SQLite）、Drizzle schema / migrations |
| AI | DeepSeek Chat Completions，deepseek-flash |
| 身分 | GPT Sites Sign in with ChatGPT |
| 測試 | TypeScript、Miniflare D1、解析器測試、GitHub Actions |

## 本機執行

使用 Node.js 24、npm 與 Git：

```sh
git clone https://github.com/Davidsuwj/ghatcpt.git
cd ghatcpt
npm ci
cp .env.example .env.local
npm run build
npm run db:migrate
npm run dev
```

PowerShell 可用 `Copy-Item .env.example .env.local`。填入自己的 DEEPSEEK_API_KEY；不需要 PostgreSQL 帳密。D1 本機副本儲存於被 Git 忽略的 `.wrangler/state`，與正式 DB 分離。Portable 預覽使用模擬登入，正式網站使用 Sites 驗證身分。

空資料庫登入後可從工作空間初始化共享教學文件；已有資料時不覆寫。前端僅保留頁面內草稿與捲動狀態，對話及文件持久儲存在 D1。

## 操作

1. 登入後新增對話，Enter 傳送，Shift+Enter 換行。
2. 點回答下方來源查看文件內容。
3. 對話旁的「⋯」可更名或刪除；刪除前會確認。
4. 左下「工作空間」開啟資料管理、統計與 ERD。
5. 帳號選單可登出，登入頁為 `/login`。

文件以貼上文字方式維護；來源網址供查看。未提供 PDF / DOCX 上傳、自動抓取網址、向量搜尋或 Codex 串接。檢索由應用以關鍵字和段落比對選出來源，再交由 DeepSeek 整理回答。

## 驗證

```sh
npm run typecheck
npm test
npm run test:db
npm run build
```

GitHub Actions 的 D1 更新因現有授權缺少 workflow 權限尚未套用，現有 CI 仍為歷史 PostgreSQL 檢查；可套用範本見 docs/ci-d1.example.yml。

D1 測試使用隔離 Miniflare 資料庫，檢查並行保存、交易回滾、主外鍵、引用規則、統計與刪除級聯，不使用正式 DB 或 AI key。`test:ai` 與 `test:retrieval` 需要本機預覽與有效金鑰，會產生少量 provider 用量，詳見測試文件。

## 部署與資料

沿用原 Sites 專案、網址及分享設定，`.openai/hosting.json` 宣告 `d1: "DB"`。Sites 在發布時套用 `drizzle/` 的版本化結構 migration。既有已套用 SQL 不可修改；新增結構需追加 migration。

2026-10-06 依專案負責人要求，從 project_17 切回 GPT Sites D1：先備份並逐筆核對資料，再切換正式網站，最後以限定 schema 的 DROP TABLE RESTRICT 刪除 PostgreSQL 八張業務表。私人快照不提交 Git；移轉完成紀錄由交付檔案保留。PostgreSQL 歷史 SQL 與工具僅供追溯，不參與正式網站的建置或部署，也沒有自動 fallback。

## 專案結構

```text
app/                 聊天、登入、API
components/          介面元件
lib/                 驗證、檢索、DeepSeek、資料表目錄
db/                  D1 helper、Drizzle SQLite schema、示範資料
drizzle/             正式 D1 migrations（已套用版本不可改寫）
scripts/             本機 D1 migration、測試及歷史移轉工具
postgres/migrations/ 停用的 PostgreSQL 歷史 SQL
docs/                規格、API、部署、測試、維運
public/              Logo、ERD、關聯綱目
.openai/hosting.json  Sites 專案與逻輯 DB binding
```

## 資料範圍與秘密

個人對話、訊息、引用及相關統計依登入帳號隔離；知識庫與管理資料供獲允許的成員共用。本站沒有額外管理者角色。DeepSeek key 只存 Sites secret 或被 Git 忽略的本機環境檔，不送到瀏覽器；SQL 值使用綁定參數。

專案圖與 logo 由使用者提供，保留第三方元件授權；本專案未宣告開源授權。
