# 安全與維運

## 身分與資料

Sites 管理網站存取及登入，應用依受信任 user_id 隔離個人對話、訊息、引用與統計。共享知識庫及管理資料供獲允許成員使用；目前沒有更細的 RBAC 或 per-user AI 額度限制。

## 秘密

DeepSeek key 存在 Sites secret，本機 .env.local、私人快照及 work/ 都被 Git 忽略。短期部署 token 只放記憶體／隱藏 stdin，不存 Git remote。修改正式環境設定後須重新部署。正式站不再使用 PG 帳密。

## 資料庫

D1 由 GPT Sites 管理，SQL 參數綁定且表名限制在 catalog 白名單。D1 batch 確保多表保存失敗時回滾；引用規則由 SQLite trigger、PK、FK 共同維護。

可由 Sites 資料庫檢視器確認八表；單一登入帳號的介面匯出只含該帳號可見資料，不能當作完整備份。有截斷的資料檢視器輸出亦不可當完整快照。完整備份需使用受控管理流程並驗證全部記錄；私人備份不可放公開來源庫。

## AI

發問時會將問題、有限歷史及檢索片段送往 api.deepseek.com。文件片段視為不可信內容；模型引用編號經驗證才保存。Markdown 不執行 raw HTML，不自動載入 AI 圖片。來源限 http(s)。模型答案仍需依來源判斷。

## 監測與排錯

| 項目 | 檢查 |
| --- | --- |
| /api/ready | 只回報 backend=d1 與連線狀態，仍受 Site 存取控制 |
| /api/health | 登入後檢查 D1 binding DB |
| 401 | Site 存取權、登入狀態 |
| DB 503 | D1 binding、發布 migration、Sites Worker 錯誤紀錄 |
| 409 | 重複主鍵、外鍵／引用依賴，不可強制刪除被引用文件 |
| AI 429／503 | DeepSeek key、額度或 provider 暫時不可用 |
| 看不到對話 | 登入 ID 是否相同、資料移轉是否完成 |
| 串流中斷 | 重讀對話確認有無已保存回答再重試 |

## 回復

優先回復相容的 D1 版本並保留資料庫。PostgreSQL 舊版已停用，不能直接部署來恢復服務。結構變更先備份，已套用 migration 不回寫；修正使用追加 migration。沒有自動雙寫或跨 DB 同步。
