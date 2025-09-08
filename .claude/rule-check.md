# Claude Code 規範載入檢查工具

## 🔍 快速檢查指令

在 Claude Code CLI 中直接複製貼上以下任一指令：

### 1. 基本檢查
```
規範狀態
```

### 2. 英文檢查  
```
check rules
```

### 3. 詳細檢查
```
請確認你已經載入了專案開發規範，並簡述以下內容：
1. Git Commit 規範格式
2. API 回應的雙欄位設計
3. 當前專案的主要技術棧
4. 前端架構模式（功能導向 vs 元件導向）
```

### 4. 架構理解測試
```
architecture status
```

### 5. 規範知識測試
```
這個專案遇到 TypeScript 嚴格模式問題時應該怎麼處理？有什麼經驗教訓？
```

## ✅ 預期回應

如果 Claude Code 已正確載入規範，應該能回答：

- **Git 規範**: `feat:` / `fix:` 格式，繁體中文描述
- **API 設計**: `status` + `success` 雙欄位回應格式  
- **技術棧**: React 19, TypeScript, FastAPI, Python 3.13, uv
- **架構**: 功能導向 (features/) 目錄結構
- **歷史問題**: TypeScript verbatimModuleSyntax, ESLint 衝突, 響應式佈局重疊

## ❌ 如果載入失敗

如果 Claude Code 無法回答上述問題，表示規範未正確載入，需要：

1. 檢查 `.claude/instructions.md` 檔案是否正確
2. 重新啟動 Claude Code CLI session
3. 手動要求載入：`請讀取 .claude 資料夾中的所有開發規範文檔`

## 📋 載入成功指標

- ✅ 能正確描述專案特定的 API 格式
- ✅ 了解基於 Commit 歷史的經驗教訓  
- ✅ 知道專案採用的功能導向架構
- ✅ 熟悉開發檢查清單和品質要求
- ✅ 能引用具體的規範文檔內容

---
*此檔案幫助驗證 Claude Code 是否已正確載入專案開發規範*