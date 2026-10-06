# 安全與維運

## 身分與存取

GPT Sites 管理可開啟網站的人員及 ChatGPT 登入。正式個人資料查詢使用登入 user_id；所有個人 mutation 驗證 Conversation owner。User 由登入資料同步，不接受站內人工建立或切換。

共享 KB、文件、模型及 BotKnowledge 可由已登入的獲允許成員維護。本版沒有額外站內 RBAC，也沒有 per-user AI budget。需要更細權限前，Sites allowlist 應只包含可信課程成員。

直接公開到其他 hosting 時不可沿用未受信任訪客提供的身分標頭，需先建立新的驗證方式。

## 秘密管理

- PGPASSWORD、DEEPSEEK_API_KEY 使用 Sites secret。
- `.env.local`、實際資料快照及 backup 被忽略或保存在 repo 外。
- `.env.example` 僅含占位值。
- 短期 source credentials 只用於當次 push，不存在檔案或 remote URL。
- DB 錯誤日誌只記通用錯誤代碼，不記 SQL、值、密碼或對話內容。

如需更新 key／密碼，在 Sites 環境設定變更後重新部署以套用新 revision；不要只改 README。密碼由課程伺服器管理人員輪換，本專案不擅自更改 DB 帳號權限或密碼。

## PostgreSQL 連線與網路

課程主機 `140.117.68.35:5432` 可連通並使用 PostgreSQL 16.4，目前未啟用 TLS，因此 runtime 明確 `PGSSLMODE=disable`。DB protocol 連線不加密；這是實際伺服器限制。支援 TLS 的替代環境應設 verify-full 並使用有效憑證，不能靠關閉憑證驗證替代。

本系統不修改課程主機 firewall、pg_hba.conf、public 表或其他 schema。若部署地的出站 IP 被限制，需要由伺服器管理人員放行或提供受支援的安全連線方式。

每次獨立 DB operation 建立／關閉連線，一個 batch 共用單一 client。未配置 Hyperdrive。高並行使用時需監控 PostgreSQL connection limit；不要在 Worker 的全域共用一條 request 建立的 socket。

## AI 與文件

請求送至 `api.deepseek.com`，內容為當前問題、最近有限歷史及檢索片段。共享文件和對話資料會在回答時傳給這個 provider，僅放適合此用途的資料。

文件片段以不可信資料包進 system context，禁止採纳其中的指令；引用編號需符合當次來源。Markdown 不執行原始 HTML，圖片不自動載入，來源網址限 http(s)。這些控制不代表模型答案一定正確。

沒有相關來源時一般問題可用模型知識，具體文件／課程規定則要求明確告知找不到。只有合法、實際標示的引用編號保存到 DB。

## 備份

使用 PostgreSQL 16 工具，以環境变量或本機安全 credential file 傳入認證，不把密碼放命令列或檔名。

```sh
pg_dump --format=custom --schema=ghatcpt --schema=ghatcpt_meta --file=/private/backup/ghatcpt.dump
```

在已配置 PGHOST、PGPORT、PGUSER、PGPASSWORD、PGDATABASE 的維運環境執行。實際备份程序與 retention 由 DB owner 決定，本 repo 未自動排程。

回復前先另備份現況，先在隔離 DB 演練，再確認 maintenance window。不要對課程 DB 執行泛用 `DROP DATABASE`、`DROP SCHEMA public CASCADE` 或復原整個 public，避免影響既有專案。

## 監測

- GET `/api/ready`：僅確認 DB 連線是否可用，不讀取資料；仍需 Site 存取權。
- 登入 GET `/api/health`：確認 backend、database、schema、connected。
- Sites deployment status：確認 succeeded 和正確環境 revision。
- Sites Worker logs：查失敗 route／錯誤碼，不收集完整聊天內容。
- PostgreSQL 管理端：監測 connections、慢查詢與磁碟空間。
- DeepSeek 帳號：監測額度與 provider 429／503。

## 故障排除

| 現象 | 檢查／處理 |
| --- | --- |
| 401 | Site allowlist、登入狀態；本機是否使用 portable 模擬登入 |
| DB 503 | PG 環境是否完整、主機／port、TLS 模式、schema 是否套用、Worker 出站是否允許 |
| 409 引用／FK | 先处理依賴記錄，不能刪除已引用文件或知識庫連結 |
| AI 金鑰／額度錯誤 | 在 Sites 更新 key 或 DeepSeek 儲值，再重新部署 runtime 設定 |
| AI 429 | 稍後重試，減少並行；本版無站內 rate limiter |
| 載入不到旧資料 | PGSCHEMA 必須為 ghatcpt，確認移轉及目前使用者ID相同 |
| migration checksum 不符 | 還原已套用 SQL 的原內容，改用新的 migration |
| 對話顯示舊模型 ID | 正常歷史外鍵保留，選單與 provider 已統一 DeepSeek Flash |
| stream 中斷 | 重讀目前對話，確認有無已保存回答，再重試 |

## 版本回復

優先回復上一個可用的 PostgreSQL source 版本，保留 DB。若需回到歷史 D1，先妥善匯出 PG 切換後資料；歷史 D1 只含切換前狀態。這版不提供自動跨 DB 雙寫或同步。
