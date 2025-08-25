# Phase 2: 核心 UI 元件開發規劃

**專案**: SEO Analyzer Frontend  
**階段**: Phase 2 - 核心 UI 元件開發  
**預估時間**: 7-9.5 小時  
**文檔版本**: v1.0  
**建立日期**: 2025-01-24

---

## 🎯 總體目標

基於已完成的 Phase 1 基礎架構，開發三個核心 UI 元件，實現完整的 SEO 分析工作流程。建立現代化、響應式、高效能的用戶界面。

---

## 📋 核心元件架構設計

### 🔥 Phase 2.1: InputForm 元件 (預估 2-3 小時)
**元件功能**:
- 關鍵字輸入欄 (1-50 字元驗證)
- 受眾描述文字區域 (1-200 字元驗證)  
- 分析選項 Checkboxes (generate_draft, include_faq, include_table)
- 即時驗證與錯誤提示
- 提交按鈕與載入狀態

**技術架構**:
```
src/components/form/
├── InputForm.tsx           # 主表單元件
├── KeywordInput.tsx        # 關鍵字輸入
├── AudienceTextArea.tsx    # 受眾描述
├── AnalysisOptions.tsx     # 分析選項
└── SubmitButton.tsx        # 提交按鈕
```

### 🔄 Phase 2.2: ProgressIndicator 元件 (預估 2-2.5 小時)
**元件功能**:
- 三階段進度顯示 (SERP 分析 → 網頁爬蟲 → AI 內容生成)
- 動態進度條與百分比顯示
- 各階段時間追蹤與預估剩餘時間
- 階段狀態指示 (等待/進行中/完成/錯誤)
- 可取消操作功能

**技術架構**:
```
src/components/progress/
├── ProgressIndicator.tsx   # 主進度元件
├── ProgressBar.tsx         # 進度條
├── StageIndicator.tsx      # 階段指示器
├── TimeEstimator.tsx       # 時間估算
└── CancelButton.tsx        # 取消按鈕
```

### 📄 Phase 2.3: MarkdownViewer 元件 (預估 1.5-2 小時)  
**元件功能**:
- React-markdown 渲染 SEO 分析報告
- 語法高亮和程式碼區塊支援
- 目錄導航與錨點跳轉
- 複製內容與匯出功能 (PDF/Word)
- 全螢幕閱讀模式

**技術架構**:
```
src/components/results/
├── MarkdownViewer.tsx      # 主檢視元件
├── TableOfContents.tsx     # 目錄導航
├── ExportButtons.tsx       # 匯出功能
├── CopyButton.tsx          # 複製按鈕
└── FullscreenMode.tsx      # 全螢幕模式
```

### 📡 Phase 2.4: 自定義 Hooks (預估 1.5-2 小時)
**Hook 功能**:
- useAnalysis: 管理分析 API 呼叫生命週期
- useProgress: 三階段進度狀態管理
- useFormValidation: 即時表單驗證

**技術架構**:
```
src/hooks/
├── useAnalysis.ts          # 分析 API 管理
├── useProgress.ts          # 進度狀態管理
├── useFormValidation.ts    # 表單驗證
└── useDebounce.ts          # 防抖處理
```

---

# Phase 2.1: InputForm 元件詳細設計

## 🎯 核心目標
開發一個完整的 SEO 分析表單元件，實現用戶輸入、驗證、提交的完整流程，與 Backend API 100% 相容。

## 🏗️ 元件架構設計

### 主要元件層次結構
```
src/components/form/
├── InputForm.tsx           # 🎯 主表單容器元件
├── KeywordInput.tsx        # 🔤 關鍵字輸入欄位
├── AudienceTextArea.tsx    # 📝 受眾描述文字區域  
├── AnalysisOptions.tsx     # ⚙️ 分析選項群組
├── SubmitButton.tsx        # 🚀 提交按鈕
└── FormValidation.tsx      # ✅ 驗證回饋元件
```

### 支援檔案
```
src/hooks/form/
├── useFormValidation.ts    # 表單驗證邏輯
├── useFormSubmission.ts    # 提交處理邏輯
└── useDebounce.ts          # 防抖處理

src/types/form/
├── inputForm.ts           # 表單型別定義
└── validation.ts          # 驗證規則型別

src/utils/form/
├── validation.ts          # 驗證工具函數
└── formatters.ts          # 格式化工具
```

## 📝 元件功能詳細規格

### 🔤 KeywordInput 元件
**功能需求**:
- 單行文字輸入欄位
- 1-50 字元長度限制
- 即時字元計數顯示
- 禁止特殊字元 (可自定義規則)
- 自動去除頭尾空白

**視覺設計**:
```
┌─────────────────────────────────────────────────┐
│ 🔍 請輸入要分析的關鍵字                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ SEO 優化技巧                    │     15/50 │ │
│ └─────────────────────────────────────────────┘ │
│ ✅ 關鍵字格式正確                                │
└─────────────────────────────────────────────────┘
```

**狀態管理**:
- 輸入值 (value)
- 驗證狀態 (valid/invalid/pending)
- 錯誤訊息 (errorMessage)
- 字元計數 (characterCount)

### 📝 AudienceTextArea 元件  
**功能需求**:
- 多行文字輸入區域
- 1-200 字元長度限制
- 自動高度調整 (最小 3 行，最大 8 行)
- 即時字元計數和進度條
- 支援常見標點符號

**視覺設計**:
```
┌─────────────────────────────────────────────────┐
│ 👥 描述您的目標受眾                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ 想要學習 SEO 優化的中小企業主和行銷人員，    │ │
│ │ 希望透過有效的關鍵字策略提升網站排名...      │ │
│ │                                           │ │
│ └─────────────────────────────────────────────┘ │
│ ████████████████░░░░ 128/200 字元                │
│ 💡 提示：詳細描述有助於產生更精準的內容            │
└─────────────────────────────────────────────────┘
```

**狀態管理**:
- 輸入值 (value)
- 字元計數 (characterCount)  
- 高度狀態 (autoHeight)
- 驗證狀態 (validationState)

### ⚙️ AnalysisOptions 元件
**功能需求**:
- 三個 checkbox 選項
- generate_draft: 產生內容草稿
- include_faq: 包含常見問答
- include_table: 包含資料表格
- 全選/取消全選功能
- 選項說明 tooltip

**視覺設計**:
```
┌─────────────────────────────────────────────────┐
│ ⚙️ 分析選項                    ☑️ 全選            │
│                                                │
│ ☑️ 產生內容草稿 (generate_draft)        ℹ️      │
│    根據分析結果自動產生 SEO 優化內容草稿         │
│                                                │
│ ☐ 包含常見問答 (include_faq)           ℹ️      │
│    加入相關的 FAQ 區塊提升內容豐富度            │
│                                                │
│ ☑️ 包含資料表格 (include_table)         ℹ️      │
│    產生結構化的數據表格和比較圖表               │
└─────────────────────────────────────────────────┘
```

