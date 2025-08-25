# 前端開發上下文

## 最後更新：2025-08-25 18:00
## 負責人：Claude Code AI Assistant
## 當前 Session：#15 (Phase 2.4 前置作業)
## Git Commit：d8853dc (穩定版本 - Phase 2.2 完成)

## 🎯 技術棧概述
- **框架**: React 19.1.1 + TypeScript 5.8.3
- **建構工具**: Vite 6.3.5
- **樣式**: Tailwind CSS 4.1.12
- **Markdown渲染**: react-markdown 10.1.0
- **HTTP Client**: Axios 1.11.0
- **表單處理**: React Hook Form 7.62.0 + Zod 4.1.1
- **狀態管理**: React Hooks + Custom Hooks
- **代碼檢查**: ESLint 9.33.0 + TypeScript-ESLint 8.39.1

## 📂 實際專案結構 (2025-08-25)
```
frontend/
├── src/
│   ├── components/          # React 元件
│   │   ├── form/           # 表單元件系統 ✅ Phase 2.1
│   │   │   ├── InputForm.tsx      # 主表單容器
│   │   │   ├── KeywordInput.tsx   # 關鍵字輸入
│   │   │   ├── AudienceTextArea.tsx # 受眾描述
│   │   │   ├── AnalysisOptions.tsx  # 分析選項
│   │   │   ├── SubmitButton.tsx   # 提交按鈕
│   │   │   └── index.ts
│   │   ├── progress/       # 進度指示器系統 ✅ Phase 2.2
│   │   │   ├── ProgressIndicator.tsx  # 主容器
│   │   │   ├── ProgressBar.tsx       # 進度條
│   │   │   ├── StageIndicator.tsx    # 階段指示器
│   │   │   ├── TimeEstimator.tsx     # 時間估算
│   │   │   ├── CancelButton.tsx      # 取消按鈕
│   │   │   └── index.ts
│   │   ├── layout/         # 佈局元件 ✅
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── index.ts
│   │   ├── ui/             # 通用 UI 元件 ✅
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── DevPanel.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── hooks/              # 自定義 Hooks
│   │   ├── api/            # API 管理 Hooks ⚠️ 需企業級改進
│   │   │   └── index.ts    # 現有基本 API hooks
│   │   ├── form/           # 表單處理 Hooks ✅ Phase 2.1
│   │   │   ├── useFormValidation.ts
│   │   │   ├── useDebounce.ts
│   │   │   └── index.ts
│   │   ├── progress/       # 進度管理 Hooks ✅ Phase 2.2
│   │   │   ├── useTimeEstimation.ts
│   │   │   └── index.ts
│   │   ├── ui/             # UI 交互 Hooks
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── types/              # TypeScript 型別定義 ✅
│   │   ├── api/
│   │   │   └── index.ts
│   │   ├── form/           # 表單類型 ✅
│   │   │   ├── inputForm.ts
│   │   │   ├── validation.ts
│   │   │   └── index.ts
│   │   ├── progress/       # 進度類型 ✅
│   │   │   ├── progressTypes.ts
│   │   │   ├── stageTypes.ts
│   │   │   └── index.ts
│   │   ├── ui/
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── utils/              # 工具函數 ✅
│   │   ├── api/            # API 工具
│   │   │   ├── endpoints.ts
│   │   │   ├── test.ts
│   │   │   └── index.ts
│   │   ├── form/           # 表單工具 ✅
│   │   │   ├── validation.ts
│   │   │   ├── formatters.ts
│   │   │   └── index.ts
│   │   ├── progress/       # 進度工具 ✅
│   │   │   ├── animations.ts
│   │   │   └── index.ts
│   │   ├── helpers/
│   │   │   └── index.ts
│   │   ├── devTools.ts
│   │   └── index.ts
│   ├── styles/             # 樣式檔案 ✅
│   │   ├── globals.css
│   │   ├── components.css
│   │   ├── progress-animations.css  # Phase 2.2 動畫
│   │   └── index.ts
│   ├── config/             # 配置檔案 ✅
│   │   └── index.ts
│   ├── App.tsx             # 主應用元件 ✅
│   ├── App.css
│   ├── main.tsx            # 應用進入點 ✅
│   ├── index.css           # 全域樣式
│   ├── index.ts            # 統一匯出
│   └── vite-env.d.ts       # Vite 型別聲明
├── public/                 # 靜態資源 ✅
│   └── vite.svg
├── dist/                   # 建構輸出 ✅
├── docs/                   # 專案文檔 ✅
│   ├── phase-2-development-plan.md
│   └── integration-test.md
├── scripts/                # 工具腳本 ✅
│   ├── verify-setup.js
│   └── integration-test.js
├── package.json            # 套件配置 ✅
├── vite.config.ts          # Vite 設定 ✅
├── tailwind.config.js      # Tailwind 設定 ✅
├── tsconfig.json           # TypeScript 設定 ✅
├── tsconfig.app.json       # TypeScript App 設定 ✅
├── tsconfig.node.json      # TypeScript Node 設定 ✅
├── eslint.config.js        # ESLint 設定 ✅
└── index.html              # 入口 HTML ✅
```

