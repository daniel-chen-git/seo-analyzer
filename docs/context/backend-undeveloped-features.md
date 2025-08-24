# Backend 未開發功能清單

## 📋 概述
本文件記錄 SEO Analyzer Backend 中尚未開發但在規格或計劃中提及的功能清單。

**最後更新**: 2025-01-24  
**專案狀態**: MVP 階段完成  
**核心功能完成度**: 85%

---

## 🔄 未開發功能清單

### 1. 快取系統 (Redis)

#### 狀態
- **優先級**: P2 (低優先級)
- **規格地位**: 可選功能
- **配置狀態**: 已在 config.ini 中配置但功能未實作

#### 功能描述
- **目的**: 提升 API 回應速度，減少外部 API 呼叫
- **快取內容**: 
  - SERP 查詢結果 (24小時)
  - 網頁爬取結果 (1週)
  - AI 分析結果 (依關鍵字+受眾組合快取)
- **技術需求**: Redis 連線管理、快取失效策略

#### 實作需求
```python
# services/cache_service.py
class CacheService:
    async def get_serp_cache(self, keyword: str) -> Optional[dict]
    async def set_serp_cache(self, keyword: str, data: dict, ttl: int = 86400)
    async def get_scraping_cache(self, url: str) -> Optional[dict]
    async def set_analysis_cache(self, cache_key: str, result: str, ttl: int = 3600)
```

#### 預期效益
- **效能提升**: 快取命中時回應時間從 60 秒降至 5 秒
- **成本節約**: 減少 70% 外部 API 呼叫
- **使用者體驗**: 重複查詢即時回應

---

### 2. Rate Limiting (API 限制)

#### 狀態
- **優先級**: P1 (中優先級)
- **規格地位**: 生產環境必要
- **配置狀態**: config.ini 中有 `rate_limit = 100` 但未實際應用

#### 功能描述
- **目的**: 防止 API 濫用，保護系統資源
- **限制策略**:
  - 每分鐘最多 10 次 /analyze 請求
  - 每小時最多 100 次總請求
  - IP 級別和使用者級別限制

#### 實作需求
```python
# 使用 slowapi (FastAPI 版本的 Flask-Limiter)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/analyze")
@limiter.limit("10/minute")
async def analyze_keyword(request: AnalyzeRequest):
    pass
```

#### 錯誤處理
- **狀態碼**: 429 Too Many Requests
- **錯誤訊息**: "請求頻率過高，請稍後重試"
- **回應標頭**: `Retry-After: 60`

---

### 3. 進度查詢功能

#### 狀態
- **優先級**: P1 (中優先級)
- **規格地位**: 可選 (MVP 階段)
- **API 端點**: `GET /api/status/{job_id}`

#### 功能描述
- **目的**: 為長時間分析提供即時進度反饋
- **使用情境**: 
  - 大型關鍵字分析 (>50秒)
  - 網路狀況不佳時的長時間等待
  - 前端進度條顯示

#### 實作架構
```python
# models/status.py
class JobStatus(BaseModel):
    job_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    progress: JobProgress
    result: Optional[AnalyzeResponse] = None
    created_at: datetime

class JobProgress(BaseModel):
    current_step: int        # 1=SERP, 2=Scraping, 3=AI
    total_steps: int = 3
    message: str            # "正在爬取競爭對手網站..."
    percentage: float       # 0-100
```

#### 實作需求
1. **任務管理器**: 記憶體儲存任務狀態
2. **背景任務**: FastAPI BackgroundTasks 非同步處理
3. **進度更新**: 各服務階段呼叫進度更新
4. **狀態查詢**: GET 端點提供即時狀態

---

### 4. 日誌系統強化

#### 狀態
- **優先級**: P2 (低優先級)
- **規格地位**: 維運需求
- **現狀**: 基本 console logging，缺乏結構化日誌

#### 功能描述
- **結構化日誌**: JSON 格式，便於分析
- **日誌等級**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **日誌內容**: 
  - API 請求/回應記錄
  - 外部服務呼叫記錄  
  - 效能指標記錄
  - 錯誤追蹤記錄

#### 實作需求
```python
import structlog

logger = structlog.get_logger()

# 使用範例
logger.info("API request received", 
    endpoint="/api/analyze",
    keyword=request.keyword,
    request_id=job_id)
```

---

### 5. 監控與指標收集

#### 狀態
- **優先級**: P3 (最低優先級)
- **規格地位**: 運維需求
- **適用階段**: 生產環境

#### 功能描述
- **效能指標**: API 回應時間、成功率、錯誤率
- **資源監控**: CPU、記憶體、磁碟使用量
- **業務指標**: 日/月活躍查詢數、最熱門關鍵字

#### 技術方案
- **Prometheus**: 指標收集
- **Grafana**: 視覺化儀表板
- **FastAPI**: 內建的 `/metrics` 端點

---

## 📊 優先級建議

### 生產環境部署前必須實作
1. **Rate Limiting** - 防護系統安全
2. **結構化日誌** - 問題診斷需求
3. **健康檢查強化** - 可用性監控

### MVP 2.0 階段考慮
1. **進度查詢功能** - 提升使用者體驗  
2. **Redis 快取** - 效能大幅提升
3. **監控指標** - 運維可見性

### 長期優化項目
1. **進階分析功能** - 更多 SEO 指標
2. **批量處理** - 多關鍵字同時分析
3. **API 版本管理** - 向後相容性

---

## 🔄 實作時程建議

### 短期 (1-2 週)
- Rate Limiting 實作
- 錯誤處理格式統一
- 健康檢查強化

### 中期 (3-4 週)  
- 進度查詢功能
- Redis 快取系統
- 結構化日誌

### 長期 (2-3 個月)
- 完整監控系統
- 進階分析功能
- 效能最佳化

---

## 📝 備註

1. **MVP 原則**: 當前功能已滿足基本需求，未開發功能為優化項目
2. **資源考量**: 實作優先級應考量開發資源和實際使用需求
3. **漸進式開發**: 建議按優先級逐步實作，確保系統穩定性
4. **使用者回饋**: 根據實際使用回饋調整功能開發優先級

---

**檔案位置**: `/docs/context/backend-undeveloped-features.md`  
**維護責任**: Backend Development Team  
**更新頻率**: 每次 Sprint 結束後更新