**狀態管理**:
- 選項狀態 (optionsState)
- 全選狀態 (selectAllState)
- tooltip 顯示 (tooltipVisible)

### 🚀 SubmitButton 元件
**功能需求**:
- 根據表單驗證狀態啟用/禁用
- 載入狀態動畫
- 成功/錯誤狀態反饋
- 預估分析時間顯示
- 快速重置功能

**視覺設計**:
```
┌─────────────────────────────────────────────────┐
│                                                │
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │   🔄 分析中...   │  │   重置表單      │      │  
│  │   預估 45-60 秒  │  └─────────────────┘      │
│  └─────────────────┘                           │
│                                                │
│  💡 分析將依序進行：SERP → 爬蟲 → AI 生成        │
└─────────────────────────────────────────────────┘
```

**狀態管理**:
- 提交狀態 (idle/loading/success/error)
- 表單有效性 (formValid)
- 載入進度 (loadingProgress)

## 🔧 技術實作規格

### 表單管理策略
**React Hook Form + Zod**:
```typescript
// 表單 Schema 設計
const analyzeFormSchema = z.object({
  keyword: z.string()
    .min(1, '關鍵字不可為空')
    .max(50, '關鍵字長度不可超過 50 字元')
    .regex(/^[a-zA-Z0-9\s\u4e00-\u9fff]+$/, '含有不允許的特殊字元'),
    
  audience: z.string()
    .min(1, '受眾描述不可為空')
    .max(200, '受眾描述長度不可超過 200 字元'),
    
  options: z.object({
    generate_draft: z.boolean(),
    include_faq: z.boolean(),
    include_table: z.boolean()
  })
});

type AnalyzeFormData = z.infer<typeof analyzeFormSchema>;
```

### 驗證策略設計
**即時驗證時機**:
- onBlur: 欄位失焦時觸發完整驗證
- onChange: 輸入時觸發格式檢查 (debounced 300ms)
- onSubmit: 提交前最終驗證

**錯誤處理層級**:
1. **欄位層級**: 個別欄位的格式和長度錯誤
2. **表單層級**: 整體表單完整性檢查
3. **伺服器層級**: Backend API 回應錯誤處理

### 響應式設計斷點
**Mobile (320px-767px)**:
- 單欄佈局，垂直排列
- 觸控友善的輸入區域 (最小 44px 高度)
- 簡化的選項顯示

**Tablet (768px-1023px)**:
- 混合佈局，部分元件併排
- 適中的間距和字體大小

**Desktop (1024px+)**:
- 最佳化佈局，充分利用水平空間
- Hover 效果和進階互動

## 🎨 UX/UI 設計細節

