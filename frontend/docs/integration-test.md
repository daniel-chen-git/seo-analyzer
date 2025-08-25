# Phase 1.6 整合測試指引

## 🚀 啟動流程

### 1. Backend 啟動 (終端 1)
```bash
# 從專案根目錄
cd backend
../.venv/bin/python -m app.main
```

**預期輸出:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using WatchFiles
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 2. Frontend 啟動 (終端 2)
```bash
# 從 frontend 目錄
cd frontend
npm run dev
```

**預期輸出:**
```
VITE v6.3.5  ready in 399 ms
➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

---

## 🧪 測試項目清單

### 基礎功能測試
- [ ] **開發伺服器啟動** - http://localhost:3000 可正常訪問
- [ ] **頁面載入無錯誤** - 瀏覽器 Console 無錯誤訊息
- [ ] **Tailwind CSS 樣式正確顯示** - 色彩、字體、佈局正常
- [ ] **字體載入正常** - Inter 字體用於一般文字，Fira Code 用於程式碼
- [ ] **React 元件正常渲染** - 所有元件正確顯示

### API 代理測試
- [ ] **手動 API 測試**
  ```bash
  # 測試健康檢查端點
  curl http://localhost:3000/api/health
  ```
  **預期回應:** `{"status": "healthy", "backend_connected": true}`

- [ ] **前端健康檢查顯示狀態**
  - Backend 運行時：顯示綠色圓點 + "Backend 連線正常"
  - Backend 未運行時：顯示橙色圓點 + "Backend 未連線 (開發模式)"

- [ ] **錯誤處理正常**
  - 當 Backend 未啟動時不影響前端正常運行
  - 錯誤訊息友善且資訊準確

### 環境變數測試
- [ ] **開發環境變數正確載入**
  - `VITE_API_BASE_URL`: http://localhost:8000
  - `VITE_APP_TITLE`: SEO Analyzer
  - `VITE_ENABLE_DEBUG`: true

- [ ] **環境變數顯示**
  - 在開發模式下的環境配置區塊正確顯示所有變數
  - 變數值與 `.env.development` 檔案一致

### 熱重載測試 (HMR)
- [ ] **TypeScript 檔案修改**
  ```bash
  # 修改 src/App.tsx 中的任何文字
  # 儲存後應在 1-2 秒內自動更新頁面
  ```

- [ ] **樣式修改即時反映**
  ```bash
  # 修改 src/styles/globals.css 中的樣式
  # 儲存後應立即看到變化
  ```

- [ ] **TypeScript 錯誤即時顯示**
  ```bash
  # 故意引入 TypeScript 錯誤
  # 瀏覽器和終端應顯示錯誤資訊
  ```

### 響應式設計測試
- [ ] **桌面版顯示** (≥1024px)
  - 環境驗證卡片使用 2 列網格佈局
  - 功能預覽卡片使用 3 列網格佈局

- [ ] **平板版顯示** (768px-1023px)
  - 環境驗證卡片使用 2 列網格佈局
  - 功能預覽卡片使用 3 列網格佈局

- [ ] **手機版顯示** (<768px)
  - 環境驗證卡片使用 1 列網格佈局
  - 功能預覽卡片使用 1 列網格佈局
  - 文字大小和間距適當調整

---

## 📊 驗證命令

### 自動化驗證
```bash
# 執行完整環境驗證
npm run verify

# 預期輸出：所有 7 項檢查都應該通過
# 🎉 Phase 1.6 環境設定驗證完成！
# 📊 驗證結果: 7/7 項目通過
```

### 個別檢查命令
```bash
# TypeScript 類型檢查
npm run type-check

# 健康檢查 (需要 Backend 運行)
npm run health

# ESLint 檢查
npm run lint

# 生產建置測試
npm run build

# 預覽生產建置
npm run preview
```

---

## 🔧 故障排除

### 常見問題

#### 1. 前端無法啟動
**問題**: `npm run dev` 失敗
**解決方案**:
```bash
# 重新安裝依賴
rm -rf node_modules package-lock.json
npm install

# 檢查 Node.js 版本 (需要 ≥20.19)
node --version
```

#### 2. API 代理失敗
**問題**: `/api/health` 返回 404 或連線錯誤
**解決方案**:
```bash
# 檢查 vite.config.ts 中的代理設定
# 確認 target: 'http://localhost:8000' 正確
# 重啟前端開發伺服器
```

#### 3. Tailwind 樣式不生效
**問題**: CSS 樣式沒有正確載入
**解決方案**:
```bash
# 檢查 tailwind.config.js 配置
# 確認 content 路徑包含 './src/**/*.{js,jsx,ts,tsx}'
# 重啟開發伺服器
```

#### 4. TypeScript 編譯錯誤
**問題**: 型別錯誤或找不到模組
**解決方案**:
```bash
# 執行型別檢查
npm run type-check

# 檢查 tsconfig.json 和路徑映射設定
# 確認所有 import 路徑正確
```

---

## 🎯 完成標準

### Phase 1.6 驗收標準
當所有測試項目都通過時，應該具備：

#### ✅ 技術環境
- Node.js v22.18.0 運行正常
- 所有依賴安裝無衝突 (377 packages, 0 vulnerabilities)
- TypeScript 編譯零錯誤
- Vite 建置成功 (< 1 秒)
- ESLint 檢查通過

#### ✅ 開發體驗
- 開發伺服器快速啟動 (port 3000)
- 熱模組重載 (HMR) 響應迅速 (< 2 秒)
- 錯誤訊息清晰且有幫助
- 瀏覽器開發者工具無警告

#### ✅ 功能驗證
- Tailwind CSS 4 樣式系統完整運作
- API 代理設定準備就緒 (/api → localhost:8000)
- 環境變數正確載入和顯示
- TypeScript 路徑映射正常運作
- React 19 新功能支援

#### ✅ 整合準備
- Backend 健康檢查機制正常
- 錯誤邊界和異常處理完整
- 離線狀態檢測和提示
- 開發者面板和除錯工具可用

---

## 🚀 下一步準備

### Phase 2.1 預備工作
完成 Phase 1.6 後，準備進入核心 UI 元件開發：

```bash
# 確認所有基礎設定完成
npm run verify

# 開始 Phase 2: 核心 UI 元件開發
# 1. InputForm 元件 - 關鍵字輸入和選項設定
# 2. ProgressIndicator 元件 - 三階段進度顯示  
# 3. MarkdownViewer 元件 - SEO 報告展示
```

### 效能目標
- **首次載入**: < 3 秒
- **互動響應**: < 100ms  
- **API 請求**: < 60 秒 (配合 Backend 超時設定)
- **Bundle 大小**: < 500KB gzipped

---

## 📞 技術支援

### 相關文件
- `/Users/danielchen/test/seo-analyzer/docs/context/session-12-handover.md` - 完整技術背景
- `vite.config.ts` - Vite 建置配置
- `tailwind.config.js` - Tailwind CSS 設定  
- `tsconfig.json` - TypeScript 專案配置

### 常用除錯命令
```bash
# 查看開發伺服器狀態
lsof -i :3000

# 查看 Backend 狀態  
lsof -i :8000

# 清除快取重新啟動
rm -rf node_modules/.vite
npm run dev

# 查看詳細建置資訊
npm run build -- --debug
```

---

**🎉 Phase 1.6 整合測試準備完成！**

當所有測試項目都通過時，代表 Frontend 開發環境已經完全就緒，可以開始進行高效的元件開發工作。