# WebSocket 即時通訊實作規格

## 概述
本文件說明 SEO 分析器應用程式前後端 WebSocket 即時通訊的實作規格。

## 目前狀態
- 前端：輪詢實作運作正常 ✅
- 後端：任務進度追蹤運作正常 ✅
- WebSocket：尚未實作（回退至輪詢） ❌

## 實作需求

### 後端需求

#### 1. WebSocket 伺服器設定
- 使用 `python-socketio` 或 `websockets` 函式庫
- 整合現有 FastAPI 應用程式
- 支援前端連接的 CORS
- 處理連接/斷線事件

#### 2. 任務進度廣播
- 當呼叫 `job_manager.update_progress()` 時發送進度更新
- 訊息格式：
  ```json
  {
    "job_id": "string",
    "progress": "number (0-100)",
    "status": "string",
    "current_step": "string",
    "timestamp": "ISO string"
  }
  ```

#### 3. 房間管理
- 建立任務專屬房間：`job_{job_id}`
- 客戶端在分析開始時加入房間
- 只向相關房間成員廣播更新

### 前端需求

#### 1. WebSocket 客戶端設定
- 使用 `socket.io-client` 或原生 WebSocket API
- 實作連線管理與自動重連
- 連線失敗時回退至輪詢

#### 2. 進度監聽
- 訂閱任務進度事件
- 即時更新 UI 狀態
- 優雅處理連線錯誤

#### 3. 配置管理
- 應用程式配置中的 `enableWebSocket` 旗標
- 自動回退機制
- 連線狀態的除錯日誌

## API 設計

### WebSocket 事件

#### 伺服器 → 客戶端
- `job_progress`：特定任務的進度更新
- `job_completed`：任務完成通知
- `job_error`：錯誤通知

#### 客戶端 → 伺服器
- `join_job`：加入任務專屬房間
- `leave_job`：離開任務專屬房間

### REST API（回退方案）
- 保留現有輪詢端點作為回退方案
- `/api/jobs/{job_id}/status` - 取得目前狀態

## 實作步驟

### 第一階段：後端 WebSocket 伺服器
1. 安裝 WebSocket 相依套件
2. 建立 WebSocket 管理器類別
3. 整合 FastAPI 應用程式
4. 新增房間管理
5. 更新 job_manager 以發送 WebSocket 事件

### 第二階段：前端 WebSocket 客戶端
1. 安裝 WebSocket 客戶端相依套件
2. 建立 WebSocket 服務
3. 更新 useAnalysis hook
4. 實作回退邏輯
5. 新增連線狀態指示器

### 第三階段：測試與優化
1. 測試即時更新
2. 測試連線失敗
3. 測試回退機制
4. 效能優化
5. 錯誤處理改進

## 錯誤處理

### 連線失敗
- 指數退避的自動重試
- 達到最大重試次數後回退至輪詢
- 向使用者通知連線問題

### 訊息失敗
- 離線客戶端的訊息佇列
- 重複訊息處理
- 無效訊息格式處理

## 安全性考量

### 身分驗證
- 驗證客戶端存取任務的權限
- 基於 Session 或 Token 的驗證
- WebSocket 連線的限流

### 資料驗證
- 驗證所有傳入的 WebSocket 訊息
- 清理任務 ID 和使用者輸入
- 防止未授權的房間存取

## 配置設定

### 環境變數
```env
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=8001
WEBSOCKET_CORS_ORIGINS=["http://localhost:3000"]
```

### 前端配置
```typescript
interface AppConfig {
  enableWebSocket: boolean;
  websocketUrl: string;
  fallbackPollingInterval: number;
  maxReconnectAttempts: number;
}
```

## 測試策略

### 單元測試
- WebSocket 管理器功能
- 訊息格式化和驗證
- 房間管理邏輯

### 整合測試
- 完整前後端通訊
- 回退機制測試
- 錯誤情境測試

### 負載測試
- 多個並發連線
- 高頻率訊息廣播
- 負載下的連線穩定性

## 部署考量

### 基礎設施
- WebSocket 伺服器擴展
- 負載平衡器的 WebSocket 支援
- 反向代理配置

### 監控
- 連線指標
- 訊息傳遞成功率
- 錯誤率追蹤

## 遷移計劃

### 步驟一：實作
- 實作後端 WebSocket 伺服器
- 實作前端 WebSocket 客戶端
- 保留輪詢作為回退方案

### 步驟二：測試
- 開發環境徹底測試
- 使用功能旗標逐步推出
- 效能監控

### 步驟三：全面部署
- 預設啟用 WebSocket
- 監控效能和錯誤
- 根據實際使用情況優化

## 成功指標

### 效能
- 即時更新延遲 < 100ms
- 連線成功率 > 99%
- 回退啟用率 < 5%

### 使用者體驗
- 即時進度回饋
- 無輪詢相關延遲
- 流暢的連線處理