### 視覺層次設計
**色彩語義**:
- 成功狀態: `text-success` (#10B981)
- 錯誤狀態: `text-error` (#EF4444)  
- 警告狀態: `text-warning` (#F59E0B)
- 中性狀態: `text-gray-600`

**動畫效果**:
- 錯誤訊息: `fade-in` 0.2s ease-out
- 載入狀態: `pulse` 1s infinite
- 按鈕互動: `transform scale(0.98)` on active
- 表單切換: `slide-up` 0.3s ease-in-out

### 互動反饋設計
**Focus 管理**:
- Tab 鍵導航順序合理
- Focus ring 清晰可見 (`focus:ring-2 focus:ring-primary`)
- 錯誤時自動聚焦到問題欄位

**載入狀態**:
- Skeleton loading 預覽內容
- 進度指示器顯示提交進度
- 防止重複提交的 disabled 狀態

## 🔗 Backend 整合準備

### API 資料格式
**Request 格式** (POST /analyze-async):
```typescript
{
  keyword: string;        // 1-50 字元
  audience: string;       // 1-200 字元  
  options: {
    generate_draft: boolean;
    include_faq: boolean;
    include_table: boolean;
  }
}
```

**Response 格式**:
```typescript
// 成功回應
{
  status: 'success';
  job_id: string;
  estimated_time: number; // 秒
}

// 錯誤回應  
{
  status: 'error';
  error: {
    code: string;
    message: string;
    details: Record<string, any>;
  }
}
```

---

# Phase 2.2: ProgressIndicator 元件詳細設計

## 🎯 核心目標
開發一個視覺化的進度追蹤元件，實現三階段 SEO 分析流程的即時監控，提供優秀的用戶等待體驗。

## 🏗️ 元件架構設計

### 主要元件層次結構
```
src/components/progress/
├── ProgressIndicator.tsx   # 🎯 主進度容器元件
├── ProgressBar.tsx         # 📊 整體進度條
├── StageIndicator.tsx      # 🔄 階段指示器
├── TimeEstimator.tsx       # ⏱️ 時間估算顯示
├── CancelButton.tsx        # ❌ 取消按鈕
└── StageDetails.tsx        # 📋 階段詳情展示
```

### 支援檔案
```
src/hooks/progress/
├── useProgressTracking.ts  # 進度追蹤邏輯
├── useTimeEstimation.ts    # 時間估算算法
└── useStageManagement.ts   # 階段狀態管理

src/types/progress/
├── progressTypes.ts        # 進度型別定義
└── stageTypes.ts          # 階段狀態型別

src/utils/progress/
├── calculations.ts         # 進度計算工具
└── timeFormatters.ts      # 時間格式化
```

## 📝 三階段進度流程設計

### 🔍 Stage 1: SERP 分析階段 (預估 15-20 秒)
**功能說明**:
- 搜尋引擎結果頁面分析
- 競爭對手排名調查
- 關鍵字難度評估

**視覺設計**:
```
┌─────────────────────────────────────────────────┐
│ 🔍 階段 1: SERP 分析中...              █████░░░░ │
│                                                │
│ • 正在搜尋關鍵字排名                    ✓ 完成   │
│ • 分析競爭對手頁面                      🔄 進行中 │
│ • 評估關鍵字難度                        ⏳ 等待   │
│                                                │
│ ⏱️ 已耗時: 12 秒 | 預估剩餘: 8 秒                │
└─────────────────────────────────────────────────┘
```

**狀態追蹤**:
- 子任務完成度 (搜尋/分析/評估)
- 階段進度百分比 (0-100%)
- 實際耗時與預估時間對比

### 🕷️ Stage 2: 網頁爬蟲階段 (預估 20-25 秒)
**功能說明**:
- 目標網頁內容爬取
- 結構化資料提取
- 競爭對手內容分析

**視覺設計**:
```
┌─────────────────────────────────────────────────┐
│ 🕷️ 階段 2: 網頁爬蟲中...              ████████░░ │
│                                                │
│ • 爬取目標網頁內容                      ✓ 完成   │
│ • 提取結構化資料                        ✓ 完成   │
│ • 分析競爭對手內容                      🔄 進行中 │
│                                                │
│ 📊 已爬取: 15 個網頁 | 總進度: 65%               │
└─────────────────────────────────────────────────┘
```

**狀態追蹤**:
- 爬取網頁數量統計
- 資料提取完成度
- 網路請求成功率

### 🤖 Stage 3: AI 內容生成階段 (預估 15-20 秒)
**功能說明**:
- AI 模型分析處理
- SEO 優化內容生成
- 報告格式化輸出

**視覺設計**:
```
┌─────────────────────────────────────────────────┐
│ 🤖 階段 3: AI 內容生成中...           ██████████ │
│                                                │
│ • AI 模型分析                           ✓ 完成   │
│ • 生成 SEO 優化內容                     🔄 進行中 │
│ • 格式化報告輸出                        ⏳ 等待   │
│                                                │
│ 🎯 內容生成進度: 78% | 預估完成: 6 秒              │
└─────────────────────────────────────────────────┘
```

**狀態追蹤**:
- AI 處理進度百分比
- 內容生成狀態
- 報告組裝完成度

## 🔧 技術實作規格

### 進度狀態管理
**Progress State Schema**:
```typescript
interface ProgressState {
  currentStage: 1 | 2 | 3;
  overallProgress: number;        // 0-100
  stageProgress: number;          // 當前階段 0-100
  status: 'idle' | 'running' | 'completed' | 'error' | 'cancelled';
  
  stages: {
    serp: StageStatus;
    crawler: StageStatus;
    ai: StageStatus;
  };
  
  timing: {
    startTime: Date;
    currentStageStartTime: Date;
    estimatedTotalTime: number;    // 秒
    estimatedRemainingTime: number;
  };
  
  jobId: string;
  canCancel: boolean;
}

interface StageStatus {
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;               // 0-100
  startTime?: Date;
  completedTime?: Date;
  subtasks: SubtaskStatus[];
  errorMessage?: string;
}

interface SubtaskStatus {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
}
```

### 時間估算算法
**動態時間調整**:
```typescript
class TimeEstimator {
  private baseEstimates = {
    serp: 18,      // 15-20 秒基準
    crawler: 22,   // 20-25 秒基準
    ai: 17         // 15-20 秒基準
  };
  
  // 根據實際執行時間動態調整預估
  updateEstimate(stage: string, actualTime: number, progress: number) {
    const efficiency = progress / actualTime;
    const remainingWork = 1 - progress;
    const estimatedRemaining = remainingWork / efficiency;
    
    return Math.max(5, Math.min(60, estimatedRemaining));
  }
  
  // 總體完成時間預測
  getTotalEstimate(currentProgress: ProgressState): number {
    // 考慮當前階段效率和歷史數據
    // 實施指數平滑法預測剩餘時間
  }
}
```

### WebSocket 整合策略
**即時進度更新**:
```typescript
interface ProgressWebSocketMessage {
  type: 'progress_update' | 'stage_change' | 'error' | 'completed';
  job_id: string;
  data: {
    current_stage: number;
    overall_progress: number;
    stage_progress: number;
    subtask_updates?: SubtaskUpdate[];
    estimated_remaining: number;
    error_message?: string;
  };
  timestamp: string;
}

// Fallback Polling 策略
const useProgressWithFallback = (jobId: string) => {
  const [wsConnected, setWsConnected] = useState(false);
  
  // WebSocket 連接失敗時自動切換到 Polling
  useEffect(() => {
    if (!wsConnected) {
      const pollInterval = setInterval(() => {
        fetchProgressUpdate(jobId);
      }, 2000); // 2 秒輪詢
      
      return () => clearInterval(pollInterval);
    }
  }, [wsConnected, jobId]);
};
```

## 🎨 視覺設計與動畫

### 進度條動畫設計
**Smooth Progress Animation**:
```css
.progress-bar {
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(90deg, 
    #1a73e8 0%, 
    #4285f4 50%, 
    #1a73e8 100%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.stage-indicator {
  transition: all 0.3s ease-in-out;
}

.stage-indicator.active {
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(26, 115, 232, 0.4);
}
```

### 階段狀態視覺化
**Icon 與色彩系統**:
- **等待狀態**: `⏳` 灰色 (#9CA3AF)
- **進行中**: `🔄` 藍色動畫 (#1A73E8)
- **已完成**: `✅` 綠色 (#10B981)
- **錯誤狀態**: `❌` 紅色 (#EF4444)

## 🚫 取消操作設計

### 取消按鈕功能
**用戶確認流程**:
```
用戶點擊取消 → 確認對話框 → API 取消請求 → 清理狀態
```

**取消確認對話框**:
```
┌─────────────────────────────────────────────────┐
│ ⚠️ 確認取消分析？                                │
│                                                │
│ 分析已進行 35 秒，目前完成度 67%                 │
│ 取消後將無法恢復當前進度。                       │
│                                                │
│  ┌─────────────┐  ┌─────────────────────────┐   │
│  │   繼續分析   │  │  確認取消 (無法復原)    │   │
│  └─────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 取消後清理邏輯
**狀態重置流程**:
1. 發送 API 取消請求 (DELETE /analyze/{job_id})
2. 關閉 WebSocket 連接
3. 清除進度狀態和計時器
4. 重置表單到初始狀態
5. 顯示取消成功訊息

## 🧪 測試策略

### 進度追蹤測試
**模擬測試場景**:
- ✅ 正常三階段完整流程
- ✅ 各階段時間估算準確性
- ✅ WebSocket 連接中斷恢復
- ✅ 網路異常時的 Polling 切換
- ✅ 取消操作完整流程

### 效能測試
**響應性能目標**:
- 進度更新延遲 < 200ms
- 動畫流暢度 60fps
- 記憶體使用穩定 (無洩漏)

---

# Phase 2.3: MarkdownViewer 元件詳細設計

## 🎯 核心目標
開發一個功能豐富的 Markdown 檢視器元件，完美渲染 SEO 分析報告，提供優秀的閱讀體驗和實用的輔助功能。

## 🏗️ 元件架構設計

### 主要元件層次結構
```
src/components/results/
├── MarkdownViewer.tsx      # 🎯 主檢視容器元件
├── TableOfContents.tsx     # 📖 目錄導航
├── MarkdownContent.tsx     # 📄 內容渲染區域
├── ExportButtons.tsx       # 💾 匯出功能群組
├── CopyButton.tsx          # 📋 複製按鈕
├── FullscreenMode.tsx      # 🖥️ 全螢幕模式
├── SearchHighlight.tsx     # 🔍 搜尋與高亮
└── PrintLayout.tsx         # 🖨️ 列印佈局
```

### 支援檔案
```
src/hooks/markdown/
├── useMarkdownParser.ts    # Markdown 解析
├── useTableOfContents.ts   # 目錄生成
├── useExportFunctions.ts   # 匯出功能
└── useFullscreenMode.ts    # 全螢幕管理

src/types/markdown/
├── markdownTypes.ts        # Markdown 型別
└── exportTypes.ts         # 匯出格式型別

src/utils/markdown/
├── parser.ts              # 解析工具
├── exporters.ts           # 匯出工具
└── formatters.ts          # 格式化工具
```

## 📝 核心功能設計

### 📄 Markdown 渲染引擎
**React-Markdown 配置**:
```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkToc from 'remark-toc';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';

const MarkdownRenderer = ({ content }: { content: string }) => {
  const components = {
    // 自定義標題渲染
    h1: ({ children, id }) => (
      <h1 id={id} className="text-3xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-primary">
        {children}
      </h1>
    ),
    
    // 自定義程式碼區塊
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    
    // 自定義表格樣式
    table: ({ children }) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
          {children}
        </table>
      </div>
    ),
    
    // 自定義引用區塊
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary bg-blue-50 p-4 my-6 italic">
        {children}
      </blockquote>
    )
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkToc]}
      rehypePlugins={[rehypeHighlight, rehypeSlug]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
};
```

### 📖 目錄導航功能
**TOC 自動生成**:
```typescript
interface TocItem {
  id: string;
  title: string;
  level: number;        // 1-6 (h1-h6)
  children?: TocItem[];
}

const useTableOfContents = (markdownContent: string) => {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  
  // 解析標題生成目錄結構
  useEffect(() => {
    const headings = parseHeadingsFromMarkdown(markdownContent);
    const tocTree = buildTocTree(headings);
    setTocItems(tocTree);
  }, [markdownContent]);
  
  // 滾動監聽更新活動項目
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { threshold: 0.5, rootMargin: '-20% 0px -35% 0px' }
    );
    
    // 觀察所有標題元素
    tocItems.forEach(item => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });
    
    return () => observer.disconnect();
  }, [tocItems]);
  
  return { tocItems, activeId };
};
```

**TOC 視覺設計**:
```
┌─────────────────────────────────────────────────┐
│ 📖 目錄                                  [折疊] │
│                                                │
│ 1. SEO 分析總結              ← 當前位置          │
│    1.1 關鍵字概況                               │
│    1.2 競爭程度分析                             │
│ 2. SERP 分析結果                                │
│    2.1 排名前 10 分析                           │
│    2.2 特色摘要分析                             │
│ 3. 內容建議                                     │
│    3.1 標題優化建議                             │
│    3.2 內容結構建議                             │
│ 4. 技術 SEO 建議                                │
│                                                │
│ 🔍 [搜尋目錄...]                                │
└─────────────────────────────────────────────────┘
```

### 💾 匯出功能設計
**多格式匯出支援**:

**1. PDF 匯出**:
```typescript
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const exportToPDF = async (content: HTMLElement, filename: string) => {
  const canvas = await html2canvas(content, {
    scale: 2,
    useCORS: true,
    allowTaint: true
  });
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
  pdf.save(`${filename}.pdf`);
};
```

**2. Word 文檔匯出**:
```typescript
import { Document, Packer, Paragraph, TextRun } from 'docx';

const exportToWord = (markdownContent: string, filename: string) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: convertMarkdownToDocxElements(markdownContent)
    }]
  });
  
  Packer.toBlob(doc).then(blob => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  });
};
```

**3. Markdown 原始檔**:
```typescript
const exportToMarkdown = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.md`;
  link.click();
  URL.revokeObjectURL(url);
};
```

