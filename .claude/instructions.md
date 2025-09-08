# SEO Analyzer - 開發指令

## 🚨 Claude Code 自動載入指令

**重要指示**：每次 Claude Code CLI session 開始時，請自動執行以下操作：

1. **立即讀取核心規範文檔**：
   ```
   請使用 Read 工具讀取以下三個文件：
   - /Users/danielchen/test/seo-analyzer/.claude/development-rules.md
   - /Users/danielchen/test/seo-analyzer/.claude/development-checklist.md  
   - /Users/danielchen/test/seo-analyzer/.claude/architecture-guide.md
   ```

2. **確認規範載入**：
   - 讀取完成後回覆："✅ 已載入 SEO Analyzer 專案開發規範"
   - 簡述當前專案狀態和主要開發原則

3. **遵循最高指導原則**：
   - 所有開發工作必須遵循 `development-rules.md` 的規範
   - 使用 `development-checklist.md` 進行任務檢查
   - 參考 `architecture-guide.md` 進行技術決策

**執行優先級**：此自動載入指令的優先級最高，必須在任何其他操作之前執行。即使使用者沒有明確要求，也必須主動載入這些規範文檔。

## 🔍 規範載入狀態檢查

**檢查指令**：使用者可以隨時使用以下指令驗證規範載入狀態：

- `規範狀態` 或 `check rules` - 顯示載入狀態和規範摘要
- `專案規範` 或 `project rules` - 列出主要開發原則
- `架構狀態` 或 `architecture status` - 顯示當前架構理解

**標準回應格式**：
```
✅ 規範載入狀態檢查

📋 已載入文檔：
- development-rules.md ✅ (最高指導原則)
- development-checklist.md ✅ (開發檢查清單)  
- architecture-guide.md ✅ (系統架構指南)

🎯 主要開發原則：
- Git Commit: feat:/fix: 格式，繁體中文描述
- API 設計: 雙欄位回應 (status + success)
- 架構模式: 功能導向 (features/) + DDD 分層
- 技術棧: React 19 + TypeScript + FastAPI + Python 3.13

⚡ 當前專案狀態: [根據實際情況描述]
```

---

## 專案基本資訊

- **專案名稱**：SEO Analyzer MVP
- **目標**：60 秒內生成 SEO 分析報告
- **技術棧**：FastAPI (後端) + React (前端)
- **外部服務**：SerpAPI + Azure OpenAI (GPT-4o)
- **開發規範文檔**：詳見 `.claude/development-rules.md` (最高指導原則)
- **檢查清單**：詳見 `.claude/development-checklist.md` (實用指南)
- **架構指南**：詳見 `.claude/architecture-guide.md` (系統架構設計)

## 📋 核心開發指導文檔

**重要提醒**：以下文檔為專案開發的核心指導原則，所有開發工作都應遵循這些規範：

1. **development-rules.md** - 最高指導原則
   - Git 提交規範、編碼風格、錯誤處理模式
   - API 設計規範、響應式設計、安全要求
   - 基於 Commit 歷史分析的經驗教訓

2. **development-checklist.md** - 實用開發檢查清單  
   - 開發任務啟動檢查、功能開發流程
   - 測試要求、代碼品質檢查、效能最佳化
   - 每次開發任務的標準流程指南

3. **architecture-guide.md** - 系統架構設計指南
   - 功能導向重構方案、DDD 分層架構
   - WebSocket 整合、監控系統、部署策略  
   - 未來發展規劃與技術決策記錄

**使用原則**：當遇到開發決策或技術問題時，請優先參考上述文檔。如有衝突，以 `development-rules.md` 為最高準則。

---

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
- **每完成一個開發步驟（Step）都必須立即 push 到 GitHub**
- **每完成一個 Todo 任務有修改到檔案時，都要 push 到 GitHub**
- **在使用者確認完成當前任務後，立即執行 git commit 和 push 操作**
- **每次 push 前都要檢查 git status 和 git diff 確認變更內容**
- **commit 訊息格式**: `feat: 完成 Phase X.X Step Y - [功能名稱]`
- **所有品質檢查（TypeScript/ESLint/Build）都必須通過才可 push**

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

