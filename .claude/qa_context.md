# QA 測試上下文

## 最後更新：2024-01-20 17:00
## 負責人：QA Engineer  
## 當前 Session：#2

## 🎯 測試目標與策略
- **總體目標**: 確保 SEO Analyzer 在 60 秒內穩定產出高質量報告
- **品質標準**: 爬蟲成功率 ≥ 80%，API 回應時間 < 60 秒
- **技術棧**: Python 3.13.5 + React 18.3 + TypeScript 5.9 + Vite 6

## 📂 測試架構
```
qa/
├── unit_tests/
│   ├── backend/                    # Python 3.13.5 + pytest
│   │   ├── test_serp_service.py   # SerpAPI 服務測試 ⏳
│   │   ├── test_scraper.py        # 網頁爬蟲測試 ⏳
│   │   ├── test_ai_service.py     # GPT-4o 分析測試 ⏳
│   │   └── test_config.py         # config.ini 讀取測試 ⏳
│   └── frontend/                   # Vitest + React Testing Library
│       ├── components/
│       │   ├── InputForm.test.tsx          # 表單驗證測試 ⏳
│       │   ├── ProgressIndicator.test.tsx  # 進度顯示測試 ⏳
│       │   └── MarkdownViewer.test.tsx     # 結果渲染測試 ⏳
│       ├── hooks/
│       │   ├── useAnalysis.test.ts         # API 呼叫 Hook 測試 ⏳
│       │   └── useProgress.test.ts         # 進度管理 Hook 測試 ⏳
│       └── utils/
│           ├── api.test.ts                 # API 工具測試 ⏳
│           └── validation.test.ts          # 驗證邏輯測試 ⏳
├── integration_tests/
│   ├── test_api_endpoints.py      # API 端點整合測試 ⏳
│   ├── test_service_integration.py # 服務間整合測試 ⏳
│   └── test_performance.py        # 效能基準測試 ⏳
├── e2e_tests/                     # Playwright
│   ├── test_happy_path.py         # 完整成功流程 ⏳
│   ├── test_error_scenarios.py    # 錯誤處理流程 ⏳
│   └── test_performance_limits.py # 60秒限制測試 ⏳
├── test_data/
│   ├── mock_serp_responses.json   # SERP API 模擬回應 ✅
│   ├── mock_scrape_data.json      # 爬蟲模擬數據 ✅
│   ├── mock_ai_responses.json     # GPT-4o 模擬回應 ✅
│   └── test_keywords.json         # 測試關鍵字集合 ✅
├── performance/
│   ├── load_testing.py           # 負載測試 ⏳
│   └── stress_testing.py         # 壓力測試 ⏳
└── ci_cd/
    ├── github_actions.yml        # CI/CD 配置 ⏳
    └── test_reports/             # 測試報告輸出 ⏳
```

## 🧪 測試策略

### 覆蓋率目標
- **後端單元測試**: 80%+ (重點：SerpAPI、爬蟲、AI 服務)
- **前端單元測試**: 90%+ (元件、Hooks、工具函數)
- **整合測試**: 60%+ (API 端點、服務間通訊)
- **E2E 測試**: 核心流程 100% (成功路徑、錯誤處理)

### 效能測試基準
```yaml
時間限制測試:
  total_time: "< 60 秒"
  serp_fetch: "< 10 秒"
  web_scraping: "< 20 秒 (並行 10 個 URL)"
  ai_analysis: "< 30 秒"

成功率基準:
  scraping_success_rate: ">= 80% (10個URL至少成功8個)"
  api_availability: ">= 99.5%"
  
資源使用限制:
  token_usage: "< 8000 tokens/request"
  memory_usage: "< 1GB peak"
  concurrent_requests: "1 (MVP 限制)"
```

### 測試環境分層
1. **Unit**: 獨立元件測試，使用 Mock
2. **Integration**: 真實 API 呼叫 (使用測試 API keys)
3. **E2E**: 完整使用者流程 (Playwright)
4. **Performance**: 負載與壓力測試

