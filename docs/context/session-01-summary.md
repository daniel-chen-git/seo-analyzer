# SEO Analyzer 專案 - Session 01 總結與交接

## 🎯 專案概述
- **專案名稱**: SEO Analyzer MVP
- **目標**: 開發一頁式 SEO 分析工具，60秒內生成完整報告
- **技術棧**: FastAPI (後端) + React 18 (前端) + TypeScript
- **Python版本**: 3.13.5
- **開發環境**: VS Code + uv (Python套件管理)
- **部署目標**: 
  - 本地測試：ngrok
  - 未來部署：Vercel/Netlify (前端)、Railway/Render (後端)

## ✅ Session 01 完成項目

### 1. 專案結構建立
```
seo-analyzer/
├── frontend/                 # React 前端
├── backend/                  # FastAPI 後端
├── qa/                       # 測試專案
├── docs/                     # 文檔管理
│   ├── context/             # 上下文管理
│   ├── specs/               # 規格書
│   └── decisions/           # 技術決策
├── .claude/                  # Claude 設定
└── .vscode/                  # VS Code 設定
```

### 2. 已建立的配置文件

#### .gitignore
- Python 相關 (__pycache__, venv, .env)
- Node.js 相關 (node_modules, build)
- IDE 和專案特定檔案

#### .vscode/settings.json
- Python 格式化 (Black, Pylint)
- TypeScript/JavaScript 設定
- 必要擴充套件清單已註解在檔案中

### 3. Claude Context 文件（.claude/）

#### instructions.md ✅
- 完整的開發規範
- PEP 8 & PEP 257 規範
- Git commit 規範
- TDD 開發流程
- 測試策略
- **重要**: 使用 uv 管理 Python 套件

#### context.md ✅
- 專案總覽儀表板
- API 契約定義
- 里程碑時程
- 風險管理
- Session 記錄

#### backend_context.md ✅
- 後端架構設計
- 服務層規劃 (SerpAPI, Scraper, AI)
- **使用 configparser 讀取 config.ini**（非 .env）
- 最新套件版本（支援 Python 3.13.5）：
  ```
  fastapi==0.115.0
  uvicorn[standard]==0.35.0
  python-dotenv==1.1.1
  httpx==0.27.2
  beautifulsoup4==4.13.4
  openai==1.54.0
  pydantic==2.11.0
  pytest==8.3.3
  pytest-asyncio==1.1.0
  redis==6.4.0
  ```

## 📋 待完成項目

### 立即待辦（Session 02）
1. [ ] 建立 frontend_context.md
2. [ ] 建立 qa_context.md
3. [ ] 建立 docs/specs/product_spec.md（從原始 seo-tool-spec.md 複製）
4. [ ] 建立 docs/specs/api_spec.md
5. [ ] 初始化 Git repository 並首次 commit

### 後續開發順序
1. **後端開發** (Session 03-05)
   - FastAPI 主程式 (main.py)
   - config.ini 配置檔案
   - 三大服務實作

2. **前端開發** (Session 06-08)
   - React 專案初始化
   - Tailwind CSS 設定
   - 元件開發

3. **整合測試** (Session 09-10)
   - API 連接
   - E2E 測試
   - 本地部署 (ngrok)

## 🔧 重要技術決策

### 1. 配置管理
- **決策**: 使用 Python 內建 configparser + config.ini
- **原因**: 客戶要求，取代 pydantic BaseSettings

### 2. Python 套件管理
- **決策**: 使用 uv 取代 pip
- **原因**: 更快的安裝速度

### 3. Context 管理策略
- **決策**: 分離前端/後端/QA context
- **原因**: 避免資訊混雜，各自專注

## 💡 開發原則提醒

1. **程式碼規範**
   - Python: PEP 8 + PEP 257
   - 註解使用繁體中文
   - Docstring 包含 What, Why, How

2. **Git Commit 規範**
   - feat: 新功能
   - fix: 修復
   - test: 測試
   - docs: 文檔