## Phase 2.1 Frontend 表單開發經驗與錯誤分析

### 重大錯誤分析與解決方案

#### 1. TypeScript 嚴格模式與表單庫整合問題

**問題描述**: Phase 2.1 開發過程中遇到多個 TypeScript 編譯錯誤

**具體錯誤案例**:
```typescript
// ❌ 錯誤: verbatimModuleSyntax 模式下的導入問題
import { FieldValidationState } from '../../types/form';

// ❌ 錯誤: useRef 缺少初始值
const timeoutRef = useRef<NodeJS.Timeout>();

// ❌ 錯誤: 泛型約束過於嚴格
export function useDebounce<T extends (...args: any[]) => any>

// ❌ 錯誤: Zod Schema 類型訪問問題
const fieldSchema = (schema as any).shape[fieldName];
```

**根本原因分析**:
1. **配置衝突**: TypeScript 嚴格模式與第三方庫類型定義不完全相容
2. **類型系統過度複雜**: 過早追求完美的類型安全導致實作困難
3. **第三方庫整合**: React Hook Form + Zod + 自定義驗證的複雜類型交互

**解決策略**:
```typescript
// ✅ 正確: 使用 type-only 導入
import type { FieldValidationState } from '../../types/form';

// ✅ 正確: 提供 useRef 初始值
const timeoutRef = useRef<number | undefined>(undefined);

// ✅ 正確: 簡化泛型約束
export function useDebounce<T extends (...args: never[]) => unknown>

// ✅ 正確: 安全的類型轉換
const schemaWithShape = schema as unknown as { shape: Record<string, z.ZodSchema> };
```

#### 2. React Hook Form 整合複雜度問題

**問題描述**: useFormValidation Hook 過度複雜，導致類型錯誤和維護困難

**錯誤表現**:
- 防抖函數類型匹配失敗
- Zod 錯誤構造函數使用不當
- 複雜的驗證邏輯導致代碼難以理解

**解決方案 - 簡化原則**:
```typescript
// ✅ 採用簡化的驗證邏輯，避免複雜的泛型操作
const validateFieldImmediate = useCallback((fieldName: string, value: unknown) => {
  let errors: string[] = [];
  
  // 直接的條件判斷，避免複雜的 schema 操作
  if (fieldName === 'keyword' && typeof value === 'string') {
    if (value.length === 0) errors.push('關鍵字不可為空');
    else if (value.length > 50) errors.push('關鍵字長度不可超過 50 字元');
  }
  // ... 其他驗證邏輯
}, []);
```

#### 3. ESLint 與代碼品質問題

**問題統計**: 25 個 lint 錯誤，主要類型：
- `@typescript-eslint/no-explicit-any`: 12 個錯誤
- `@typescript-eslint/no-unused-vars`: 8 個錯誤  
- `react-hooks/rules-of-hooks`: 3 個錯誤
- 其他類型錯誤: 2 個

**根本原因**: 為了繞過複雜的類型問題，大量使用 `any` 類型

### 預防措施與最佳實踐

#### 1. 開發流程改進

**階段式開發策略**:
```markdown
1. **基礎架構階段**
   - 先建立最簡單的組件結構
   - 使用基本的 TypeScript 類型
   - 確保編譯通過

2. **功能實現階段** 
   - 逐個添加功能
   - 每次只處理一個複雜的類型問題
   - 保持編譯成功狀態

3. **類型完善階段**
   - 最後階段才處理複雜的類型安全
   - 使用漸進式類型強化
```

#### 2. TypeScript 開發規範

**類型安全級別**:
```typescript
// Level 1: 基礎類型 (優先確保功能)
interface BasicProps {
  value: string;
  onChange: (value: string) => void;
}

// Level 2: 中等類型 (添加約束)  
interface IntermediateProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  validator?: (value: T) => boolean;
}

// Level 3: 高級類型 (最後階段完善)
interface AdvancedProps<T extends Record<string, unknown>> {
  schema: z.ZodSchema<T>;
  onValidation: <K extends keyof T>(field: K, value: T[K]) => void;
}
```