**匯出按鈕群組設計**:
```
┌─────────────────────────────────────────────────┐
│ 💾 匯出報告                                      │
│                                                │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐ │
│ │ 📄 PDF   │ │ 📝 Word  │ │ 📋 MD    │ │ 🔗  │ │
│ └──────────┘ └──────────┘ └──────────┘ │Share│ │
│                                       └─────┘ │
│                                                │
│ 📊 報告統計: 15 頁 | 3,247 字 | 生成時間: 1分35秒  │
└─────────────────────────────────────────────────┘
```

### 🖥️ 全螢幕閱讀模式
**功能特色**:
- 隱藏導航和側邊欄
- 優化的閱讀字體和行高
- 護眼模式 (深色/淺色主題)
- 閱讀進度指示器
- 鍵盤快捷鍵支援

**全螢幕模式視覺**:
```
┌─────────────────────────────────────────────────┐
│ ✕ 退出全螢幕    🌙 深色模式    📖 目錄    ⚙️ 設定   │
├─────────────────────────────────────────────────┤
│                                                │
│    # SEO 分析報告 - 「SEO 優化技巧」            │
│                                                │
│    ## 執行摘要                                  │
│                                                │
│    本報告針對關鍵字「SEO 優化技巧」進行...       │
│                                                │
│    ██████████████████████████░░░░░░░░░░ 75%     │
│                                                │
└─────────────────────────────────────────────────┘
```

### 🔍 內容搜尋與高亮
**搜尋功能設計**:
```typescript
const useContentSearch = (content: string) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  
  const searchInContent = useCallback(
    debounce((term: string) => {
      if (!term.trim()) {
        setSearchResults([]);
        return;
      }
      
      const results = findTextMatches(content, term);
      setSearchResults(results);
      setCurrentResultIndex(0);
      
      // 自動滾動到第一個結果
      if (results.length > 0) {
        scrollToSearchResult(results[0]);
      }
    }, 300),
    [content]
  );
  
  useEffect(() => {
    searchInContent(searchTerm);
  }, [searchTerm, searchInContent]);
  
  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    currentResultIndex,
    nextResult: () => setCurrentResultIndex(prev => 
      (prev + 1) % searchResults.length
    ),
    prevResult: () => setCurrentResultIndex(prev => 
      prev === 0 ? searchResults.length - 1 : prev - 1
    )
  };
};
```

**搜尋界面設計**:
```
┌─────────────────────────────────────────────────┐
│ 🔍 [搜尋內容...]        1/5 ⬆️ ⬇️ ✕            │
├─────────────────────────────────────────────────┤
│                                                │
│ 透過有效的 SEO 優化技巧 可以大幅提升...          │
│         ████████████                           │
│                                                │
└─────────────────────────────────────────────────┘
```

## 🎨 樣式與主題設計