## ✅ 已完成功能 (Phase 1 + Phase 2.1 + Phase 2.2)

### Phase 1: 專案基礎建設 ✅
- Vite 6.3.5 + React 19.1.1 + TypeScript 5.8.3 完整設定
- Tailwind CSS 4.1.12 樣式系統
- ESLint + TypeScript-ESLint 代碼檢查
- 完整的專案架構和目錄結構

### Phase 2.1: InputForm 表單系統 ✅
- **InputForm.tsx** - 主表單容器元件
  - **KeywordInput.tsx** - 關鍵字輸入 (1-50字元驗證)
  - **AudienceTextArea.tsx** - 受眾描述 (1-200字元驗證)
  - **AnalysisOptions.tsx** - 分析選項核選框
  - **SubmitButton.tsx** - 智慧提交按鈕
- **表單驗證系統**: Zod Schema + 即時驗證
- **表單處理 Hooks**: useFormValidation + useDebounce

### Phase 2.2: ProgressIndicator 進度系統 ✅
- **ProgressIndicator.tsx** - 主容器元件 (3種佈局模式)
- **ProgressBar.tsx** - 整體進度條 (5種狀態、動畫效果)
- **StageIndicator.tsx** - 三階段指示器 (SERP/Crawler/AI)
- **TimeEstimator.tsx** - 時間估算器 (動態效率調整)
- **CancelButton.tsx** - 取消操作按鈕 (確認對話框)
- **動畫系統**: 20+ 專業動畫效果 + Tailwind CSS 整合
- **進度管理 Hook**: useTimeEstimation (智慧時間估算算法)

### 基礎設施元件 ✅
- **Layout 系統**: Header + Footer + Layout 容器
- **UI 元件**: ErrorBoundary + DevPanel 開發工具
- **類型系統**: 完整的 TypeScript 類型定義
- **工具函數**: API、表單、進度處理工具

## 🔄 進行中任務 (Phase 2.4)

### API Hooks 企業級改進 ⚠️ 當前任務
- **現有狀況**: 基本 API hooks 已實作 (useSyncAnalysis, useAsyncAnalysis, useJobStatus, useHealth)
- **需要改進**: 缺少企業級功能
  - 統一錯誤處理機制
  - 自動重試和超時管理
  - WebSocket 整合 (即時進度追蹤)
  - 請求/響應攔截器
  - 載入狀態管理

### 待實作企業級 Hooks
- **useApiClient** - Axios 客戶端封裝 + 攔截器 🎯
- **useAnalysis** - 完整分析生命週期管理 🎯
- **useErrorHandling** - 統一錯誤處理系統 🎯

## ⏳ 待開發功能 (Phase 2.3+)

### Phase 2.3: MarkdownViewer 結果展示 📋 規劃中
- [ ] **MarkdownViewer.tsx** - 結果渲染展示
  - react-markdown 10.1.0 渲染 SEO 報告
  - TableOfContents 目錄導航
  - ExportButtons (PDF/Word/MD 匯出)
  - FullscreenMode 全螢幕閱讀
  - SearchHighlight 搜尋與高亮
  - PrintLayout 列印佈局

### Phase 2.5: 效能優化與最終整合 📋 規劃中
- [ ] 程式碼分割和懶載入
- [ ] API 快取機制
- [ ] 記憶體優化
- [ ] 錯誤邊界完善
- [ ] 單元測試套件

## 🎨 UI/UX 設計決策

