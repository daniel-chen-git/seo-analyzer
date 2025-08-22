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

#### 虛擬環境管理
- 專案根目錄有 `.venv` 虛擬環境資料夾
- 執行 Python 前必須啟用虛擬環境：`source .venv/bin/activate`
- 或直接使用虛擬環境 Python 路徑：`./.venv/bin/python`
- 使用 `uv run python` 命令自動啟用虛擬環境

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

最後更新：2024-01-20