## ✅ 已完成
### 測試資料準備
- **Mock SERP 回應**: 完整 JSON 格式，包含 10 個搜尋結果
- **Mock GPT-4o 回應**: Markdown 格式 SEO 報告範本
- **測試關鍵字清單**: 涵蓋中英文、長短尾關鍵字
- **邊界測試數據**: 1字元、50字元關鍵字；1字元、200字元受眾描述

## 🔄 進行中任務

### 後端單元測試 (pytest + Python 3.13.5)
```python
# test_serp_service.py
@pytest.mark.asyncio
async def test_serp_service_success():
    """測試 SERP API 正常回應"""
    # Mock SerpAPI 成功回應
    # 驗證回傳 10 個搜尋結果
    # 確認處理時間 < 10 秒

@pytest.mark.asyncio  
async def test_serp_service_api_error():
    """測試 SERP API 錯誤處理"""
    # Mock API 錯誤 (401, 429, 500)
    # 驗證錯誤碼 SERP_API_ERROR
    # 確認 graceful degradation

@pytest.mark.asyncio
async def test_serp_service_timeout():
    """測試 SERP API 逾時處理"""
    # Mock 逾時情況 (> 10 秒)
    # 驗證逾時處理機制
    # 確認資源清理

# test_scraper.py
@pytest.mark.asyncio
async def test_parallel_scraping_success():
    """測試並行爬蟲成功案例"""
    # 模擬 10 個 URL 並行爬取
    # 驗證成功率 >= 80%
    # 確認處理時間 < 20 秒

@pytest.mark.asyncio
async def test_scraper_chinese_content():
    """測試中文內容爬取"""
    # 驗證繁體/簡體中文處理
    # 確認編碼正確性
    # 檢查內容擷取完整性
```

### 前端單元測試 (Vitest + React Testing Library)
```typescript
// InputForm.test.tsx
describe('InputForm', () => {
  test('驗證關鍵字長度限制 (1-50字元)', () => {
    // 測試邊界值：空值、1字元、50字元、51字元
    // 驗證即時錯誤提示
  });
  
  test('驗證受眾描述長度限制 (1-200字元)', () => {
    // 測試邊界值：空值、1字元、200字元、201字元  
    // 驗證即時錯誤提示
  });
  
  test('表單提交資料格式正確', () => {
    // 驗證 AnalyzeRequest 介面格式
    // 確認 snake_case 欄位名稱
  });
});

// useAnalysis.test.ts
describe('useAnalysis Hook', () => {
  test('API 呼叫成功流程', () => {
    // Mock 成功回應
    // 驗證進度狀態更新
    // 確認結果解析正確
  });
  
  test('網路錯誤處理', () => {
    // Mock 網路錯誤
    // 驗證錯誤訊息顯示
    // 確認重試機制
  });
});
```

## ⏳ 待開發測試

### 整合測試 (FastAPI + pytest)
```python
# test_api_endpoints.py
@pytest.mark.integration
async def test_analyze_endpoint_success():
    """測試 /api/analyze 成功流程"""
    payload = {
        "keyword": "SEO 工具推薦", 
        "audience": "行銷新手",
        "options": {"generate_draft": True, "include_faq": True, "include_table": False}
    }
    # 驗證完整 60 秒流程
    # 確認回應格式符合 AnalyzeResponse

@pytest.mark.integration  
async def test_analyze_endpoint_validation():
    """測試輸入驗證"""
    # 測試關鍵字長度驗證 (1-50字元)
    # 測試受眾描述驗證 (1-200字元)
    # 驗證錯誤碼 INVALID_INPUT

# test_service_integration.py
@pytest.mark.integration
async def test_serp_to_scraper_flow():
    """測試 SERP → 爬蟲服務整合"""
    # 真實 SerpAPI 呼叫
    # 串接爬蟲服務
    # 驗證數據流通

@pytest.mark.integration
async def test_scraper_to_ai_flow():
    """測試爬蟲 → AI 分析整合"""
    # 爬蟲結果輸入 AI 服務
    # 驗證 Markdown 報告生成
    # 確認 token 使用量 < 8000
```

