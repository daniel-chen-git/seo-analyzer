# SEO Analyzer - 開發指令

## 專案基本資訊

- **專案名稱**：SEO Analyzer MVP
- **目標**：60 秒內生成 SEO 分析報告
- **技術棧**：FastAPI (後端) + React (前端)
- **外部服務**：SerpAPI + Azure OpenAI (GPT-4o)

## 開發規範

### 0. Claude Code Session 管理

#### 上下文監控
- **每次執行完工具都要印出剩餘上下文空間比例**
- 當上下文使用量接近 90% 時主動提醒
- 在重要節點（如完成功能模組）檢查上下文狀況

#### 任務執行規範
- **每完成一個 Todo 任務都必須詢問使用者是否繼續**
- 不可連續執行多個任務，需要使用者確認
- 完成單一任務後立即停止並等待指令
- **每完成一個 Todo 任務有修改到檔案時，都要 push 到 GitHub**
- **在使用者確認完成當前任務後，立即執行 git commit 和 push 操作**
- **每次 push 前都要檢查 git status 和 git diff 確認變更內容**

#### 虛擬環境管理
- 專案根目錄有 `.venv` 虛擬環境資料夾
- 執行 Python 前必須啟用虛擬環境：`source .venv/bin/activate`
- 或直接使用虛擬環境 Python 路徑：`./.venv/bin/python`
- 使用 `uv run python` 命令自動啟用虛擬環境

#### NPM 套件管理
- **務必使用本地安裝**：所有 npm 套件安裝都必須使用 `npm install package-name`
- **禁止全域安裝**：不可使用 `npm install -g`，避免污染全域環境
- **僅限專案範圍**：所有依賴都安裝在專案的 `node_modules` 目錄中
- **開發依賴分離**：使用 `npm install --save-dev` 安裝開發工具

#### 程式碼格式規範
- **換行後不要使用四個空白鍵**：換行保持乾淨，避免不必要的縮排
- 使用 IDE 自動格式化功能（如 Black、Prettier）
- 移除所有尾隨空白（trailing whitespace）

#### Session 交接準備
- 上下文達到 85% 時開始準備交接
- 更新對應的 context 文件
- 記錄未完成任務清單

### 1. 程式碼風格

#### Python (後端)

- **遵循 PEP 8**：

  - 縮排：4 個空格
  - 行長：最多 79 字元
  - 命名：snake_case (函數/變數)、UPPER_CASE (常數)、CamelCase (類別)

- **遵循 PEP 257 Docstring**：

  ```python
  def function_name(param1: str, param2: int) -> dict:
      """簡短描述功能。

      詳細說明功能的行為、參數、回傳值等。
      包含 What (做什麼)、Why (為什麼)、How (如何使用)。

      Args:
          param1: 參數一的說明
          param2: 參數二的說明

      Returns:
          回傳值的詳細說明

      Raises:
          ValueError: 何時會發生此錯誤

      Example:
          >>> result = function_name("test", 123)
          >>> print(result)
          {"status": "success"}
      """
      pass
  ```

#### TypeScript/JavaScript (前端)

- ESLint + Prettier 自動格式化
- 縮排：2 個空格
- 使用單引號
- 介面和型別定義清楚

### 2. 註解規範

- **所有註解使用繁體中文**
- 複雜邏輯必須加註解
- Context7 查詢點要標註：`# 使用 context7 查詢：文檔名稱`

### 3. Git Commit 規範

```
<type>: <subject>

<body>
```

類型：

- `feat`: 新功能
- `fix`: 修復 bug
- `test`: 測試相關
- `docs`: 文檔更新
- `refactor`: 重構
- `style`: 格式調整
- `chore`: 雜項

範例：

```
feat: 新增 SerpAPI 服務整合

- 實作 get_serp_data() 函數
- 加入重試機制
- 新增錯誤處理
```

### 4. Context 管理策略

#### 文件分工

