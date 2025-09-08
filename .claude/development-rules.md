# SEO Analyzer 專案開發規範
*Claude Code 開發協助的最高指導原則*

## 📋 專案基本資訊

**專案類型**: SEO 分析工具 (全端應用程式)
**技術棧**: React 19 + TypeScript + FastAPI + Python 3.13
**開發模式**: 功能導向架構 + 測試驅動開發
**專案狀態**: 活躍開發中，已完成 MVP 核心功能

---

## 🎯 核心開發原則

### 1. **功能優先，品質並重**
- 先實現核心功能，再追求完美類型
- 每個功能都必須有對應測試
- 漸進式開發與重構策略

### 2. **型別安全至上**
- TypeScript strict mode 100%
- Python 完整型別提示
- 避免 any 類型，使用明確的介面定義

### 3. **錯誤處理完善**
- 實作雙欄位錯誤回應 (status + success)
- 前端錯誤邊界完整覆蓋
- 後端統一例外處理機制

---

## 📝 Git 提交規範

### Commit 訊息格式
```
<type>: <description in Chinese>

<optional body>
<optional footer>
```

### Type 分類 (基於專案實際模式)
- `feat:` - 新功能開發
- `fix:` - Bug 修復 (專案中最頻繁，需特別注意)
- `refactor:` - 代碼重構
- `docs:` - 文檔更新
- `test:` - 測試相關
- `build:` - 建置或部署相關

### 範例
```bash
feat: 新增 WebSocket 即時進度追蹤功能
fix: 修復 cache 檔案寫入權限問題和 ErrorResponse 語法錯誤
refactor: 重新命名整合測試檔案並更新文檔
```

---

## 💻 編碼風格規範

### Frontend TypeScript
```typescript
// ✅ 良好實踐
interface AnalyzeRequest {
  keyword: string;          // 明確型別註解
  audience: string;         // 駝峰命名
  options: AnalysisOptions; // 提取複雜型別
}

// Hook 設計模式
const useAnalysis = (): [AnalysisState, AnalysisActions] => {
  const [state, setState] = useState<AnalysisState>(initialState);
  
  const actions = useMemo(() => ({
    start: (data) => { /* 實作 */ },
    cancel: () => { /* 實作 */ },
    reset: () => { /* 實作 */ }
  }), []);
  
  return [state, actions] as const;
};

// ❌ 避免
const data: any = {...}; // 避免 any 類型
function BadComponent(props) {} // 缺少型別定義
```

### Backend Python
```python
# ✅ 良好實踐
from pydantic import BaseModel
from typing import Optional

class AnalysisRequest(BaseModel):
    keyword: str
    audience: str
    options: Optional[AnalysisOptions] = None

async def analyze_keyword(request: AnalysisRequest) -> AnalysisResponse:
    """執行 SEO 關鍵字分析"""
    try:
        # 業務邏輯實作
        result = await analysis_service.process(request)
        return AnalysisResponse(
            status="success",
            success=True,
            data=result
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=400,
            detail={"status": "error", "success": False, "error_message": str(e)}
        )

# ❌ 避免
def analyze(data): # 缺少型別提示
    return {"status": "ok"} # 不符合 API 規格
```

---

## 📁 檔案組織規範

### 前端架構 (功能導向)
```
src/
├── features/              # 功能模組 (優先使用)
│   ├── analysis/          # 分析功能
│   ├── progress/          # 進度追蹤
│   └── results/           # 結果展示
├── shared/                # 共享資源
│   ├── components/ui/     # 基礎 UI 元件
│   ├── hooks/            # 通用 hooks
│   └── services/api/     # API 客戶端
└── types/                # 全域型別定義
```

### 後端架構 (DDD 分層)
```
app/
├── features/             # 業務領域 (Domain Layer)
│   ├── analysis/         # 分析領域
│   ├── scraping/         # 爬蟲領域
│   └── ai_processing/    # AI 處理領域
├── shared/              # 共享業務邏輯
├── infrastructure/      # 基礎設施層
└── core/               # 核心系統配置
```

### 命名規範
- **前端**: `PascalCase.tsx` (元件), `camelCase.ts` (工具)
- **後端**: `snake_case.py`
- **測試**: `*.test.tsx` 或 `test_*.py`

---

## 🧪 測試要求

### 測試覆蓋率目標
- **整體覆蓋率**: ≥ 85%
- **關鍵業務邏輯**: 100%
- **API 端點**: 100%

### 測試結構
```
tests/
├── unit/              # 單元測試
│   ├── features/      # 按功能組織
│   └── shared/        # 共享部分
├── integration/       # 整合測試
└── e2e/              # 端到端測試
```