### 閱讀體驗優化
**字體與排版**:
```css
.markdown-content {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.7;
  font-size: 16px;
  color: #1f2937;
  max-width: 65ch;
  margin: 0 auto;
}

.markdown-content h1, .markdown-content h2, 
.markdown-content h3, .markdown-content h4 {
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1rem;
  line-height: 1.3;
}

.markdown-content p {
  margin-bottom: 1.5rem;
}

.markdown-content pre {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  font-family: 'Fira Code', Consolas, monospace;
}
```

### 深色模式支援
**主題切換**:
```css
[data-theme="dark"] .markdown-content {
  background-color: #1a202c;
  color: #e2e8f0;
}

[data-theme="dark"] .markdown-content pre {
  background-color: #2d3748;
  border-color: #4a5568;
}

[data-theme="dark"] .markdown-content blockquote {
  background-color: #2c5282;
  border-left-color: #3182ce;
}
```

## 🧪 測試策略

### 渲染測試
**Markdown 解析測試**:
- ✅ 標準 Markdown 語法支援
- ✅ GitHub Flavored Markdown 擴展
- ✅ 表格渲染正確性
- ✅ 程式碼高亮功能
- ✅ 數學公式渲染 (如需要)

### 功能測試
**交互功能測試**:
- ✅ 目錄導航點擊跳轉
- ✅ 搜尋功能準確性
- ✅ 匯出功能完整性
- ✅ 全螢幕模式切換
- ✅ 主題切換功能

### 效能測試
**大型文檔處理**:
- ✅ 長文檔 (>10,000 字) 渲染效能
- ✅ 滾動流暢度測試
- ✅ 記憶體使用優化
- ✅ 搜尋響應速度

---

# Phase 2.4: 自定義 Hooks 詳細設計

## 🎯 核心目標
開發一套完整的自定義 Hooks，實現狀態管理、API 整合、表單處理等核心功能，為所有 UI 元件提供強大的邏輯支援。

## 🏗️ Hook 架構設計

### 主要 Hook 層次結構
```
src/hooks/
├── api/
│   ├── useAnalysis.ts          # 🔬 分析 API 管理
│   ├── useApiClient.ts         # 🌐 API 客戶端封裝
│   └── useErrorHandling.ts     # ❌ 錯誤處理
├── form/
│   ├── useFormValidation.ts    # ✅ 表單驗證
│   ├── useFormSubmission.ts    # 📤 表單提交
│   └── useDebounce.ts          # ⏱️ 防抖處理
├── progress/
│   ├── useProgress.ts          # 📊 進度追蹤
│   ├── useTimeEstimation.ts    # ⏰ 時間估算
│   └── useWebSocket.ts         # 🔌 WebSocket 管理
├── ui/
│   ├── useFullscreen.ts        # 🖥️ 全螢幕管理
│   ├── useTheme.ts             # 🎨 主題切換
│   └── useLocalStorage.ts      # 💾 本地儲存
└── utils/
    ├── useAsync.ts             # ⚡ 異步操作
    ├── useInterval.ts          # 🔄 定時器管理
    └── useEventListener.ts     # 👂 事件監聽
```

## 📡 API 管理 Hooks

### 🔬 useAnalysis Hook
**核心功能**:
- 管理 SEO 分析 API 呼叫完整生命週期
- 實現非同步任務狀態追蹤
- 提供重試機制和錯誤恢復
- 支援取消操作和資源清理

**Hook 設計**:
```typescript
interface AnalysisState {
  status: 'idle' | 'submitting' | 'analyzing' | 'completed' | 'error' | 'cancelled';
  jobId: string | null;
  result: AnalysisResult | null;
  error: ApiError | null;
  progress: ProgressState | null;
}

interface AnalysisActions {
  startAnalysis: (data: AnalyzeFormData) => Promise<void>;
  cancelAnalysis: () => Promise<void>;
  retryAnalysis: () => Promise<void>;
  clearResult: () => void;
}

const useAnalysis = (): [AnalysisState, AnalysisActions] => {
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    jobId: null,
    result: null,
    error: null,
    progress: null
  });
  
  const { apiClient } = useApiClient();
  const { connectWebSocket, disconnect } = useWebSocket();
  
  const startAnalysis = useCallback(async (data: AnalyzeFormData) => {
    try {
      setState(prev => ({ ...prev, status: 'submitting', error: null }));
      
      // 提交分析請求
      const response = await apiClient.post('/analyze-async', data);
      const { job_id, estimated_time } = response.data;
      
      setState(prev => ({ 
        ...prev, 
        status: 'analyzing', 
        jobId: job_id,
        progress: initializeProgress(estimated_time)
      }));
      
      // 建立 WebSocket 連接追蹤進度
      connectWebSocket(job_id, {
        onProgress: (progressData) => {
          setState(prev => ({ 
            ...prev, 
            progress: updateProgress(prev.progress, progressData)
          }));
        },
        onCompleted: (result) => {
          setState(prev => ({ 
            ...prev, 
            status: 'completed', 
            result: result 
          }));
          disconnect();
        },
        onError: (error) => {
          setState(prev => ({ 
            ...prev, 
            status: 'error', 
            error: error 
          }));
          disconnect();
        }
      });
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: normalizeApiError(error) 
      }));
    }
  }, [apiClient, connectWebSocket, disconnect]);
  
  const cancelAnalysis = useCallback(async () => {
    if (!state.jobId) return;
    
    try {
      await apiClient.delete(`/analyze/${state.jobId}`);
      setState(prev => ({ 
        ...prev, 
        status: 'cancelled',
        progress: null
      }));
      disconnect();
    } catch (error) {
      console.error('Cancel analysis failed:', error);
    }
  }, [state.jobId, apiClient, disconnect]);
  
  const retryAnalysis = useCallback(async () => {
    if (state.status === 'error' && state.error?.retryable) {
      // 重置狀態並重新開始（需要保存原始請求數據）
      setState(prev => ({ ...prev, status: 'idle', error: null }));
    }
  }, [state.status, state.error]);
  
  const clearResult = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      result: null, 
      status: 'idle',
      progress: null,
      error: null
    }));
  }, []);
  
  // 清理效果
  useEffect(() => {
    return () => {
      if (state.status === 'analyzing') {
        disconnect();
      }
    };
  }, [state.status, disconnect]);
  
  return [
    state,
    { startAnalysis, cancelAnalysis, retryAnalysis, clearResult }
  ];
};
```

### 🌐 useApiClient Hook
**核心功能**:
- 封裝 Axios 客戶端配置
- 統一請求/響應攔截器
- 自動錯誤處理和重試邏輯
- 請求取消和超時管理