- **context.md**：專案儀表板（整體進度、API 契約、跨團隊資訊）
- **backend_context.md**：後端記憶（API、資料庫、服務實作細節）
- **frontend_context.md**：前端記憶（UI、元件、樣式、狀態管理）
- **qa_context.md**：QA 記憶（測試案例、bug 追蹤、覆蓋率）

#### 更新時機

- 完成一個功能模組
- Session 結束前
- 重大決策或變更
- Claude 上下文接近上限時

#### 格式範例

```markdown
## 當前狀態

- 階段: [開發階段]
- 進度: [百分比]

## 已完成項目

- [x] 項目一
- [x] 項目二

## 進行中

- [ ] 當前任務

## 待處理

- [ ] 未來任務

## 技術決策

- 決策一：原因說明

## 重要程式碼片段
```

### 5. 開發流程

#### TDD 開發循環

1. **思考階段**

   - 分析需求
   - 設計方案
   - 預見潛在問題

2. **規劃階段**

   - 更新對應的 context.md
   - 定義介面/API
   - 設計測試案例

3. **實作階段**

   - 先寫測試（TDD）
   - 實作功能
   - 重構優化

4. **驗證階段**
   - 執行測試
   - Code review（自我檢查）
   - Git commit

### 6. 測試規範

#### 測試框架

- **後端**：pytest + pytest-asyncio
- **前端**：Jest + React Testing Library
- **E2E**：Playwright

#### 覆蓋率目標

- 單元測試：80%
- 整合測試：60%
- E2E 測試：核心流程 100%

#### 測試檔案命名

- 單元測試：`test_*.py` 或 `*.test.ts`
- 整合測試：`test_integration_*.py`
- E2E 測試：`*.e2e.test.ts`

### 7. 非同步處理

#### Python (Backend)

```python
import asyncio
import httpx

async def fetch_data(url: str) -> dict:
    """非同步擷取資料。"""
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

# 並行處理多個請求
async def fetch_multiple(urls: list) -> list:
    """並行擷取多個 URL。"""
    tasks = [fetch_data(url) for url in urls]
    return await asyncio.gather(*tasks)
```

#### TypeScript (Frontend)

```typescript
// 使用 async/await
const fetchAnalysis = async (keyword: string) => {
  try {
    const response = await api.post("/analyze", { keyword });
    return response.data;
  } catch (error) {
    console.error("分析失敗：", error);
    throw error;
  }
};
```

### 8. 錯誤處理

#### 統一錯誤格式

```json
{
  "status": "error",
  "error_code": "SPECIFIC_ERROR_CODE",
  "message": "使用者友善的錯誤訊息",
  "details": {}
}
```

#### 錯誤碼定義

- `SERP_API_ERROR`: SerpAPI 呼叫失敗
- `SCRAPER_TIMEOUT`: 爬蟲逾時
- `AI_API_ERROR`: GPT-4o 呼叫失敗
- `INVALID_INPUT`: 輸入驗證失敗
- `RATE_LIMIT`: 超過使用限制

### 9. 環境變數管理

必要環境變數：

```env
# API Keys
SERP_API_KEY=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_DEPLOYMENT_NAME=

# Server Config
PORT=8000
HOST=0.0.0.0
DEBUG=True
```

### 10. 效能要求

- API 回應時間：< 60 秒
- 並行爬取：10 個 URL
- 爬蟲成功率：≥ 80%
- Token 使用：< 8000/次

### 11. 安全考量

- 環境變數不進版控
- API Key 加密儲存
- 輸入驗證與消毒
- Rate limiting（生產環境）
- CORS 正確設定

### 12. 文檔要求

每個模組都要有：

- README.md 說明用途
- 函數都要有 Docstring
- 複雜邏輯要有註解
- API 要有 OpenAPI 文檔

## 快速參考

### 常用指令

```bash
# 後端
cd backend
uv venv                           # 建立虛擬環境
source .venv/bin/activate         # 啟動虛擬環境 (Linux/Mac)
uv pip install -r requirements.txt  # 安裝套件（超快速）
uv pip sync requirements.txt      # 同步套件（移除多餘套件）
uvicorn app.main:app --reload
pytest

# 前端
cd frontend
npm install
npm start
npm test
npm run build

# QA
cd qa
pytest unit_tests/
pytest integration_tests/
npm run test:e2e
```