### 測試撰寫範例
```typescript
// Frontend 測試
describe('useAnalysis Hook', () => {
  it('should handle analysis lifecycle correctly', async () => {
    const { result } = renderHook(() => useAnalysis());
    const [state, actions] = result.current;
    
    expect(state.status).toBe('idle');
    
    await act(() => actions.start(mockRequest));
    expect(state.status).toBe('analyzing');
  });
});
```

```python
# Backend 測試
@pytest.mark.asyncio
async def test_analyze_endpoint_success():
    request_data = {
        "keyword": "測試關鍵字",
        "audience": "測試受眾",
        "options": {"generate_draft": True}
    }
    
    response = await client.post("/api/analyze", json=request_data)
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["success"] is True
```

---

## 🔧 API 設計規範

### 雙欄位回應格式 (專案特色)
```typescript
// 成功回應
interface SuccessResponse {
  status: "success";           // API 契約欄位
  success: true;               // 業務狀態欄位
  analysis_report: string;     // 扁平化結構
  token_usage: number;
  processing_time: number;
  cached_at: string;
  keyword: string;
}

// 錯誤回應
interface ErrorResponse {
  status: "error";             // API 契約欄位
  success: false;              // 業務狀態欄位 (保持一致性)
  error_message: string;       // 繁體中文描述
  error_code?: string;         // 程式化處理
}
```

### 錯誤代碼標準
- `INVALID_INPUT` - 輸入驗證失敗
- `SERP_API_ERROR` - SerpAPI 服務異常
- `SCRAPER_TIMEOUT` - 網頁爬取逾時
- `AI_API_ERROR` - Azure OpenAI 服務異常

---

## 📱 響應式設計規範

### 斷點定義
```css
/* 專案使用 Tailwind CSS 斷點 */
@media (max-width: 767px)   /* Mobile */
@media (768px - 1023px)     /* Tablet */
@media (min-width: 1024px)  /* Desktop */
```

### 佈局原則
```css
/* ✅ 推薦: Mobile First 漸進式佈局 */
.layout {
  @apply flex flex-col gap-4;        /* Mobile 基礎 */
  
  @media (min-width: 768px) {
    @apply flex-row gap-6;           /* Tablet 適配 */
  }
  
  @media (min-width: 1024px) {
    @apply gap-8 max-w-7xl mx-auto;  /* Desktop 優化 */
  }
}
```

### 常見問題預防 (基於 Commit 歷史)
- ❌ 避免固定寬度，使用 flex/grid
- ✅ 測試 320px 極窄螢幕
- ✅ 按鈕最小 44px 觸控區域
- ✅ 避免 Sidebar 重疊問題

---

## ♿ 無障礙性 (a11y) 要求

### 基本要求
```jsx
// ✅ 語義化 HTML
<main>
  <section aria-labelledby="form-title">
    <h2 id="form-title">SEO 分析表單</h2>
    <form>
      <label htmlFor="keyword">關鍵字</label>
      <input 
        id="keyword" 
        type="text"
        aria-describedby="keyword-error"
      />
      <div id="keyword-error" role="alert">
        {errorMessage}
      </div>
    </form>
  </section>
</main>
```

### ARIA 標籤使用
- 進度指示器: `role="progressbar" aria-valuenow={progress}`
- 動態內容: `aria-live="polite"`
- 錯誤訊息: `role="alert"`

---

## 🔒 安全規範

### API 安全
```python
# 環境變數管理
from core.config import get_settings

settings = get_settings()
serp_api_key = settings.SERP_API_KEY  # 不直接硬編碼

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # 不使用 ["*"]
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### 前端安全
```typescript
// 敏感資訊處理
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // 使用環境變數
// ❌ 避免: const API_KEY = "hardcoded-key";

// XSS 防護
const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input);
};
```

---

## 📊 效能要求

### 前端效能目標
- **FCP (First Contentful Paint)**: < 1.5s
- **LCP (Largest Contentful Paint)**: < 2.5s
- **CLS (Cumulative Layout Shift)**: < 0.1
- **FID (First Input Delay)**: < 100ms

### 後端效能目標
- **API 回應時間**: < 2s (基於專案 README)
- **SEO 分析完整流程**: < 60s
- **並發處理**: 100 req/min
- **錯誤率**: < 1%

### 效能優化策略
```typescript
// 前端: 程式碼分割
const AnalysisPage = lazy(() => import('./features/analysis/AnalysisPage'));

// 前端: 記憶化
const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => 
    expensiveCalculation(data), [data]
  );
  return <div>{processedData}</div>;
});
```

```python
# 後端: 快取策略
from functools import lru_cache