**Hook 設計**:
```typescript
interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

const useApiClient = (config?: ApiClientConfig) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  
  const apiClient = useMemo(() => {
    const client = axios.create({
      baseURL: config?.baseURL || import.meta.env.VITE_API_BASE_URL,
      timeout: config?.timeout || 70000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // 請求攔截器
    client.interceptors.request.use(
      (config) => {
        setLoading(true);
        setError(null);
        return config;
      },
      (error) => {
        setLoading(false);
        return Promise.reject(error);
      }
    );
    
    // 響應攔截器
    client.interceptors.response.use(
      (response) => {
        setLoading(false);
        return response;
      },
      async (error) => {
        setLoading(false);
        
        // 自動重試邏輯
        if (shouldRetry(error) && error.config.retryCount < (config?.retryAttempts || 3)) {
          error.config.retryCount = (error.config.retryCount || 0) + 1;
          await delay(config?.retryDelay || 1000 * error.config.retryCount);
          return client.request(error.config);
        }
        
        const normalizedError = normalizeApiError(error);
        setError(normalizedError);
        return Promise.reject(normalizedError);
      }
    );
    
    return client;
  }, [config]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return { apiClient, loading, error, clearError };
};
```

## 📋 表單處理 Hooks

### ✅ useFormValidation Hook
**核心功能**:
- 實現即時表單驗證
- 支援 Zod Schema 驗證
- 提供防抖輸入處理
- 管理錯誤狀態和訊息

**Hook 設計**:
```typescript
interface ValidationState {
  errors: Record<string, string[]>;
  isValid: boolean;
  isPending: boolean;
  touchedFields: Set<string>;
}

const useFormValidation = <T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  options: {
    debounceMs?: number;
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
  } = {}
) => {
  const [validationState, setValidationState] = useState<ValidationState>({
    errors: {},
    isValid: false,
    isPending: false,
    touchedFields: new Set()
  });
  
  const debouncedValidate = useDebounce(
    useCallback((data: T, fieldName?: string) => {
      setValidationState(prev => ({ ...prev, isPending: true }));
      
      try {
        if (fieldName) {
          // 單一欄位驗證
          const fieldSchema = schema.shape[fieldName];
          fieldSchema.parse(data[fieldName]);
          
          setValidationState(prev => ({
            ...prev,
            errors: { ...prev.errors, [fieldName]: [] },
            isPending: false
          }));
        } else {
          // 完整表單驗證
          schema.parse(data);
          
          setValidationState(prev => ({
            ...prev,
            errors: {},
            isValid: true,
            isPending: false
          }));
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors = error.errors.reduce((acc, err) => {
            const field = err.path.join('.');
            if (!acc[field]) acc[field] = [];
            acc[field].push(err.message);
            return acc;
          }, {} as Record<string, string[]>);
          
          setValidationState(prev => ({
            ...prev,
            errors: fieldName ? { ...prev.errors, [fieldName]: errors[fieldName] || [] } : errors,
            isValid: false,
            isPending: false
          }));
        }
      }
    }, [schema]),
    options.debounceMs || 300
  );
  
  const validateField = useCallback((fieldName: string, value: any, formData: T) => {
    setValidationState(prev => ({
      ...prev,
      touchedFields: new Set([...prev.touchedFields, fieldName])
    }));
    
    if (options.validateOnChange !== false) {
      debouncedValidate({ ...formData, [fieldName]: value }, fieldName);
    }
  }, [debouncedValidate, options.validateOnChange]);
  
  const validateForm = useCallback((data: T) => {
    debouncedValidate(data);
  }, [debouncedValidate]);
  
  const clearErrors = useCallback((fieldName?: string) => {
    if (fieldName) {
      setValidationState(prev => ({
        ...prev,
        errors: { ...prev.errors, [fieldName]: [] }
      }));
    } else {
      setValidationState(prev => ({ ...prev, errors: {}, isValid: false }));
    }
  }, []);
  
  return {
    ...validationState,
    validateField,
    validateForm,
    clearErrors
  };
};
```

### 📤 useFormSubmission Hook
**核心功能**:
- 管理表單提交狀態
- 整合驗證與 API 呼叫
- 提供提交成功/失敗回調
- 防止重複提交

**Hook 設計**:
```typescript
interface SubmissionState {
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitError: string | null;
  submitCount: number;
}

const useFormSubmission = <T extends Record<string, any>>(
  submitHandler: (data: T) => Promise<any>,
  options: {
    onSuccess?: (result: any) => void;
    onError?: (error: any) => void;
    resetOnSuccess?: boolean;
    maxRetries?: number;
  } = {}
) => {
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    isSubmitting: false,
    isSubmitted: false,
    submitError: null,
    submitCount: 0
  });
  
  const submit = useCallback(async (data: T) => {
    if (submissionState.isSubmitting) return;
    
    setSubmissionState(prev => ({
      ...prev,
      isSubmitting: true,
      submitError: null,
      submitCount: prev.submitCount + 1
    }));
    
    try {
      const result = await submitHandler(data);
      
      setSubmissionState(prev => ({
        ...prev,
        isSubmitting: false,
        isSubmitted: true
      }));
      
      options.onSuccess?.(result);
      
      if (options.resetOnSuccess) {
        setTimeout(() => {
          setSubmissionState(prev => ({ ...prev, isSubmitted: false }));
        }, 2000);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '提交失敗';
      
      setSubmissionState(prev => ({
        ...prev,
        isSubmitting: false,
        submitError: errorMessage
      }));
      
      options.onError?.(error);
    }
  }, [submissionState.isSubmitting, submitHandler, options]);
  
  const retry = useCallback(() => {
    if (submissionState.submitCount < (options.maxRetries || 3)) {
      setSubmissionState(prev => ({ ...prev, submitError: null }));
      // retry logic here
    }
  }, [submissionState.submitCount, options.maxRetries]);
  
  const reset = useCallback(() => {
    setSubmissionState({
      isSubmitting: false,
      isSubmitted: false,
      submitError: null,
      submitCount: 0
    });
  }, []);
  
  return {
    ...submissionState,
    submit,
    retry,
    reset
  };
};
```

## 📊 進度追蹤 Hooks

### 📊 useProgress Hook
**核心功能**:
- 管理三階段進度狀態
- 整合時間估算功能
- 提供進度更新回調
- 支援進度暫停和恢復