### 檔案位置

- 產品規格：`docs/specs/product_spec.md`
- API 規格：`docs/specs/api_spec.md`
- 測試資料：`qa/test_data/`
- 環境設定：`backend/.env`

## Session 管理提醒

當 Claude Code CLI 上下文接近上限時：

1. 總結當前進度到對應的 context 文件
2. 記錄未完成事項
3. 儲存重要程式碼片段
4. 開始新 session 時先載入 context

---

## 實作規範補充 (Session 06)

### 程式碼實作流程
1. **實作前規劃**: 
   - 先閱讀相關規格文件 (API、產品規格)
   - 確認技術依賴和配置要求
   - 規劃資料結構和核心方法
   - 制定測試策略

2. **實作過程**:
   - 建立基礎架構 (類別、資料結構、配置)
   - 實作核心功能 (主要業務邏輯)
   - 加入錯誤處理和重試機制
   - 完整測試驗證

3. **實作後檢查**:
   - 使用 Pylance 檢查型別錯誤
   - 移除未使用的 import
   - 修正型別註解問題
   - 確保程式碼符合 PEP 8

### 常見型別錯誤修正
- `List[str] = None` → `List[str]` + `__post_init__` 初始化
- BeautifulSoup 元素檢查: 使用 `hasattr()` 確認方法存在
- 例外處理: 分別處理不同類型的例外，避免 tuple 例外

### AI 服務實作注意事項
- Azure OpenAI 配置: 使用 `openai` 套件 1.101.0 版本
- Prompt 工程: 結合 SERP 資料和爬蟲內容
- Token 管理: 控制輸入長度 < 8000 tokens
- 錯誤處理: 區分 AI API 錯誤和系統錯誤

---

## Session 08 新增規範 

### 自定義 Swagger UI 實作經驗
1. **模板引擎整合**:
   - 使用 Jinja2 模板引擎處理動態內容
   - 建立 `app/templates/` 目錄存放 HTML 模板
   - 建立 `app/static/` 目錄存放靜態資源（CSS、圖片）

2. **FastAPI 自定義文檔配置**:
   - 關閉預設的 `docs_url` 和 `redoc_url`
   - 使用 `StaticFiles` 掛載靜態資源
   - 建立自定義路由 `/docs` 返回品牌化 HTML
   - 實作 ReDoc 重定向到自定義文檔

3. **品牌化設計元素**:
   - 使用漸變色彩方案：`#667eea` 到 `#764ba2`
   - 響應式設計支援行動裝置
   - 互動式程式碼範例（複製按鈕功能）
   - 效能指標和使用教學整合

4. **檔案結構**:
   ```
   app/
   ├── templates/
   │   ├── swagger_ui.html        # 主要模板
   │   └── api_examples.html      # 範例區塊（備份）
   ├── static/
   │   ├── css/
   │   │   └── custom-swagger.css # 自定義樣式
   │   └── favicon.svg            # 品牌圖示
   ```

---

## Session 12 Frontend 開發經驗與教訓

### TypeScript 嚴格模式開發注意事項

#### 1. 編譯器配置衝突
**問題**: `erasableSyntaxOnly` 與某些語法結構衝突
```typescript
// ❌ 錯誤: TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled
export enum ErrorType {
  JAVASCRIPT_ERROR = 'javascript_error'
}
```

**解決方案**: 
- 使用常數物件替代 enum
- 或調整 TypeScript 配置設定
```typescript
// ✅ 正確
export const ErrorType = {
  JAVASCRIPT_ERROR: 'javascript_error'
} as const
```

#### 2. Node.js 型別定義問題
**問題**: 缺少 `@types/node` 導致 `NodeJS.Timeout` 無法識別
```typescript
// ❌ 錯誤: Cannot find namespace 'NodeJS'
private timer?: NodeJS.Timeout
```

