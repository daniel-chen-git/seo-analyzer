# 產品規格書 (Product Specification) - SEO Analyzer MVP

## 1. 系統目標

### 主要目的
開發一個 **MVP 級別的一頁式 SEO 分析工具**，讓使用者輸入關鍵字和目標受眾後，自動生成完整的 SEO 內容策略報告。

### 驗證點
- 驗證 SerpAPI + 網頁爬蟲 + GPT-4o 的整合可行性
- 驗證端到端處理時間是否能控制在 60 秒內
- 驗證生成的 SEO 報告品質是否符合使用者需求
- 驗證系統能處理中英文關鍵字

## 2. 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                     前端 (React)                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  輸入表單 → 進度顯示 → Markdown 結果展示          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓ HTTP/REST
┌─────────────────────────────────────────────────────────┐
│                   後端 API (FastAPI)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │   1. SERP 模組     → 呼叫 SerpAPI                │  │
│  │   2. 爬蟲模組      → BeautifulSoup 解析          │  │
│  │   3. AI 分析模組   → Azure OpenAI GPT-4o         │  │
│  │   4. 快取模組      → Redis (Optional for MVP)    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 3. 資料流

### 3.1 輸入資料
```json
{
  "keyword": "SEO 工具推薦",
  "audience": "初學者",
  "options": {
    "generate_draft": true,
    "include_faq": true,
    "include_table": true
  }
}
```

### 3.2 處理流程
1. **SERP 擷取** (10秒)
   - 呼叫 SerpAPI 取得 Top 10 結果
   - 回傳 position, url, title, snippet

2. **內容爬取** (20秒)
   - 並行爬取 10 個 URL
   - 解析 H1, H2s, 字數, 段落數
   - 容錯處理（允許 20% 失敗率）

3. **AI 分析** (30秒)
   - 組合 prompt + SERP 資料
   - 呼叫 GPT-4o API
   - 解析 Markdown 回應

### 3.3 輸出資料
```json
{
  "status": "success",
  "processing_time": 45,
  "data": {
    "serp_summary": {
      "total_results": 10,
      "successful_scrapes": 8,
      "avg_word_count": 1850,
      "avg_paragraphs": 15
    },
    "analysis_report": "# SEO 分析報告\n\n## 1. 標題分析...",
    "metadata": {
      "keyword": "SEO 工具推薦",
      "audience": "初學者",
      "generated_at": "2024-01-20T10:30:00Z"
    }
  }
}
```

## 4. 功能模組 (MVP 範圍)

### 4.1 前端模組
| 模組名稱 | 功能描述 | 優先級 |
|---------|---------|--------|
| InputForm | 關鍵字 + 受眾輸入表單 | P0 |
| ProgressIndicator | 三階段進度顯示 | P0 |
| MarkdownViewer | 結果渲染展示 | P0 |
| CopyButton | 複製 Markdown 內容 | P0 |
| DownloadButton | 下載 .md 檔案 | P1 |

### 4.2 後端模組
| 模組名稱 | 功能描述 | 優先級 |
|---------|---------|--------|
| serp_service | SerpAPI 整合 | P0 |
| scraper_service | 網頁內容爬取 | P0 |
| ai_service | GPT-4o 呼叫與 prompt 管理 | P0 |
| cache_service | Redis 快取 (可選) | P2 |

## 5. API 設計

### 5.1 主要端點

#### POST /api/analyze
**描述**: 執行 SEO 分析

**Request:**
```json
{
  "keyword": "string",
  "audience": "string",
  "options": {
    "generate_draft": boolean,
    "include_faq": boolean,
    "include_table": boolean
  }
}
```

**Response (Success):**
```json
{
  "status": "success",
  "job_id": "uuid",
  "processing_time": 45.2,
  "data": {
    "serp_summary": {...},
    "analysis_report": "markdown string",
    "metadata": {...}
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error_code": "SERP_API_ERROR",
  "message": "無法取得 SERP 資料",
  "details": {}
}
```

#### GET /api/status/{job_id}
**描述**: 查詢處理進度 (Optional for MVP)

**Response:**
```json
{
  "job_id": "uuid",
  "status": "processing",
  "progress": {
    "current_step": 2,
    "total_steps": 3,
    "message": "正在分析競爭對手內容..."
  }
}
```

### 5.2 內部服務介面

#### SerpAPI 呼叫
```python
def get_serp_data(keyword: str, location: str = "Taiwan") -> dict:
    """
    Returns:
    {
        "organic_results": [
            {
                "position": 1,
                "title": "...",
                "link": "...",
                "snippet": "..."
            }
        ]
    }
    """
```

#### 爬蟲服務
```python
def scrape_content(url: str) -> dict:
    """
    Returns:
    {
        "success": true,
        "data": {
            "h1": "主標題",
            "h2_list": ["副標題1", "副標題2"],
            "word_count": 1500,
            "paragraph_count": 12
        }
    }
    """
```

#### AI 分析服務
```python
def analyze_with_gpt4(
    serp_data: dict,
    keyword: str,
    audience: str,
    options: dict
) -> str:
    """
    Returns: Markdown formatted analysis report
    """
```

## 6. 技術棧

### 6.1 前端 (2025年最新版本)
- **框架**: React 18.3 + TypeScript 5.9
- **建構工具**: Vite 6.0 (取代 Create React App)
- **UI 庫**: Tailwind CSS 4.0 + @tailwindcss/vite
- **Markdown 渲染**: react-markdown 9.0
- **HTTP Client**: Axios 1.11
- **狀態管理**: React Hooks (useState, useEffect)
- **測試**: Vitest 3.0 + React Testing Library

