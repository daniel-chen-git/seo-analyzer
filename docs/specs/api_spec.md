# API 規格書 (API Specification) - SEO Analyzer

## 📋 概述

本文件詳細定義 SEO Analyzer MVP 的 REST API 規格，包含請求/回應格式、錯誤處理、驗證規則等。

### 基本資訊
- **Base URL**: `http://localhost:8000` (開發) / `https://your-domain.com` (生產)
- **API 版本**: v1
- **協議**: HTTP/HTTPS
- **回應格式**: JSON
- **編碼**: UTF-8

## 🚀 API 端點總覽

| 端點 | 方法 | 功能 | 狀態 |
|------|------|------|------|
| `/api/analyze` | POST | 執行 SEO 分析 | ✅ 核心功能 |
| `/api/health` | GET | 健康檢查 | ✅ 必要 |
| `/api/status/{job_id}` | GET | 查詢處理進度 | 🔶 可選 (MVP) |
| `/api/version` | GET | API 版本資訊 | ✅ 必要 |

---

## 🎯 核心 API：POST /api/analyze

### 端點資訊
- **URL**: `/api/analyze`
- **方法**: `POST`
- **功能**: 執行 SEO 關鍵字分析
- **逾時**: 70 秒 (留 10 秒緩衝)
- **限制**: 單一請求，不支援並發 (MVP)

### 請求格式

#### Request Headers
```http
Content-Type: application/json
Accept: application/json
User-Agent: SEO-Analyzer-Client/1.0
```

#### Request Body
```typescript
interface AnalyzeRequest {
  keyword: string;          // 關鍵字 (1-50字元)
  audience: string;         // 目標受眾 (1-200字元)
  options: {
    generate_draft: boolean;   // 是否生成初稿
    include_faq: boolean;      // 是否包含 FAQ
    include_table: boolean;    // 是否包含比較表格
  };
}
```

#### 範例請求
```json
{
  "keyword": "SEO 工具推薦",
  "audience": "中小企業行銷人員",
  "options": {
    "generate_draft": true,
    "include_faq": true,
    "include_table": false
  }
}
```

### 回應格式

> **⚠️ 重要變更說明**: 
> 實際實現採用扁平化回應結構，與初期規格的巢狀 `data` 物件不同。
> 此設計簡化前端處理邏輯，避免深層巢狀存取。

#### 成功回應 (200 OK)
```typescript
interface AnalyzeResponse {
  analysis_report: string;      // Markdown 格式的 SEO 分析報告
  token_usage: number;          // AI Token 使用量
  processing_time: number;      // 處理時間 (秒)
  success: boolean;             // 處理成功標誌
  cached_at: string;            // 快取時間戳 (ISO 8601)
  keyword: string;              // 原始關鍵字
}
```

#### 範例成功回應
```json
{
  "analysis_report": "# SEO 分析報告\\n\\n## 1. 分析概述\\n\\n### 關鍵字搜尋意圖分析\\n目標關鍵字「跑步鞋」的搜尋意圖主要包含以下幾個層面...",
  "token_usage": 5484,
  "processing_time": 22.46,
  "success": true,
  "cached_at": "2025-08-31T12:29:07.924683+00:00",
  "keyword": "跑步鞋"
}
```

## ⚠️ 錯誤處理

### 錯誤回應格式
```typescript
interface ErrorResponse {
  status: "error";
  error: {
    code: string;           // 錯誤碼
    message: string;        // 錯誤訊息 (繁體中文)
    details?: any;          // 詳細錯誤資訊
    timestamp: string;      // 錯誤時間戳
  };
}
```

### 主要錯誤碼