### E2E 測試 (Playwright)
```python
# test_happy_path.py
def test_complete_analysis_flow(page):
    """測試完整成功分析流程"""
    # 1. 開啟應用
    # 2. 輸入關鍵字與受眾
    # 3. 提交分析請求  
    # 4. 監控三階段進度
    # 5. 驗證報告顯示
    # 6. 確認總時間 < 60 秒

def test_progress_indicator_updates(page):
    """測試進度指示器更新"""
    # 驗證三階段狀態變化
    # 確認時間計數器
    # 檢查視覺回饋

# test_error_scenarios.py  
def test_network_error_handling(page):
    """測試網路錯誤處理"""
    # 模擬網路中斷
    # 驗證錯誤訊息顯示
    # 確認重試機制

def test_api_timeout_handling(page):
    """測試 API 逾時處理"""
    # 模擬 70 秒逾時
    # 驗證逾時訊息
    # 確認使用者體驗

# test_performance_limits.py
def test_60_second_time_limit(page):
    """測試 60 秒時間限制"""
    # 使用複雜關鍵字
    # 監控實際處理時間
    # 驗證是否超過限制
```

### 效能測試 (Locust/Artillery)
```python
# load_testing.py
class AnalysisUser(HttpUser):
    wait_time = between(60, 120)  # 每次請求間隔
    
    @task
    def analyze_keyword(self):
        """模擬使用者分析請求"""
        payload = self.generate_test_payload()
        response = self.client.post("/api/analyze", json=payload, timeout=70)
        assert response.status_code == 200
        assert response.json()["status"] == "success"
```

## 📋 測試案例清單

### 🚨 Priority 1 (必測) - 核心功能
1. **輸入驗證測試**
   - 關鍵字：空值、1字元、50字元、51字元、特殊字元
   - 受眾描述：空值、1字元、200字元、201字元、換行符號
   - Options 選項：boolean 值驗證

2. **API 功能測試**  
   - POST /api/analyze 成功回應 (200)
   - 回應格式符合 AnalyzeResponse 介面
   - 處理時間 < 60 秒驗證

3. **錯誤處理測試**
   - 網路錯誤 (NETWORK_ERROR)
   - SerpAPI 錯誤 (SERP_API_ERROR)
   - 爬蟲逾時 (SCRAPER_TIMEOUT)
   - AI API 錯誤 (AI_API_ERROR)
   - 輸入驗證錯誤 (INVALID_INPUT)

4. **效能基準測試**
   - 60 秒總時間限制
   - 爬蟲成功率 ≥ 80%
   - Token 使用量 < 8000

### 🔶 Priority 2 (應測) - 穩定性
1. **邊界條件測試**
   - 極長關鍵字 (接近 50 字元)
   - 極長受眾描述 (接近 200 字元)
   - 特殊中文字元 (繁體、簡體、符號)

2. **使用者體驗測試**
   - 進度指示器即時更新
   - 錯誤訊息友善顯示
   - 載入狀態視覺回饋

3. **瀏覽器相容性測試** 
   - Chrome (最新版)
   - Firefox (最新版)
   - Safari (最新版)
   - Edge (最新版)

4. **響應式設計測試**
   - 手機裝置 (320px - 768px)
   - 平板裝置 (768px - 1024px)
   - 桌面裝置 (1024px+)

### 🔷 Priority 3 (選測) - 進階功能
1. **負載測試**
   - 同時 10 個使用者請求
   - 連續 100 次請求測試
   - 記憶體洩漏檢測

2. **安全性測試**
   - SQL Injection 防護
   - XSS 防護
   - CSRF 防護
   - API Rate Limiting