**Hook 設計**:
```typescript
interface ProgressHookState extends ProgressState {
  estimatedTimeRemaining: number;
  efficiency: number;
  canPause: boolean;
  canCancel: boolean;
}

const useProgress = (initialEstimate?: number) => {
  const [progressState, setProgressState] = useState<ProgressHookState>({
    currentStage: 1,
    overallProgress: 0,
    stageProgress: 0,
    status: 'idle',
    stages: {
      serp: { status: 'pending', progress: 0, subtasks: [] },
      crawler: { status: 'pending', progress: 0, subtasks: [] },
      ai: { status: 'pending', progress: 0, subtasks: [] }
    },
    timing: {
      startTime: new Date(),
      currentStageStartTime: new Date(),
      estimatedTotalTime: initialEstimate || 60,
      estimatedRemainingTime: initialEstimate || 60
    },
    jobId: '',
    canCancel: true,
    estimatedTimeRemaining: initialEstimate || 60,
    efficiency: 1.0,
    canPause: false
  });
  
  const updateProgress = useCallback((update: ProgressUpdate) => {
    setProgressState(prev => {
      const newState = { ...prev };
      
      // 更新當前階段進度
      if (update.stage_progress !== undefined) {
        newState.stageProgress = update.stage_progress;
      }
      
      // 更新整體進度
      if (update.overall_progress !== undefined) {
        newState.overallProgress = update.overall_progress;
      }
      
      // 更新階段狀態
      if (update.current_stage !== prev.currentStage) {
        newState.currentStage = update.current_stage;
        newState.timing.currentStageStartTime = new Date();
        
        // 更新前一階段為完成
        const prevStageKey = getStageKey(prev.currentStage);
        if (prevStageKey) {
          newState.stages[prevStageKey].status = 'completed';
          newState.stages[prevStageKey].completedTime = new Date();
        }
        
        // 設置當前階段為進行中
        const currentStageKey = getStageKey(update.current_stage);
        if (currentStageKey) {
          newState.stages[currentStageKey].status = 'running';
          newState.stages[currentStageKey].startTime = new Date();
        }
      }
      
      // 更新時間估算
      const efficiency = calculateEfficiency(newState);
      const remainingTime = calculateRemainingTime(newState, efficiency);
      
      newState.efficiency = efficiency;
      newState.estimatedTimeRemaining = remainingTime;
      newState.timing.estimatedRemainingTime = remainingTime;
      
      return newState;
    });
  }, []);
  
  const startProgress = useCallback((jobId: string, estimate?: number) => {
    setProgressState(prev => ({
      ...prev,
      status: 'running',
      jobId,
      timing: {
        ...prev.timing,
        startTime: new Date(),
        estimatedTotalTime: estimate || prev.timing.estimatedTotalTime
      },
      stages: {
        serp: { ...prev.stages.serp, status: 'running', startTime: new Date() },
        crawler: { ...prev.stages.crawler, status: 'pending' },
        ai: { ...prev.stages.ai, status: 'pending' }
      }
    }));
  }, []);
  
  const completeProgress = useCallback((result?: any) => {
    setProgressState(prev => ({
      ...prev,
      status: 'completed',
      overallProgress: 100,
      stages: {
        serp: { ...prev.stages.serp, status: 'completed', progress: 100 },
        crawler: { ...prev.stages.crawler, status: 'completed', progress: 100 },
        ai: { ...prev.stages.ai, status: 'completed', progress: 100, completedTime: new Date() }
      }
    }));
  }, []);
  
  const errorProgress = useCallback((error: string) => {
    setProgressState(prev => {
      const currentStageKey = getStageKey(prev.currentStage);
      const newStages = { ...prev.stages };
      
      if (currentStageKey) {
        newStages[currentStageKey] = {
          ...newStages[currentStageKey],
          status: 'error',
          errorMessage: error
        };
      }
      
      return {
        ...prev,
        status: 'error',
        stages: newStages
      };
    });
  }, []);
  
  const cancelProgress = useCallback(() => {
    setProgressState(prev => ({
      ...prev,
      status: 'cancelled'
    }));
  }, []);
  
  const resetProgress = useCallback(() => {
    setProgressState({
      currentStage: 1,
      overallProgress: 0,
      stageProgress: 0,
      status: 'idle',
      stages: {
        serp: { status: 'pending', progress: 0, subtasks: [] },
        crawler: { status: 'pending', progress: 0, subtasks: [] },
        ai: { status: 'pending', progress: 0, subtasks: [] }
      },
      timing: {
        startTime: new Date(),
        currentStageStartTime: new Date(),
        estimatedTotalTime: initialEstimate || 60,
        estimatedRemainingTime: initialEstimate || 60
      },
      jobId: '',
      canCancel: true,
      estimatedTimeRemaining: initialEstimate || 60,
      efficiency: 1.0,
      canPause: false
    });
  }, [initialEstimate]);
  
  return {
    ...progressState,
    updateProgress,
    startProgress,
    completeProgress,
    errorProgress,
    cancelProgress,
    resetProgress
  };
};
```

## 🔌 WebSocket 管理 Hook

### 🔌 useWebSocket Hook
**核心功能**:
- 管理 WebSocket 連接生命週期
- 實現自動重連機制
- 提供訊息處理回調
- 支援連接狀態監控