3. **TDD 流程**
   - 先寫測試再寫程式碼
   - 每個功能都要 git commit

4. **Context7 使用**
   - 查詢時加註解: `# 使用 context7 查詢：xxx`

## ⚡ 效能與限制要求

### 處理時間分配（總計 < 60秒）
1. **SERP 擷取**: 10秒
2. **網頁爬取**: 20秒（並行 10 個 URL）
3. **AI 分析**: 30秒

### 系統限制
- **爬蟲成功率**: ≥ 80%（10個URL至少成功8個）
- **Token 使用量**: < 8000 tokens/次
- **關鍵字長度**: 最多 50 字元
- **受眾描述**: 最多 200 字元
- **並發處理**: MVP 不支援（單一請求）

## 🛠️ 技術棧詳細說明

### 前端技術
- **框架**: React 18 + TypeScript
- **樣式**: Tailwind CSS
- **Markdown渲染**: react-markdown
- **HTTP Client**: Axios
- **狀態管理**: React Hooks (useState, useEffect)
- **核心元件**:
  - `InputForm.tsx` - 關鍵字與受眾輸入
  - `ProgressIndicator.tsx` - 三階段進度顯示
  - `MarkdownViewer.tsx` - 結果渲染展示

### 測試框架
- **前端測試**: Jest + React Testing Library
- **後端測試**: pytest + pytest-asyncio
- **E2E測試**: Playwright
- **覆蓋率目標**: 單元測試 80%、整合測試 60%、E2E 核心流程 100%

## 🚀 新 Session 啟動指令

請在新對話中上傳此文件，並使用以下指令：

```
我要繼續開發 SEO Analyzer 專案。
請先閱讀上傳的 session_01_summary.md 了解專案狀態。

當前任務：
1. 建立 frontend_context.md
2. 建立 qa_context.md
3. 準備進入後端開發階段

請保持相同的開發規範和風格。
```

## 📦 需要一併傳遞的關鍵資訊

### API 契約
```json
POST /api/analyze
Request:
{
  "keyword": "string (1-50字)",
  "audience": "string (1-200字)",
  "options": {
    "generate_draft": boolean,
    "include_faq": boolean,
    "include_table": boolean
  }
}

Response (Success):
{
  "status": "success",
  "processing_time": 45.2,
  "data": {
    "serp_summary": {
      "total_results": 10,
      "successful_scrapes": 8,
      "avg_word_count": 1850,
      "avg_paragraphs": 15
    },
    "analysis_report": "# SEO 分析報告\n\n...",
    "metadata": {
      "keyword": "SEO 工具推薦",
      "audience": "初學者",
      "generated_at": "2024-01-20T10:30:00Z"
    }
  }
}
```

### 錯誤碼定義
- `SERP_API_ERROR`: SerpAPI 呼叫失敗
- `SCRAPER_TIMEOUT`: 爬蟲逾時
- `AI_API_ERROR`: GPT-4o 呼叫失敗
- `INVALID_INPUT`: 輸入驗證失敗
- `RATE_LIMIT`: 超過使用限制

### config.ini 結構
```ini
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

### SEO 報告輸出模組（GPT-4o 需生成）
1. **標題分析** - 分析 SERP 前 10 名的標題模式
2. **關鍵字分類** - 短尾、中尾、長尾關鍵字建議
3. **內容大綱** - H1、H2、H3 結構建議
4. **競爭分析** - 字數、段落數、關鍵字密度
5. **FAQ 建議** - 常見問題整理（可選）
6. **初稿生成** - 800-1200 字初稿（可選）

## 📝 補充說明

1. **原始規格書**: seo-tool-spec.md 和 instructions.md 是客戶提供的原始文件
2. **MCP 設定**: context7 已透過 MCP 整合，但 Web 版無法使用
3. **環境**: 本地開發，使用 ngrok 對外測試
4. **版本**: Python 3.13.5, uv 已安裝

---
**Session 01 結束時間**: 2024-01-20
**下一步**: 上傳此文件到新對話，繼續 Session 02