# 測試與驗收

## 自動檢查

| 檢查 | 命令 | DB / 外部 API |
| --- | --- | --- |
| TypeScript | npm run typecheck | 無 |
| DeepSeek SSE、引用、歷史邊界 | npm test | 模擬 provider，不呼叫外部 |
| PG 參數、完整性、交易、并行與 cascade | node --env-file=.env.local scripts/test-postgres.mjs | 連指定 PG；建立／清理自建資料 |
| 全部 API、登入、IDOR、CRUD、統計 | npm run test:api | 本機 Worker + 指定 PG + 真實 DeepSeek |
| 串流、上下文、重新讀取 | npm run test:ai | 本機 Worker + 指定 PG + 真實 DeepSeek |
| 新 KB、長文件末尾、追問、歷史相容 | npm run test:retrieval | 同上 |
| Workers build | npm run build | 無業務 DB 查詢 |

Node 24 可直接執行測試引用的可擦除 TypeScript 模組。DB 設定載入自 `.env.local`，API 測試的 server 固定 `localhost:5173`；需另開終端執行 `npm run dev`。

## Fixture 與資料清理

`test-postgres.mjs` 自建 UUID 前綴資料，finally 刪除自己的對話、引用、文件、KB、bot、User。這個測試可用空 DB（先 migration），不依賴教學資料。

`test-api.mjs` 沿用跨使用者 fixture：`u-demo-1`、`conv-demo-1` 與其已保存訊息。正式從 D1 移轉的 DB 保留這些歷史資料；空測試 DB 可另以 db/seed.ts 的歷史 fixture 準備隔離測試資料。不可把假人／假對話透過一般 seed API 注入正式帳號清單。

API / AI / 檢索測試在本機模擬登入下建立測試資料並清除對話、模型與文件；User 自動同步資料可能仍存在。測試異常中止可能留下資料，清理時只選擇已記錄的測試 ID，勿刪除真實對話。正式切換驗證完成後已清理自建測試資料。

## GitHub Actions

`.github/workflows/ci.yml` 使用 Node 24 與 PostgreSQL 16 service，參數為該隔離 CI container 的測試設定。流程：npm ci → typecheck → parser tests → migration → PostgreSQL integration → build。

CI 不使用課程 PostgreSQL、Sites 部署 token 或 DeepSeek key。真實 AI 操作由明確配置環境的人另外驗證。CI 通過不能證明正式網路或 provider 額度正常，需部署後 health。

## 2026-10-06 實測結果

- 八個業務表均匯入 PostgreSQL，主鍵、欄位與內容逐表一致。
- 33 個 API 回歸檢查通過：登入、同源、擁有者、CRUD、FK／引用、序號、並行、統計、cascade。
- 7 個 PostgreSQL 整合條件通過：bound parameters、並行連續序號、assistant 引用、文件保護、連結保護、整批 rollback、cascade。
- DeepSeek Flash 串流 73 個內容區塊，回覆／引用成功保存，上下文追問成功。此次耗時不代表 latency SLA。
- 新 KB 無需手動新增內建 BotKnowledge 即可檢索；長文件尾端私有測試代號命中，追問仍引用同一來源。
- 歷史助理 ID 呼叫相同 DeepSeek model，試驗後對話／引用完整清理。

## 手動驗收

1. 未登入進入 `/login`；登入後帳號名稱正確，個人歷史可載入。
2. 新對話 model 選單只有 DeepSeek Flash。
3. 問一般問題，確認串流、Markdown、複製；問文件問題，確認來源與資料管理的文件一致。
4. 追問上一題，確認模型能引用上下文；輸入中文選字時 Enter 不應提前送出。
5. 在長對話向上閱讀，生成新內容時不強制跳到底；返回最新按鈕有效。
6. 左側「⋯」更名與刪除；取消確認保留記錄，確認後歷史、Message、MessageCitation 一併清除。
7. 使用另一個已允許帳號，確認看不到第一位的對話；共享 KB 可見。
8. health 回傳 PostgreSQL 連通；DB 不可用／AI 額度不足時顯示可重試錯誤。
9. 行動尺寸側欄可開關，表單、來源面板與輸入框不超出畫面。

發生新錯誤或 schema 改動時重跑相關測試；一般文案修改不必呼叫真實 AI。
