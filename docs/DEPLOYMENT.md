# 安裝與部署

正式網址：[GhatCPT](https://knowledge-chat-db-lab.davidsu881209.chatgpt.site/)。沿用既有 Site 與分享設定。

## 環境

Node.js 24、npm、Git、Sites owner/editor 權限與有效 DeepSeek API key。正式 DEEPSEEK_API_KEY 必須存為 Sites secret；本機使用被忽略的 .env.local。不再需要 PGHOST、PGPORT、PGUSER、PGPASSWORD、PGDATABASE、PGSCHEMA 或 PGSSLMODE。

## 本機

```sh
npm ci
cp .env.example .env.local
npm run build
npm run db:migrate
npm run dev
```

PowerShell 使用 Copy-Item 複製範本。若舊本機副本已有資料表、但缺少 migration 紀錄，先備份該本機副本，再使用空白本機狀態初始化；不要修改已套用 SQL。D1 本機資料位於 .wrangler/state，不讀寫正式 D1。本機登入為模擬身分；正式站由 Sites 驗證。

## 發布

1. .openai/hosting.json 保留原 project_id、d1="DB"、r2=null。
2. 修改綱目後執行 npm run db:generate，檢查新 SQL；不可改寫已套用 migration。
3. 執行 npm run typecheck、npm test、npm run test:db、npm run build。
4. 透過 Sites workflow 推送同一份來源、打包並保存版本，再部署到原 Site。
5. 確認 deployment succeeded。/api/ready 回報 backend=d1、connected=true；/api/health 另要求登入。

Sites 管理實體 D1 資源，manifest 僅放邏輯 DB binding。發布會套用 drizzle/ migration；CI 不使用正式 DB、部署 token 或 AI key。

## 2026-10-06 切回 D1

先備份 PostgreSQL 與原 D1；短暫維護期間鎖住 PG 八張業務表，檢查沒有 D1 獨有資料，再以 D1 batch 同步。逐筆核對完整內容後恢復 D1 正式版本，再以限定 ghatcpt schema 的 DROP TABLE RESTRICT 移除指定八表。public 與歷史管理表不變。

私人備份不提交來源庫。一次性移轉端點與秘密於完成後移除。禁止直接回滾到依賴已刪除 PostgreSQL 表的舊版；需要回復時先評估資料相容性。