### 色彩配置 (保持既有藍色主題)
```css
primary: '#1a73e8',      /* 主藍色 (保留原設計) */
secondary: '#64748B',    /* 灰藍色 */
success: '#10B981',      /* 綠色 */
warning: '#F59E0B',      /* 橙色 */
error: '#EF4444',        /* 紅色 */
background: '#F8FAFC',   /* 淺灰背景 */
surface: '#FFFFFF',      /* 白色卡片 */
```

### 設計系統
1. **字型**：Inter (UI) + Fira Code (程式碼) - 保留原選擇
2. **圓角**：8px 統一圓角
3. **陰影**：輕微陰影增加層次感
4. **響應式**：Mobile-first design - 保留原策略
5. **動畫**：~~Framer Motion~~ → **CSS Transitions** (減少套件依賴)

### 響應式斷點
- **手機**: 320px - 768px
- **平板**: 768px - 1024px  
- **桌面**: 1024px+

### 互動設計
- **Loading 狀態**: 骨架屏 + 進度條
- **錯誤處理**: Toast 通知 + 重試按鈕
- **成功回饋**: 輕微動畫效果
- **鍵盤快捷鍵**: Enter 提交, Escape 取消

## 📦 相依套件版本 (2025年最新穩定版)

### 🆙 版本更新說明 (2025-01-24)
- **React**: 18.3.1 → 19.1.1 (需手動升級，包含新功能和效能改善)
- **React Types**: 18.x → 19.0.0 (適配 React 19 新 API)
- **React-Markdown**: 9.0.1 → 10.1.0 (支援更多 Markdown 功能)
- **Tailwind CSS**: 4.0.1 → 4.0.12 (最新穩定版本)
- **Node.js 要求**: Vite 6 需要 Node.js 20.19+ / 22.12+

### 核心依賴
```json
{
  "react": "^19.1.1",
  "react-dom": "^19.1.1",
  "typescript": "^5.9.2",
  "axios": "^1.11.0",
  "react-markdown": "^10.1.0"
}
```

### 開發依賴 (Vite 6 生態系)
```json
{
  "@vitejs/plugin-react": "^4.3.4",
  "vite": "^6.0.7",
  "tailwindcss": "^4.0.12",
  "@tailwindcss/vite": "^4.0.12",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.5.1",
  "@types/react": "^19.0.0",
  "@types/react-dom": "^19.0.0"
}
```

### 測試依賴
```json
{
  "jest": "^29.7.0",
  "@testing-library/react": "^16.1.0",
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/user-event": "^14.5.2",
  "vitest": "^3.0.5"
}
```

## 🌐 API 介面定義

### 請求介面
```typescript
interface AnalyzeRequest {
  keyword: string;          // 1-50字元
  audience: string;         // 1-200字元
  options: {
    generate_draft: boolean;   // 調整為 snake_case (配合後端)
    include_faq: boolean;
    include_table: boolean;
  };
}
```

### 回應介面
```typescript
interface AnalyzeResponse {
  status: 'success' | 'error';
  processing_time: number;   // 處理時間 (秒)
  data?: {
    serp_summary: {
      total_results: number;
      successful_scrapes: number;
      avg_word_count: number;
      avg_paragraphs: number;
    };
    analysis_report: string;  // Markdown 格式
    metadata: {
      keyword: string;
      audience: string;
      generated_at: string;   // ISO 8601 格式
    };
  };
  error?: {
    code: string;            // 錯誤碼
    message: string;         // 錯誤訊息
    details?: any;           // 詳細資訊
  };
}
```

### 錯誤碼對應
```typescript
const ERROR_MESSAGES = {
  SERP_API_ERROR: 'SERP 搜尋服務暫時無法使用',
  SCRAPER_TIMEOUT: '網頁爬取逾時，請稍後再試',
  AI_API_ERROR: 'AI 分析服務暫時無法使用',
  INVALID_INPUT: '輸入資料格式錯誤',
  RATE_LIMIT: '請求過於頻繁，請稍後再試',
  NETWORK_ERROR: '網路連線錯誤，請檢查網路狀態'
};
```

## 🚀 下一步行動計劃
1. **設定開發環境** - 初始化 Vite + React 專案
2. **建立 InputForm 元件** - 表單輸入與驗證
3. **實作 API service layer** - Axios 設定與錯誤處理
4. **建立 ProgressIndicator** - 三階段進度顯示
5. **實作 MarkdownViewer** - 結果渲染
6. **整合測試** - 與後端 API 連接測試

## 🔧 開發工具設定