@lru_cache(maxsize=100)
async def get_serp_data(keyword: str) -> dict:
    """快取 SERP 查詢結果"""
    return await serp_service.search(keyword)
```

---

## 🚨 常見問題預防 (基於 Commit 分析)

### 高風險修改區域
1. **環境配置**: 特別注意權限和路徑
2. **響應式佈局**: 多裝置測試必要
3. **API 整合**: 確保前後端格式一致
4. **TypeScript 配置**: 避免複雜泛型約束

### 已知問題模式
```typescript
// ❌ 常見錯誤: TypeScript verbatimModuleSyntax 問題
import type { Component } from 'react'; // ✅ 正確的 type import

// ❌ 常見錯誤: ESLint 配置衝突
// ✅ 解決方案: 使用專案既定的 eslint.config.js

// ❌ 常見錯誤: Sidebar 佈局重疊
// ✅ 解決方案: 使用 CSS Grid 替代 absolute positioning
```

---

## 🛠️ 開發工具配置

### VSCode 必要擴展
```json
{
  "recommendations": [
    "ms-python.python",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-playwright.playwright"
  ]
}
```

### 開發前檢查清單
```bash
# 環境檢查
node --version    # >= 18
python --version  # >= 3.13
uv --version      # 套件管理器

# 依賴安裝
cd frontend && npm install
cd backend && uv sync

# 配置檢查
cp config.ini.example config.ini
# 設定 SERP_API_KEY 和 AZURE_OPENAI_KEY
```

---

## 📋 代碼提交前檢查清單

### 必要檢查
- [ ] **型別檢查**: `npm run type-check` / `mypy app/`
- [ ] **Linting**: `npm run lint` / `ruff check`
- [ ] **測試通過**: `npm test` / `pytest`
- [ ] **建置成功**: `npm run build`
- [ ] **敏感資訊清除**: 檢查 API keys

### 功能檢查
- [ ] **API 格式**: 符合雙欄位回應規範
- [ ] **錯誤處理**: 完整的錯誤邊界
- [ ] **響應式**: 測試 320px-1920px
- [ ] **無障礙性**: 鍵盤導航和 ARIA

### 品質檢查
- [ ] **註解完整**: 複雜邏輯有中文註解
- [ ] **型別安全**: 無 any 類型使用
- [ ] **效能考量**: 避免不必要的重渲染
- [ ] **安全考量**: 輸入驗證和 XSS 防護

---

## 🎯 專案特殊指引

### 1. WebSocket 整合 (規劃中)
```typescript
// 設計模式: 降級機制
const useProgressWithFallback = (jobId: string) => {
  const [wsConnected, setWsConnected] = useState(false);
  
  // WebSocket 失敗時自動切換 Polling
  useEffect(() => {
    if (!wsConnected) {
      const interval = setInterval(() => {
        fetchProgressUpdate(jobId);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [wsConnected, jobId]);
};
```

### 2. 三階段進度追蹤 (核心功能)
```typescript
// 標準進度狀態管理
interface ProgressState {
  currentStage: 1 | 2 | 3;  // SERP → Crawler → AI
  overallProgress: number;   // 0-100
  stageProgress: number;     // 當前階段 0-100
  status: 'idle' | 'running' | 'completed' | 'error';
}
```

### 3. Azure OpenAI 整合 (已實作)
```python
# 標準 AI 服務調用
async def analyze_with_gpt4o(
    serp_data: dict,
    keyword: str,
    audience: str
) -> str:
    """使用 GPT-4o 進行 SEO 分析"""
    client = AzureOpenAI(
        api_key=settings.AZURE_OPENAI_API_KEY,
        api_version="2024-02-01",
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT
    )
    # 實作詳見 backend/app/services/ai_service.py
```

---

## 📚 學習資源與參考

### 專案文檔 (必讀)
- `docs/specs/product_spec.md` - 產品規格
- `docs/specs/api_spec.md` - API 規格  
- `frontend/docs/phase-2-development-plan.md` - 前端開發計劃

### 關鍵 Commit 學習
- `fix: 修復 TypeScript 和 ESLint 錯誤` - TypeScript 配置經驗
- `feat: 實現雙欄佈局系統` - 響應式設計實踐
- `refactor: 重新命名整合測試檔案` - 測試架構改善

---

**此開發規範為 Claude Code 協助開發的最高指導原則，所有代碼變更都應遵循這些標準。當遇到衝突時，以此文檔為準，並及時更新專案實際情況。**

---
*最後更新: 2025-09-05*
*版本: v2.0*
*基於專案 Commit 歷史和實際開發經驗制定*