3. **資料正確性測試**
   - SEO 報告內容品質
   - Markdown 格式正確性
   - 關鍵字分析準確度

## 🐛 Bug 追蹤與品質管控

### 已知問題 (範例)
1. **[BUG-001]** SerpAPI 中文關鍵字編碼問題
   - **嚴重度**: Medium
   - **狀態**: Open  
   - **指派**: Backend Team
   - **描述**: 繁體中文關鍵字在 SerpAPI 查詢時出現編碼錯誤
   - **重現步驟**: 輸入 "中文關鍵字" → 提交分析 → 檢查 SERP 結果
   - **預期結果**: 正確中文搜尋結果
   - **實際結果**: 亂碼或無結果

2. **[BUG-002]** Progress indicator 不即時更新
   - **嚴重度**: Low
   - **狀態**: Open
   - **指派**: Frontend Team  
   - **描述**: 進度指示器在階段切換時有延遲
   - **影響**: 使用者體驗不佳

### Bug 分類與處理流程
```yaml
嚴重度分級:
  Critical: "系統崩潰、資料遺失"
  High: "核心功能無法使用"  
  Medium: "功能異常但有替代方案"
  Low: "使用者體驗問題"

處理時程:
  Critical: "立即修復 (< 2 小時)"
  High: "當日修復 (< 8 小時)"
  Medium: "3 天內修復"
  Low: "下個版本修復"
```

### 品質門檻 (Quality Gates)
```yaml
發佈前檢查項目:
  - 所有 Critical/High bugs 必須修復
  - 單元測試覆蓋率 >= 目標值
  - E2E 核心流程 100% 通過
  - 效能測試達標 (< 60 秒)
  - 安全性掃描通過
  - 程式碼 review 完成
```

## 🔧 測試環境配置 (2025年最新版本)

### 後端測試環境
```yaml
python_environment:
  python_version: "3.13.5"
  pytest: "^8.3.3"
  pytest_asyncio: "^1.1.0"
  pytest_cov: "^6.0.0"
  httpx: "^0.27.2"  # 用於 API 測試
  
api_testing:
  fastapi_testclient: "included_in_fastapi"
  mock_libraries: ["pytest-mock", "responses"]
  
performance_testing:
  locust: "^2.33.1"
  pytest_benchmark: "^4.0.0"
```

### 前端測試環境  
```yaml
javascript_environment:
  node_version: "20 LTS"
  vitest: "^3.0.5"       # 取代 Jest，與 Vite 整合更好
  testing_library_react: "^16.1.0"
  testing_library_jest_dom: "^6.6.3"
  testing_library_user_event: "^14.5.2"
  
ui_testing:
  jsdom: "^25.0.1"       # DOM 模擬環境
  happy_dom: "^15.11.6"  # 更快的 DOM 模擬 (可選)
  
component_testing:
  react_test_renderer: "^18.3.1"
  storybook: "^8.4.7"    # 元件展示與測試
```

### E2E 測試環境
```yaml
e2e_framework:
  playwright: "^1.49.1"
  browsers: ["chromium", "firefox", "webkit"]
  
mobile_testing:
  device_emulation: true
  touch_events: true
  viewport_testing: ["mobile", "tablet", "desktop"]
  
visual_testing:
  screenshot_comparison: true
  pdf_testing: false     # SEO 報告不需要 PDF 測試
```

### CI/CD 測試環境
```yaml
github_actions:
  os_matrix: ["ubuntu-latest", "windows-latest", "macos-latest"]
  python_matrix: ["3.13.5"]
  node_matrix: ["20"]
  
parallel_testing:
  backend_jobs: 4
  frontend_jobs: 2
  e2e_jobs: 2
  
test_reporting:
  coverage_format: ["html", "xml", "json"]
  artifact_retention: "30 days"
```

## 🚀 測試執行指令

