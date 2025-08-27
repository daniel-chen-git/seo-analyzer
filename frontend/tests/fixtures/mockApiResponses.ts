/**
 * Mock API 回應資料
 * 
 * 提供前端測試所需的模擬 API 回應，
 * 涵蓋成功、錯誤、載入狀態等各種情境。
 */

import type { AnalyzeResponse, AnalysisStage } from '../../src/types'

export const mockAnalyzeRequest = {
  keyword: "SEO 優化指南",
  target_audience: "網站經營者、數位行銷人員，希望提升網站搜尋排名和流量"
}

export const mockAnalyzeResponse: AnalyzeResponse = {
  status: "completed",
  result: `# SEO 優化指南分析報告

## 執行摘要
針對關鍵字「SEO 優化指南」的完整競爭對手分析已完成。

## 關鍵字競爭分析
- **搜尋量**: 高 (月搜尋量 8,100-10,000)
- **競爭強度**: 中高
- **CPC 成本**: NT$ 12-15
- **搜尋意圖**: 85% 資訊導向 + 15% 商業導向

## 內容策略建議
1. **建議標題**: "完整 SEO 優化指南：10 個提升網站排名的實戰技巧"
2. **目標字數**: 2,000-2,500 字
3. **內容結構**: 
   - 基礎概念說明 (20%)
   - 實戰操作步驟 (60%) 
   - 工具推薦與資源 (20%)

## 競爭對手分析
| 排名 | 網站 | 標題策略 | 字數 | 優勢 |
|------|------|----------|------|------|
| #1 | 網站A | 基礎教學 | 1,800 | 結構清晰 |
| #2 | 網站B | 工具導向 | 2,200 | 實用性高 |
| #3 | 網站C | 案例分析 | 1,600 | 具體範例 |

## 內容缺口分析
- **技術 SEO 深度不足**: 大多數競爭對手缺乏技術面的詳細說明
- **本地化 SEO 內容**: 針對台灣市場的在地化策略較少
- **最新趨勢整合**: Google 最新演算法更新的因應策略

## 行動建議
1. 強化技術 SEO 章節，包含 Core Web Vitals 優化
2. 加入台灣本土搜尋行為分析
3. 整合最新的 AI 搜尋趨勢 (SGE)
4. 提供可下載的 SEO 檢查清單

---
*報告生成時間: 2025-08-27 11:30:00*
*處理時間: 45 秒*`,
  stages: {
    serp: { status: "completed", duration: 8.2 },
    scraping: { status: "completed", duration: 18.5 },
    analysis: { status: "completed", duration: 22.1 }
  },
  total_duration: 48.8,
  timestamp: "2025-08-27T11:30:00Z"
}

export const mockStageUpdates: Record<AnalysisStage, any> = {
  serp: {
    status: "in_progress",
    message: "正在搜尋關鍵字相關結果...",
    progress: 30
  },
  scraping: {
    status: "in_progress", 
    message: "正在爬取競爭對手網站內容 (5/10)...",
    progress: 50
  },
  analysis: {
    status: "in_progress",
    message: "正在進行 AI 分析並生成報告...",
    progress: 80
  }
}

export const mockErrorResponse = {
  error: {
    code: "ANALYSIS_TIMEOUT",
    message: "分析處理超時，請稍後重試。",
    details: "總處理時間超過 60 秒限制"
  },
  timestamp: "2025-08-27T11:30:00Z"
}

export const mockValidationErrors = {
  keyword: {
    empty: "請輸入關鍵字",
    tooLong: "關鍵字長度不能超過 50 個字元",
    invalid: "關鍵字包含無效字元"
  },
  targetAudience: {
    empty: "請輸入目標受眾描述", 
    tooLong: "目標受眾描述不能超過 200 個字元"
  }
}