**解決方案**:
- 安裝 `@types/node`: `npm install --save-dev @types/node`
- 或使用瀏覽器相容的替代方案
```typescript
// ✅ 正確 (瀏覽器相容)
private timer?: ReturnType<typeof setTimeout>
```

#### 3. API 命名衝突
**問題**: 自定義類別與瀏覽器原生 API 命名衝突
```typescript
// ❌ 錯誤: 與原生 PerformanceObserver 衝突
class PerformanceObserver {
  observe() {} // Property 'observe' does not exist
}
```

**解決方案**: 使用不同的命名避免衝突
```typescript
// ✅ 正確
class CustomPerformanceMonitor {
  recordMetric() {}
}
```

#### 4. 非同步函數型別定義
**問題**: TypeScript 嚴格模式要求明確的 Promise 型別
```typescript
// ❌ 錯誤: return type must be Promise<T>
private async flush(): void {}
```

**解決方案**: 明確指定 `Promise<void>`
```typescript
// ✅ 正確
private async flush(): Promise<void> {}
```

#### 5. 環境變數型別安全
**問題**: 環境變數可能為 `null`，但函數期望字串
```typescript
// ❌ 錯誤: Type 'null' not assignable to 'string'
const value = import.meta.env[key] || defaultValue || ''
```

**解決方案**: 使用安全的型別檢查
```typescript
// ✅ 正確
const getEnvVar = (key: string, defaultValue = ''): string => {
  const value = import.meta.env[key]
  return (value ?? defaultValue) as string
}
```

### 開發工具實作策略

#### 1. 漸進式開發原則
- **先建立簡化版本**，確保核心功能運作
- **避免過早優化**，複雜功能應該逐步實作
- **保持編譯成功**，不要一次實作過多功能

#### 2. 關注點分離
```typescript
// ❌ 錯誤: 在工具檔案中直接使用 React
import React from 'react'
export function usePerformanceTracking() {
  const [state, setState] = React.useState()
}

// ✅ 正確: 分離工具邏輯和 React 邏輯
export class PerformanceTracker {
  recordMetric() {} // 純邏輯，不依賴 React
}
// React Hook 在元件中另外實作
```

#### 3. 環境分離策略
```typescript
// ✅ 開發工具只在開發環境載入
if (isDevelopment()) {
  // 載入開發工具
  const devTools = new DevToolsManager()
  devTools.init()
  
  // 暴露到全域 (僅開發環境)
  ;(window as any).devTools = devTools
}
```

#### 4. 錯誤處理最佳實踐
```typescript
// ✅ 全域錯誤處理
window.addEventListener('error', (event) => {
  if (isDevelopment()) {
    console.error('JavaScript Error:', event.message)
  }
})

window.addEventListener('unhandledrejection', (event) => {
  if (isDevelopment()) {
    console.error('Unhandled Promise:', event.reason)
  }
})
```

### 建置優化經驗

#### 1. 依賴管理
- **移除未使用的 imports** 避免編譯錯誤
- **分離開發和生產依賴** 避免生產包含開發工具
- **使用動態 imports** 對於大型開發工具

#### 2. 型別檢查策略
```typescript
// ✅ 使用型別守衛
function isError(value: unknown): value is Error {
  return value instanceof Error
}

// ✅ 安全的型別轉換
const safeParseJSON = (str: string): unknown => {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}
```

### 學到的教訓總結

1. **複雜功能分階段實作**: 避免一次性實作過多功能導致編譯錯誤
2. **型別安全優先**: 寧可功能簡單也要確保型別正確
3. **命名規範**: 避免與原生 API 或第三方庫的命名衝突
4. **環境分離**: 開發工具不應影響生產建置
5. **錯誤隔離**: 開發工具的錯誤不應影響主應用運行
6. **依賴最小化**: 工具類盡量避免複雜的外部依賴

這些經驗有助於後續 Phase 2 UI 元件開發時避免類似問題。

---

最後更新：2025-01-24 (Session 12 - Phase 1.5 完成)