### Vite 設定重點
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### Tailwind 設定擴充
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1a73e8',    // 保留原藍色
        // ... 其他顏色
      },
    },
  },
};
```

## 🧪 測試策略

### 單元測試涵蓋率目標
- **元件**: 90%+ (InputForm, ProgressIndicator, MarkdownViewer)
- **Hooks**: 85%+ (useAnalysis, useProgress)
- **Utils**: 95%+ (validation, api)

### 測試重點
```typescript
// 範例：InputForm 測試
describe('InputForm', () => {
  test('validates keyword length (1-50 chars)', () => {
    // 測試關鍵字長度驗證
  });
  
  test('validates audience length (1-200 chars)', () => {
    // 測試受眾描述驗證
  });
  
  test('submits form with correct data structure', () => {
    // 測試表單提交
  });
});
```

## 📝 程式碼範例片段

### InputForm 基本結構
```tsx
interface InputFormProps {
  onSubmit: (data: AnalyzeRequest) => void;
  loading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, loading }) => {
  const [keyword, setKeyword] = useState('');
  const [audience, setAudience] = useState('');
  const [options, setOptions] = useState({
    generate_draft: false,
    include_faq: false,
    include_table: false,
  });
  
  // 驗證邏輯
  const validate = () => {
    if (keyword.length < 1 || keyword.length > 50) return false;
    if (audience.length < 1 || audience.length > 200) return false;
    return true;
  };
  
  // ...
};
```

### API 呼叫封裝
```typescript
// utils/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const analyzeKeyword = async (request: AnalyzeRequest): Promise<AnalyzeResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/analyze`, request, {
      timeout: 70000,  // 70秒逾時
    });
    return response.data;
  } catch (error) {
    // 錯誤處理邏輯
    throw new Error(ERROR_MESSAGES[error.code] || ERROR_MESSAGES.NETWORK_ERROR);
  }
};
```

## ⚠️ 開發注意事項
- **元件大小**: 保持單一元件 < 200 行
- **效能優化**: 使用 React.memo 包裝純元件
- **無障礙性**: 確保 ARIA 標籤與鍵盤導航
- **型別安全**: 嚴格 TypeScript 設定，避免 any
- **錯誤邊界**: 實作 ErrorBoundary 元件
- **環境變數**: 使用 VITE_ 前綴的環境變數

## 📊 效能最佳化策略
1. **程式碼分割**: React.lazy() 延遲載入 MarkdownViewer
2. **API 快取**: 相同參數的請求結果快取
3. **防抖動**: 輸入欄位使用 debounce 減少驗證頻率
4. **骨架屏**: 改善載入體驗

---

## 📊 當前開發狀態總結 (2025-08-25)

### 整體進度: 70% 完成 🚀

#### ✅ 已完成階段
- **Phase 1**: 專案基礎建設 (100%)
- **Phase 2.1**: InputForm 表單系統 (100%)  
- **Phase 2.2**: ProgressIndicator 進度系統 (100%)

#### 🔄 當前階段  
- **Phase 2.4**: API Hooks 企業級改進 (準備中)
  - 現有基本 API hooks 運作正常
  - 需要添加企業級功能：錯誤處理、重試機制、WebSocket 整合

#### 📋 後續規劃
- **Phase 2.3**: MarkdownViewer 結果展示系統
- **Phase 2.5**: 效能優化與最終整合

### 🎯 技術債務與改進點
- API Hooks 缺乏企業級功能 (當前優先任務)
- 需要完整的錯誤處理機制
- WebSocket 即時進度追蹤整合
- 單元測試覆蓋率提升

### 🔧 代碼品質狀況
- **TypeScript**: 100% 類型安全 ✅
- **ESLint**: 代碼檢查通過 ✅ 
- **建構**: Vite 建置成功 ✅
- **依賴**: 所有套件最新穩定版 ✅

### 📦 專案統計
- **總檔案數**: ~60 個源碼檔案
- **元件數**: 15+ React 元件
- **Hook 數**: 8+ 自定義 Hooks  
- **類型定義**: 完整的 TypeScript 類型系統
- **代碼行數**: ~3000+ 行

---
**最後更新**: Session 15 (Phase 2.4 前置作業)  
**Git Commit**: d8853dc (穩定版本)  
**狀態**: Phase 2.2 完成，準備 Phase 2.4 API Hooks 企業級改進