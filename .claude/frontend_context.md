# 前端開發上下文

## 最後更新：2024-01-20 16:00
## 負責人：Frontend Developer
## 當前 Session：#2

## 🎯 技術棧概述
- **框架**: React 18 + TypeScript
- **建構工具**: Vite (取代 Create React App)
- **樣式**: Tailwind CSS
- **Markdown渲染**: react-markdown
- **HTTP Client**: Axios
- **狀態管理**: React Hooks
- **測試**: Jest + React Testing Library

## 📂 專案結構
```
frontend/
├── src/
│   ├── components/          # React 元件
│   │   ├── InputForm.tsx   # 關鍵字與受眾輸入表單 ⏳
│   │   ├── ProgressIndicator.tsx  # 三階段進度顯示 ⏳
│   │   ├── MarkdownViewer.tsx     # 結果渲染展示 ⏳
│   │   └── common/         # 共用元件
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Loading.tsx
│   ├── hooks/              # 自定義 Hooks
│   │   ├── useAnalysis.ts  # 分析 API 呼叫 ⏳
│   │   └── useProgress.ts  # 進度狀態管理 ⏳
│   ├── types/              # TypeScript 型別定義
│   │   ├── api.ts          # API 介面型別 ⏳
│   │   └── analysis.ts     # 分析結果型別 ⏳
│   ├── utils/              # 工具函數
│   │   ├── api.ts          # API 呼叫封裝 ⏳
│   │   └── validation.ts   # 輸入驗證 ⏳
│   ├── styles/             # 樣式檔案
│   │   └── globals.css     # 全域樣式 + Tailwind ⏳
│   ├── App.tsx             # 主應用元件 ✅
│   ├── main.tsx            # 應用進入點 ✅
│   └── vite-env.d.ts       # Vite 型別聲明
├── public/                 # 靜態資源
│   └── favicon.ico ✅
├── package.json            # 套件配置 ✅
├── vite.config.ts          # Vite 設定 ⏳
├── tailwind.config.js      # Tailwind 設定 ⏳
├── tsconfig.json           # TypeScript 設定 ✅
└── postcss.config.js       # PostCSS 設定 ⏳
```

## ✅ 已完成功能
### 專案初始化
- ~~Create React App~~ → **改用 Vite** (更快建構)
- Tailwind CSS 設定
- 基本專案結構
- TypeScript 設定

## 🔄 進行中任務
### 建立核心元件
- [ ] **InputForm.tsx** - 關鍵字與受眾輸入表單
  - Keyword 輸入欄 (1-50字元驗證)
  - Audience 文字區域 (1-200字元驗證)
  - Options checkboxes (generate_draft, include_faq, include_table)
  - 即時驗證與錯誤提示
- [ ] **ProgressIndicator.tsx** - 三階段進度顯示
  - SERP 擷取階段 (目標: 10秒)
  - 網頁爬取階段 (目標: 20秒)
  - AI 分析階段 (目標: 30秒)
  - 動態時間追蹤與剩餘時間估算
- [ ] **MarkdownViewer.tsx** - 結果渲染展示
  - react-markdown 渲染 SEO 報告
  - 元數據摘要顯示
  - 複製與匯出功能 (未來)

### 建立自定義 Hooks
- [ ] **useAnalysis.ts** - 分析 API 呼叫管理
- [ ] **useProgress.ts** - 進度狀態管理

## ⏳ 待開發功能
### API 整合層
- [ ] **utils/api.ts** - Axios 設定與錯誤處理
- [ ] **types/api.ts** - API 介面型別定義
- [ ] Loading states 與錯誤邊界
- [ ] 逾時處理 (70秒)

### 共用元件庫
- [ ] **common/Button.tsx** - 統一按鈕元件
- [ ] **common/Input.tsx** - 統一輸入元件  
- [ ] **common/Loading.tsx** - 載入狀態元件

### 工具與驗證
- [ ] **utils/validation.ts** - 輸入驗證邏輯
- [ ] **types/analysis.ts** - 分析結果型別

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

### 核心依賴
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "typescript": "^5.9.2",
  "axios": "^1.11.0",
  "react-markdown": "^9.0.1"
}
```

### 開發依賴 (Vite 6 生態系)
```json
{
  "@vitejs/plugin-react": "^4.3.4",
  "vite": "^6.0.7",
  "tailwindcss": "^4.0.1",
  "@tailwindcss/vite": "^4.0.1",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.5.1",
  "@types/react": "^18.3.17",
  "@types/react-dom": "^18.3.5"
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
**最後更新**: Session 02  
**狀態**: 詳細規格完成，準備開始實作