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

#### 成功回應 (200 OK)
```typescript
interface AnalyzeResponse {
  status: "success";
  processing_time: number;   // 處理時間 (秒)
  data: {
    serp_summary: {
      total_results: number;        // SERP 總結果數
      successful_scrapes: number;   // 成功爬取數量
      avg_word_count: number;       // 平均字數
      avg_paragraphs: number;       // 平均段落數
    };
    analysis_report: string;        // Markdown 格式報告
    metadata: {
      keyword: string;              // 原始關鍵字
      audience: string;             // 原始受眾
      generated_at: string;         // ISO 8601 時間戳
      token_usage: number;          // AI Token 使用量
    };
  };
}
```

#### 範例成功回應
```json
{
  "status": "success",
  "processing_time": 45.8,
  "data": {
    "serp_summary": {
      "total_results": 10,
      "successful_scrapes": 8,
      "avg_word_count": 1850,
      "avg_paragraphs": 15
    },
    "analysis_report": "# SEO 分析報告\\n\\n## 1. 標題分析\\n基於 SERP 前 10 名結果...",
    "metadata": {
      "keyword": "SEO 工具推薦",
      "audience": "中小企業行銷人員",
      "generated_at": "2025-01-20T10:30:00Z",
      "token_usage": 7500
    }
  }
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
- **Token 使用量**: < 8000 tokens/請求
- **API 可用性**: ≥ 99%

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
**最後更新**: Session 02  
**狀態**: API 規格完整定義完成 (UTF-8 編碼)  
**檔案位置**: `/docs/specs/api_spec.md`