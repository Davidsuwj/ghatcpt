# 測試與驗收

## 自動檢查

```sh
npm run typecheck
npm test
npm run test:db
npm run build
```

- TypeScript 檢查 API 與 D1 binding 型別。
- 解析器測試模擬 DeepSeek provider，涵蓋串流、UTF-8、上下文及引用。
- test:db 在隔離 Miniflare D1 套用正式 drizzle/ SQL，檢查並行序號、assistant 引用限制、文件與知識庫連結保護、非法角色、整批回滾、每日統計及刪除級聯。
- 建置驗證 Workers 輸出，不讀取正式資料。

D1 測試已在本機通過。GitHub 現有授權沒有 workflow 寫入權限，因此 .github/workflows/ci.yml 暫時保留舊 PostgreSQL CI；它不代表 D1 整合測試。已準備 docs/ci-d1.example.yml，取得 workflow 權限後可替換。該範本只使用 Node 24 與隔離 D1，不需要正式 DB 密碼或 AI key。

## API 與 AI 實測

啟動本機預覽後使用 test:ai、test:retrieval；需要有效 DeepSeek key，會產生少量 provider 用量。測試只應連本機 D1 副本，並清理自己建立的測試資料。

歷史 test:api 依賴 u-demo-1、conv-demo-1 等跨使用者 fixture，不能在空 DB 直接當作通過條件。歷史 PostgreSQL 整合測試僅供追溯，不是現行 CI。

## 本次資料移轉驗證

- 在來源 PG 鎖定八表期間匯出一致快照，保留原 D1 備份。
- 檢查 D1 沒有 PG 缺少的記錄後同步，逐筆核對完整欄位與內容。
- 確認正式部署使用 D1，最後才 DROP 指定 PG 表，保留 public 與歷史管理表。
- 驗證紀錄放在交付檔 d1-restoration.json；私人快照不提交 repo。

## 使用驗收

登入、個人歷史、新對話、串流回答、引用來源、知識庫 CRUD、統計、更名與刪除、登出。另一使用者不能讀寫他人的對話。/api/ready 與登入後 /api/health 均應回傳 backend=d1。