**Hook 設計**:
```typescript
interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  lastMessage: any;
  reconnectAttempts: number;
}

interface WebSocketCallbacks {
  onProgress?: (data: ProgressUpdate) => void;
  onCompleted?: (result: any) => void;
  onError?: (error: any) => void;
  onConnection?: (connected: boolean) => void;
}

const useWebSocket = () => {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    reconnectAttempts: 0
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef<WebSocketCallbacks>({});
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  const connect = useCallback((jobId: string, callbacks: WebSocketCallbacks) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      disconnect();
    }
    
    callbacksRef.current = callbacks;
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    const wsUrl = `${import.meta.env.VITE_WS_BASE_URL}/progress/${jobId}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isConnecting: false,
        reconnectAttempts: 0
      }));
      callbacksRef.current.onConnection?.(true);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setState(prev => ({ ...prev, lastMessage: data }));
        
        switch (data.type) {
          case 'progress_update':
            callbacksRef.current.onProgress?.(data.data);
            break;
          case 'completed':
            callbacksRef.current.onCompleted?.(data.data);
            break;
          case 'error':
            callbacksRef.current.onError?.(data.data);
            break;
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
    
    ws.onerror = (error) => {
      setState(prev => ({ ...prev, error: new Error('WebSocket error') }));
    };
    
    ws.onclose = (event) => {
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isConnecting: false 
      }));
      callbacksRef.current.onConnection?.(false);
      
      // 自動重連邏輯
      if (!event.wasClean && state.reconnectAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 10000);
        reconnectTimeoutRef.current = setTimeout(() => {
          setState(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }));
          connect(jobId, callbacks);
        }, delay);
      }
    };
    
    wsRef.current = ws;
  }, [state.reconnectAttempts]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastMessage: null,
      reconnectAttempts: 0
    });
  }, []);
  
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);
  
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  return {
    ...state,
    connect,
    disconnect,
    sendMessage
  };
};
```

---

## 📊 開發里程碑與完成標準

### Phase 2.1 完成標準
- ✅ 表單輸入驗證 100% 正確
- ✅ 與 Backend API 格式完全相容
- ✅ 響應式設計在所有裝置正常
- ✅ 無障礙性測試通過 (WCAG 2.1 AA)
- ✅ 單元測試覆蓋率 ≥ 85%

### Phase 2.2 完成標準
- ✅ 三階段進度追蹤準確無誤
- ✅ 時間估算演算法運作正常
- ✅ 取消操作和錯誤處理完整
- ✅ 視覺化效果流暢美觀
- ✅ WebSocket 連接穩定可靠

### Phase 2.3 完成標準
- ✅ Markdown 渲染完美支援
- ✅ 匯出功能正常運作 (PDF/Word/MD)
- ✅ 大型文件效能良好 (>10k 字)
- ✅ 全螢幕模式用戶體驗佳
- ✅ 搜尋功能快速準確

### Phase 2.4 完成標準
- ✅ 所有 Hook 功能完整實作
- ✅ 錯誤處理和邊界情況覆蓋
- ✅ 效能優化和記憶體管理
- ✅ TypeScript 型別安全 100%
- ✅ Hook 單元測試完整

---

## ⚡ 效能與優化目標

### 載入效能
- **首次內容繪製 (FCP)**: < 1.5 秒
- **最大內容繪製 (LCP)**: < 2.5 秒
- **累積佈局偏移 (CLS)**: < 0.1
- **首次輸入延遲 (FID)**: < 100ms

### 程式碼優化
- **Bundle 分析**: 每個元件 < 50KB gzipped
- **Tree shaking**: 移除未使用程式碼
- **Code splitting**: 按需載入元件
- **記憶體優化**: 避免記憶體洩漏

### 用戶體驗
- **表單響應**: 輸入反饋 < 50ms
- **進度更新**: WebSocket 延遲 < 200ms
- **動畫流暢度**: 60fps 穩定
- **大文檔處理**: 10k+ 字文檔流暢滾動

---

## 🧪 測試策略總覽

### 單元測試
- **React Testing Library**: 元件渲染和互動測試
- **Jest**: Hook 邏輯和工具函數測試
- **Mock Service Worker**: API 整合測試模擬
- **覆蓋率目標**: ≥ 85%

### 整合測試
- **Cypress**: 端到端用戶流程測試
- **Storybook**: 元件視覺回歸測試
- **Accessibility Testing**: 無障礙性自動化測試
- **效能測試**: Lighthouse CI 持續監控

### 跨瀏覽器測試
- **主要瀏覽器**: Chrome, Firefox, Safari, Edge
- **行動裝置**: iOS Safari, Chrome Mobile
- **響應式測試**: 320px - 1920px 全範圍
- **相容性驗證**: ES2019+ 語法支援

---

---

## 📋 Phase 2.1 實作經驗與計畫調整

### ✅ Phase 2.1 實際完成狀況 (2025-08-25)

**實際開發時間**: 約 4-5 小時  
**完成元件**:
- ✅ KeywordInput 元件 - 關鍵字輸入欄位
- ✅ AudienceTextArea 元件 - 受眾描述文字區域  
- ✅ AnalysisOptions 元件 - 分析選項群組
- ✅ SubmitButton 元件 - 提交按鈕
- ✅ InputForm 容器元件 - 完整表單整合
- ✅ useFormValidation Hook - 表單驗證邏輯
- ✅ useDebounce Hook - 防抖處理

**技術實現**:
- React Hook Form + Zod 驗證整合 ✅
- TypeScript 嚴格類型安全 ✅  
- Tailwind CSS 響應式設計 ✅
- 完整的錯誤處理和狀態管理 ✅

### 🔧 關鍵經驗教訓

#### 1. TypeScript 複雜性挑戰
**遭遇問題**:
- `verbatimModuleSyntax` 導入限制
- 複雜泛型約束類型匹配失敗  
- React Hook Form + Zod 類型交互複雜
- 25+ ESLint 錯誤需要逐一修復

**解決策略調整**:
- 採用階段式開發：基礎功能 → 類型完善 → 優化
- 簡化泛型設計，優先確保功能正確性
- 使用適配層隔離第三方庫複雜性

#### 2. 開發流程優化
**原計畫**: 一次性完美實現所有功能  
**實際採用**: 漸進式開發與重構

```
階段 1: 基礎結構 (30min) → 確保編譯通過
階段 2: 核心功能 (2-3h) → 實現主要邏輯  
階段 3: 類型安全 (1-2h) → 修復類型錯誤
階段 4: 優化重構 (30min) → 代碼品質提升
```

### 📊 調整後的 Phase 2.2-2.4 預估

基於 Phase 2.1 實際經驗，調整後續階段預估：

#### Phase 2.2: ProgressIndicator 元件
- **調整前預估**: 2-2.5 小時
- **調整後預估**: 3-4 小時
- **增加時間原因**: WebSocket 整合複雜性、時間估算算法實現

#### Phase 2.3: MarkdownViewer 元件  
- **調整前預估**: 1.5-2 小時
- **調整後預估**: 2.5-3 小時
- **增加時間原因**: React-markdown 類型整合、匯出功能複雜性

#### Phase 2.4: 自定義 Hooks
- **調整前預估**: 1.5-2 小時  
- **調整後預估**: 2-2.5 小時
- **增加時間原因**: API 整合和錯誤處理完善

### 🎯 修正後的開發策略

#### 1. 複雜性管理原則
- **簡單優於完美**: 功能實現優先於完美類型
- **分層實現**: 基礎 → 功能 → 類型 → 優化
- **適配隔離**: 複雜第三方庫用簡單接口包裝

#### 2. 品質檢查流程
```bash
# 每個階段結束前執行
npm run type-check    # TypeScript 檢查
npm run lint:fix      # 自動修復 ESLint 問題  
npm run build         # 建置驗證
```

#### 3. 時間分配策略
- **實作時間**: 70% (重點放在功能實現)
- **類型完善**: 20% (確保類型安全)
- **優化重構**: 10% (代碼品質提升)

### 📈 更新後的總體預估

**Phase 2 總預估時間**: **10-12.5 小時** (原: 7-9.5 小時)  
**主要增加原因**:
- TypeScript 嚴格模式適應成本
- 第三方庫整合複雜性
- 代碼品質標準提升
- 完整的錯誤處理實現

**核心收穫**:
- ✅ 建立了穩健的開發流程
- ✅ 累積了 TypeScript 嚴格模式經驗  
- ✅ 完善了錯誤處理最佳實踐
- ✅ 制定了可複製的開發策略

---

**🎉 Phase 2.1 圓滿完成，經驗加值後續開發！**

**準備以更穩健的策略繼續 Phase 2.2！** 🚀