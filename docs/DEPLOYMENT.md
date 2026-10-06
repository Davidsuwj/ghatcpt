# 安裝、部署與資料移轉

正式 URL：[GhatCPT](https://knowledge-chat-db-lab.davidsu881209.chatgpt.site/)。沿用現有 Sites 專案及分享設定，不重新建立 Site。

## 需求

- Node.js 24 LTS、npm、Git。
- PostgreSQL 16，帳號可連線並在指定 DB 建立 schema／table／function。
- 有效 DeepSeek API key，帳號有可用額度。
- Sites owner／editor 的來源 push 及部署權限。

這版的網站由 Sites 提供登入，不是可直接搬到一般公開 Node.js 主機而保持同等驗證的獨立 auth server。

## 環境變數

本機由被忽略的 `.env.local` 載入；正式用 Sites Settings 的環境設定。密碼及 AI key 必須標記為 secret，不填在 `.openai/hosting.json` 或 commit。

| 變數 | 正式設定／用途 | 敏感 |
| --- | --- | --- |
| PGHOST | 140.117.68.35 | 主機資訊 |
| PGPORT | 5432 | 否 |
| PGUSER | project_17 | 帳號資訊 |
| PGPASSWORD | 由專案 owner 提供，repo 不記錄 | **Secret** |
| PGDATABASE | project_17 | 否 |
| PGSCHEMA | ghatcpt（migration 固定使用此 schema） | 否 |
| PGSSLMODE | disable，該課程主機目前不支援 TLS | 否 |
| DEEPSEEK_API_KEY | owner 提供的 DeepSeek key | **Secret** |

未明確設為 `disable` 時 PostgreSQL adapter 使用驗證憑證的 TLS。支援 TLS 的正式環境請使用 `verify-full`，連線主機名稱需符合憑證。這版未設定 Hyperdrive、DB pool 或 private tunnel。

## 本機開發

```sh
npm ci
cp .env.example .env.local
# 在編輯器填入自己的 DB / AI 設定
npm run db:migrate
npm run dev
```

PowerShell 使用 `Copy-Item`；若 npm shim 有問題，可用 Node 直接執行 npm-cli.js 或 `node scripts/run-framework.mjs dev`。修改本機環境後重啟預覽。

本機 Sign in with ChatGPT 是 portable 模擬身分 `local_seedy`；不等於正式的使用者。PGHOST 指向哪個 DB，本機就讀寫哪個 DB，沒有另外的本機 SQLite 副本。

## PostgreSQL migration

```sh
npm run db:generate
node --env-file=.env.local scripts/migrate-postgres.mjs
```

每份 SQL 一個 transaction，migration ledger 位於 `ghatcpt_meta.migrations`。已套用檔名及 SHA 不可改；新增改動用新 migration。發生錯誤时目前 migration 回滾，先前成功版本維持原狀。SQL 只負責 schema，不放大量種子資料。

空 DB 可透過登入後的 POST `/api/seed` 初始化共享文件。正式 cutover 已匯入原系統，勿重複 seed 或重新匯入。

## Sites 發布

1. 沿用 `.openai/hosting.json` 的 project_id；確認 `d1=null`、`r2=null`。
2. 在 Sites 設定上述 PG 環境及 secret，保留 DeepSeek key 和既有成員存取權。
3. 於 CLI 套用 PostgreSQL migration，確認 schema／trigger 存在。
4. 執行型別、DB 約束及必要 API 驗證，產生 Workers build。
5. 使用 Sites source repository credential push **同一份** source commit，依 Sites workflow 包裝 build。
6. 保存該 commit 的 archive 版本並部署。確認原 URL、deployment succeeded 及正確 env revision。
7. GET `/api/ready` 確認正式 Worker 可連到 PostgreSQL；登入 GET `/api/health`，確認 backend=postgresql、database=project_17、schema=ghatcpt、connected=true；檢查個人歷史與文件來源。

```sh
npm run typecheck
npm test
node --env-file=.env.local scripts/test-postgres.mjs
npm run build
```

GitHub Actions 只驗證 repo，不自動發佈 Sites，也不含 Sites token。部署需要有效 Sites owner／editor 權限；所有部署 token 使用短期憑證，不能保存到 repo。

## 2026-10-06 cutover

1. 確認 PostgreSQL 連通及獨立 ghatcpt schema；public 既有表不改動。
2. 舊 D1 版短暫開啟寫入暫停與一次性秘密匯出端點。
3. 匯出完整八表快照至 repository 外；不可用有欄位截斷的資料檢視器輸出當備份。
4. PostgreSQL schema migration → 匯入快照 → 每表主鍵、內容及時間比對 → COMMIT。
5. 更新兩個已知教學文件的舊架構描述；驗證 PostgreSQL 交易、FK、引用及真實 AI。
6. 移除匯出端點和暫時 secret，以 PostgreSQL 版重新部署同一 Site。

初始匯入：User 6、Chatbot 3、KnowledgeBase 2、Conversation 11、Document 6、BotKnowledge 5、Message 28、MessageCitation 4。之後登入／聊天／示範模型相容處理會讓資料數量正常變動。

匯入工具：

```sh
node --env-file=.env.local scripts/import-d1-snapshot.mjs /absolute/private/snapshot.json
node --env-file=.env.local scripts/refresh-system-docs.mjs
```

只在經檢查的空目標表使用匯入工具，不能覆蓋已使用的 PostgreSQL。暫時匯出端點不在現行 build 中。

## 回復與資料保護

- 只更換前端／API source 且 schema 向後相容：部署上一個 **PostgreSQL** 版本，繼續連同一 DB。
- Schema 變動：先匯出備份，再評估相容性；不得自動 DROP schema 或反向執行破壞性 SQL。
- 回到歷史 D1：需先匯出 cutover 後的 PostgreSQL 新資料並制定合併方案；直接降版会遺失後續對話。
- 私人 D1 cutover 快照及現行 PG 備份留在受保護的位置，勿放 GitHub。

日常备份／故障排除：[OPERATIONS](OPERATIONS.md)。