| 錯誤碼 | HTTP 狀態 | 說明 | 處理建議 |
|--------|-----------|------|----------|
| `INVALID_INPUT` | 400 | 輸入驗證失敗 | 檢查請求格式與欄位限制 |
| `KEYWORD_TOO_LONG` | 400 | 關鍵字超過 50 字元 | 縮短關鍵字長度 |
| `AUDIENCE_TOO_LONG` | 400 | 受眾描述超過 200 字元 | 縮短受眾描述 |
| `SERP_API_ERROR` | 503 | SerpAPI 服務異常 | 稍後重試 |
| `SCRAPER_TIMEOUT` | 504 | 網頁爬取逾時 | 稍後重試 |
| `AI_API_ERROR` | 503 | Azure OpenAI 服務異常 | 稍後重試 |
| `RATE_LIMIT_EXCEEDED` | 429 | 請求頻率過高 | 等待後重試 |

### 範例錯誤回應
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_INPUT",
    "message": "關鍵字長度必須在 1-50 字元之間",
    "details": {
      "field": "keyword",
      "provided_length": 55,
      "max_length": 50
    },
    "timestamp": "2025-01-20T10:30:00Z"
  }
}
```

## 🔒 驗證規則

### 關鍵字 (keyword)
- **必填**: 是
- **類型**: 字串
- **長度**: 1-50 字元
- **限制**: 不能只有空白字元

### 受眾描述 (audience) 
- **必填**: 是
- **類型**: 字串
- **長度**: 1-200 字元
- **限制**: 不能只有空白字元

### 選項 (options)
- **必填**: 是
- **類型**: 物件
- **欄位**: 
  - `generate_draft`: 布林值 (必填)
  - `include_faq`: 布林值 (必填)
  - `include_table`: 布林值 (必填)

## ⏱️ 效能規格

### 處理時間限制
- **總時間**: < 60 秒
- **SERP 擷取**: < 10 秒
- **網頁爬取**: < 20 秒 (並行 10 個 URL)
- **AI 分析**: < 30 秒
- **逾時設定**: 70 秒 (含 10 秒緩衝)

### 品質要求
- **爬蟲成功率**: ≥ 80% (10個URL至少成功8個)
- **Token 使用量**: < 6000 tokens/請求
- **API 可用性**: ≥ 99%
- **回應結構**: 扁平化設計，便於前端處理

## 🧪 測試範例

### 成功案例
```bash
curl -X POST http://localhost:8000/api/analyze \\
  -H "Content-Type: application/json" \\
  -d '{
    "keyword": "內容行銷",
    "audience": "B2B 行銷人員", 
    "options": {
      "generate_draft": true,
      "include_faq": true,
      "include_table": false
    }
  }'
```

### 錯誤案例 (關鍵字過長)
```bash
curl -X POST http://localhost:8000/api/analyze \\
  -H "Content-Type: application/json" \\
  -d '{
    "keyword": "這是一個超過五十個字元限制的超長關鍵字測試案例用來驗證系統邊界處理能力測試案例",
    "audience": "測試用戶",
    "options": {"generate_draft": false, "include_faq": false, "include_table": false}
  }'
```

## 🔧 輔助 API

### GET /api/health - 健康檢查
```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:30:00Z",
  "services": {
    "serp_api": "ok",
    "azure_openai": "ok",
    "redis": "optional"
  }
}
```

### GET /api/version - 版本資訊
```json
{
  "api_version": "1.0.0",
  "build_date": "2025-01-20",
  "python_version": "3.13.5",
  "dependencies": {
    "fastapi": "0.115.0",
    "openai": "1.54.0"
  }
}
```

## 📝 實作注意事項

### FastAPI 實作重點
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, validator

class AnalyzeRequest(BaseModel):
    keyword: str
    audience: str
    options: dict
    
    @validator('keyword')
    def validate_keyword(cls, v):
        if len(v.strip()) == 0:
            raise ValueError('關鍵字不能為空')
        if len(v) > 50:
            raise ValueError('關鍵字不能超過 50 字元')
        return v.strip()

@app.post("/api/analyze")
async def analyze_keyword(request: AnalyzeRequest):
    # 實作分析邏輯
    pass
```

### CORS 設定
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

---
**最後更新**: 2025-09-01  
**狀態**: API 規格已更新至與實際實現一致  
**檔案位置**: `/docs/specs/api_spec.md`  
**重要變更**: 更新回應結構為扁平化設計，移除巢狀 data 物件