#### 3. 第三方庫整合原則

**分層整合策略**:
```typescript
// ✅ 正確: 創建適配層隔離複雜性
interface SimpleValidationResult {
  isValid: boolean;
  errors: string[];
}

// 內部簡單接口
export const useSimpleValidation = (rules: ValidationRules): SimpleValidationResult => {
  // 簡化的驗證邏輯，避免複雜的第三方庫類型
};

// 複雜的第三方庫邏輯隱藏在實現中
const useZodValidation = (schema: z.ZodSchema) => {
  // 複雜的 Zod 整合邏輯
  // 向上暴露簡單接口
};
```

#### 4. 錯誤處理與調試策略

**編譯時錯誤處理**:
```typescript
// ✅ 使用類型斷言的安全模式
const safeTypeAssertion = <T>(value: unknown, validator: (v: unknown) => v is T): T | null => {
  return validator(value) ? value : null;
};

// ✅ 錯誤邊界與降級處理
const withFallback = <T, F>(fn: () => T, fallback: F): T | F => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};
```

#### 5. 代碼檢查自動化

**預提交檢查**:
```json
{
  "scripts": {
    "pre-commit": "npm run type-check && npm run lint:fix && npm run test",
    "type-check": "tsc --noEmit",
    "lint:fix": "eslint . --fix",
    "build:check": "npm run build"
  }
}
```

### 關鍵教訓總結

1. **複雜性管理**: 不要一次性實現過於複雝的類型系統
2. **功能優先**: 先確保功能正確，再完善類型安全  
3. **逐步優化**: 採用漸進式的代碼品質提升策略
4. **適配層模式**: 使用簡單接口隔離第三方庫的複雜性
5. **自動化檢查**: 建立完整的代碼質量檢查流程

**避免重複錯誤的核心原則**:
- **簡單優於完美**: 寧可代碼簡單也要確保可維護性
- **分階段開發**: 避免在單一階段處理過多複雜問題  
- **類型漸進**: 從基礎類型開始，逐步增強類型安全
- **適配隔離**: 使用適配器模式隔離第三方庫的複雜性

---

## Session 15 ESLint 錯誤修復經驗與規範

### ESLint 錯誤分析與修復流程 (2025-08-25)

#### 錯誤統計與分類

**Session 15 前錯誤狀況**：14 個 ESLint 錯誤
- **React Hooks 規則錯誤**：1 個
  - `DevPanel.tsx:20:3` - React Hook "useEffect" 條件調用
- **TypeScript 類型錯誤**：9 個 `@typescript-eslint/no-explicit-any`
  - API 相關：2 個 (`types/api/index.ts`, `utils/api/test.ts`)
  - UI 相關：4 個 (`DevPanel.tsx`, `hooks/ui/index.ts`)
  - 工具檔案：3 個 (`devTools.ts`, `helpers/index.ts`)
- **代碼品質問題**：4 個
  - `no-unused-vars`：未使用變量
  - `prefer-const`：應使用 const 而非 let
  - `exhaustive-deps`：不必要的 Hook 依賴

#### 分階段修復策略

**階段 1：API 相關錯誤修復** ⏱️ 5分鐘
```bash
# 使用 grep 定位錯誤
grep -n "any" /path/to/types/api/index.ts
grep -n "any" /path/to/utils/api/test.ts

# 修復方案
Record<string, any> → Record<string, unknown>
(window as any) → (window as unknown as Record<string, unknown>)
```

**階段 2：核心功能錯誤修復** ⏱️ 8分鐘
```bash
# React Hook 規則修復
# 將條件邏輯移入 useEffect 內部，保持 Hook 調用順序一致
useEffect(() => {
  if (!isDevelopment()) {
    return
  }
  // Hook 邏輯
}, [])

# 類型安全修復
any → 'config' | 'errors' | 'system' | 'tools'  // 具體聯合類型
(...args: any[]) => any → (...args: unknown[]) => unknown
```