### 6.2 後端 (配合 Session 01 決策)
- **框架**: FastAPI (Python 3.13.5)
- **套件管理**: uv (取代 pip)
- **爬蟲**: BeautifulSoup4 4.13 + httpx 0.27
- **AI 整合**: OpenAI 1.54 (Azure OpenAI)
- **非同步**: asyncio (內建)
- **配置管理**: configparser + config.ini (取代 python-dotenv)
- **驗證**: Pydantic 2.11
- **CORS**: fastapi.middleware.cors
- **測試**: pytest 8.3 + pytest-asyncio

### 6.3 外部 API
- **SerpAPI**: Google 搜尋結果 (需 API Key)
- **Azure OpenAI**: GPT-4o 模型 (需 API Key)
- **Redis**: 選用，用於快取 (MVP 可略)

### 6.4 部署與開發環境
- **本地測試**: ngrok (對外測試)
- **前端部署**: Vercel 或 Netlify (未來)
- **後端部署**: Railway 或 Render (未來)
- **配置管理**: config.ini 檔案 (使用 configparser)
- **套件管理**: uv (Python) + npm (Node.js)
- **開發工具**: VS Code + Claude Code

## 7. 限制與假設

### MVP 簡化項目
1. **無用戶系統**: 不需登入，直接使用
2. **無資料庫**: 不儲存歷史查詢
3. **無佇列系統**: 使用同步處理（單一請求）
4. **簡單錯誤處理**: 基本 try-catch 即可
5. **無 Rate Limiting**: MVP 階段不限制（生產環境需加入）
6. **單語系介面**: UI 僅中文
7. **固定 Prompt**: 不提供 prompt 客製化

### 技術假設
1. SerpAPI 每次都能正常回應（配額充足）
2. 爬蟲成功率 ≥ 80%
3. GPT-4o API 穩定可用
4. 單次處理時間 < 60 秒
5. Token 使用量 < 8000/次

### 使用限制
- 同時處理請求數: 1 (MVP 不支援並發)
- 關鍵字長度: 最多 50 字元
- 受眾描述: 最多 200 字元

## 8. 驗收標準

### 8.1 功能驗收
- [ ] 輸入中文關鍵字，能成功取得 SERP 結果
- [ ] 輸入英文關鍵字，能成功取得 SERP 結果  
- [ ] 成功爬取至少 8/10 個網站內容
- [ ] GPT-4o 回傳完整 6 大模組分析
- [ ] Markdown 正確渲染（含表格）
- [ ] 複製功能正常運作
- [ ] 總處理時間 < 60 秒

### 8.2 錯誤處理驗收
- [ ] SerpAPI 失敗時顯示友善錯誤訊息
- [ ] 爬蟲失敗時能繼續處理其他 URL
- [ ] GPT-4o 逾時能正確處理
- [ ] 前端能顯示各階段處理狀態

### 8.3 品質驗收
- [ ] 生成的標題建議符合 SERP 趨勢
- [ ] 關鍵字分類（短/中/長尾）合理
- [ ] SEO 大綱結構完整且邏輯清晰
- [ ] 初稿內容與目標受眾相符

### 8.4 MVP 成功指標
- 完成一次端到端的成功分析
- 處理時間控制在 60 秒內
- 生成報告包含所有必要模組
- 無重大 Bug 影響核心流程

---

## 附錄 A: 快速開發指南

### 開發順序建議 (Session 計劃)
1. **Session 03-04**: 後端 FastAPI 主程式 + config.ini
2. **Session 05**: SerpAPI 服務 + 爬蟲服務整合
3. **Session 06**: GPT-4o AI 分析服務 + Prompt 調試
4. **Session 07**: 前端 Vite + React 專案初始化
5. **Session 08**: 前端核心元件開發 (InputForm, ProgressIndicator)
6. **Session 09**: 前端結果展示 (MarkdownViewer) + API 整合
7. **Session 10**: 整合測試 + 部署準備 (ngrok)

### 配置檔案設定 (改用 config.ini)
```ini
# config.ini.example
[api_keys]
serp_api_key = your_serp_api_key
azure_openai_api_key = your_azure_key
azure_openai_endpoint = https://xxx.openai.azure.com
azure_deployment_name = gpt-4o

[server]
port = 8000
host = 0.0.0.0
debug = true

[limits]
max_scrape_workers = 10
scrape_timeout = 10
max_tokens = 8000

[redis]
redis_url = redis://localhost:6379
```

### 測試資料
```json
{
  "test_cases": [
    {
      "keyword": "內容行銷",
      "audience": "B2B 行銷人員"
    },
    {
      "keyword": "Python tutorial",
      "audience": "beginners"
    },
    {
      "keyword": "健康飲食",
      "audience": "上班族"
    }
  ]
}
```

## 附錄 B: 錯誤碼定義

| 錯誤碼 | 說明 | 處理方式 |
|--------|------|----------|
| SERP_API_ERROR | SerpAPI 呼叫失敗 | 顯示錯誤，建議重試 |
| SCRAPER_TIMEOUT | 爬蟲逾時 | 跳過該 URL，繼續處理 |
| AI_API_ERROR | GPT-4o 呼叫失敗 | 顯示錯誤，建議重試 |
| INVALID_INPUT | 輸入驗證失敗 | 顯示具體錯誤訊息 |
| RATE_LIMIT | 超過使用限制 | 顯示等待時間 |

---
**最後更新**: Session 02  
**狀態**: 技術棧已更新，配合最新開發決策  
**檔案位置**: `/docs/specs/product_spec.md`