### 後端測試指令
```bash
# 基本單元測試
cd backend
uv run pytest unit_tests/

# 整合測試 (需要測試 API keys)
uv run pytest integration_tests/ --env=test

# 覆蓋率報告
uv run pytest --cov=app --cov-report=html --cov-report=term

# 效能測試
uv run pytest performance/ --benchmark-only

# 特定服務測試
uv run pytest unit_tests/test_serp_service.py -v
uv run pytest unit_tests/test_scraper.py -v
uv run pytest unit_tests/test_ai_service.py -v
```

### 前端測試指令
```bash
# 基本單元測試 (Vitest)
cd frontend  
npm run test

# 監聽模式
npm run test:watch

# 覆蓋率報告
npm run test:coverage

# UI 元件測試
npm run test:ui

# 特定元件測試
npm run test -- InputForm.test.tsx
npm run test -- ProgressIndicator.test.tsx
```

### E2E 測試指令
```bash
# 完整 E2E 測試套件
cd qa
python -m pytest e2e_tests/ --browser=chromium

# 多瀏覽器測試
python -m pytest e2e_tests/ --browser=all

# 特定測試案例
python -m pytest e2e_tests/test_happy_path.py -v

# 視覺測試 (截圖對比)
python -m pytest e2e_tests/ --screenshot=on-failure

# 效能測試 (60秒限制)
python -m pytest e2e_tests/test_performance_limits.py
```

### CI/CD 自動化指令
```bash
# 完整測試流程 (本地模擬 CI)
./scripts/run_all_tests.sh

# 快速檢查 (commit 前)
./scripts/pre_commit_check.sh

# 產生測試報告
./scripts/generate_test_report.sh
```

### 效能與負載測試
```bash
# 負載測試 (Locust)
cd qa/performance
locust -f load_testing.py --host=http://localhost:8000

# 壓力測試
python stress_testing.py --users=10 --duration=300s

# API 回應時間測試
python -m pytest performance/test_response_time.py
```

## 🎯 下一步行動計劃

### 立即任務 (Session 02-03)
1. **建立測試資料結構**
   - 設計 Mock SERP 回應格式
   - 準備測試關鍵字集合
   - 建立 AI 回應模板

2. **後端單元測試開發**
   - SerpAPI 服務測試
   - 網頁爬蟲測試  
   - AI 分析服務測試
   - Config 讀取測試

3. **前端單元測試開發**
   - InputForm 驗證測試
   - ProgressIndicator 狀態測試
   - API Hook 測試

### 中期任務 (Session 04-06)
1. **整合測試建立**
   - API 端點測試
   - 服務間資料流測試
   - 效能基準測試

2. **E2E 測試開發**
   - 完整使用者流程
   - 錯誤處理場景
   - 多瀏覽器相容性

3. **CI/CD Pipeline 設定**
   - GitHub Actions 配置
   - 自動化測試執行
   - 測試報告生成

### 長期任務 (Session 07+)
1. **效能與負載測試**
2. **安全性測試**
3. **使用者接受度測試**

## ⚠️ 重要注意事項

### 測試最佳實務
- **獨立性**: 每個測試案例須獨立執行
- **重複性**: 測試結果須一致且可重複
- **隔離性**: 使用 pytest fixtures 共享測試資料
- **Mock策略**: 外部 API 呼叫必須 Mock

### 資料處理注意事項
```python
# 測試資料管理
test_data_rules:
  - 使用假資料，避免真實 API keys 洩漏
  - 測試完成後清理暫存檔案
  - 敏感資料使用環境變數
  - Mock 回應須符合真實 API 格式
```

### 效能測試重點
```yaml
performance_focus:
  - 60 秒總時間限制是硬性要求
  - 記憶體使用量監控
  - API 呼叫次數限制
  - 並行處理效率測試
```

---
**最後更新**: Session 02  
**狀態**: 詳細測試策略完成，準備實作測試案例