**階段 3：工具層錯誤修復** ⏱️ 5分鐘
```bash
# 工具類型修復
(window as any) → (window as Record<string, unknown>)
<T extends (...args: any[]) => any> → <T extends (...args: unknown[]) => unknown>
```

#### 實用 Grep 命令集合

```bash
# 快速定位特定錯誤類型
grep -n "any" src/**/*.ts                    # 找出所有 any 使用
grep -n "error.*=" src/**/*.ts               # 找出未使用的 error 變量
grep -n -A3 -B3 "useEffect" src/**/*.tsx     # 檢查 useEffect 使用

# 批量檢查錯誤分佈
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "any"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "error.*="

# 驗證修復結果
npm run lint                                 # 運行完整檢查
npm run lint -- --fix                       # 自動修復可修復問題
```

#### 避免錯誤的預防措施

**1. 開發期間實時檢查**
```json
// .vscode/settings.json
{
  "eslint.autoFixOnSave": true,
  "typescript.preferences.strictNullChecks": true,
  "eslint.workingDirectories": ["frontend"]
}
```

**2. Git Pre-commit Hook**
```bash
#!/bin/sh
# .git/hooks/pre-commit
cd frontend && npm run lint
if [ $? -ne 0 ]; then
  echo "❌ ESLint 檢查失敗，請修復錯誤後再提交"
  exit 1
fi
```

**3. 類型安全開發規範**
```typescript
// ✅ 推薦：使用 unknown 而非 any
function processData(data: unknown): void {
  if (typeof data === 'string') {
    // 類型收窄後安全使用
  }
}

// ✅ 推薦：明確的聯合類型
type TabType = 'config' | 'errors' | 'system' | 'tools'
const setActiveTab = (tab: TabType) => { /* ... */ }

// ✅ 推薦：安全的類型轉換
const safeWindowAccess = (window as unknown as Record<string, unknown>)
```

#### 自動化修復工具配置

**ESLint 自動修復規則**：
```json
// .eslintrc.js
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "prefer-const": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  },
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "rules": {
        "@typescript-eslint/no-explicit-any": ["error", {
          "fixToUnknown": true  // 自動建議 unknown 替換
        }]
      }
    }
  ]
}
```

#### 錯誤修復檢查清單

**修復前檢查**：
- [ ] 備份當前代碼狀態
- [ ] 運行 `npm run lint` 獲得完整錯誤列表  
- [ ] 按錯誤類型和檔案分組規劃修復順序

**修復過程檢查**：
- [ ] 每修復一類錯誤就運行 `npm run lint` 驗證
- [ ] 確保 TypeScript 編譯通過：`npx tsc --noEmit`
- [ ] 檢查功能不受影響：運行核心測試

**修復後檢查**：
- [ ] ESLint 零錯誤零警告
- [ ] TypeScript 編譯成功
- [ ] 核心功能測試通過
- [ ] Git commit 並推送變更

### 質量保證流程

**日常開發**：
1. 編碼時開啟 ESLint 實時檢查
2. 保存時自動修復簡單問題
3. 提交前運行完整檢查

**代碼審查**：
1. PR 必須通過所有 Lint 檢查
2. 重點檢查類型安全改進
3. 確認沒有引入新的 `any` 使用

**定期維護**：
1. 每週審查 ESLint 規則配置
2. 更新最佳實踐文檔
3. 分享錯誤修復經驗

### 成功指標

**Session 15 成果**：
- ✅ **14 → 0 錯誤**：完全消除所有 ESLint 錯誤
- ✅ **類型安全提升**：移除所有 `any` 使用，改用 `unknown` 或具體類型
- ✅ **React 規範遵循**：修復 Hooks 規則違反
- ✅ **代碼整潔度**：清理未使用變量和不必要依賴

**時間效率**：總修復時間 18 分鐘，平均每個錯誤 1.3 分鐘

---

最後更新：2025-08-25 (Session 15 - ESLint 錯誤修復完成)
