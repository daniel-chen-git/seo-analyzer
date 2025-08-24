// API 整合測試工具
// 此檔案僅用於開發階段測試，不會包含在生產建置中

import { analysisApi, healthApi } from './endpoints'
import type { AnalyzeRequest } from '@/types/api'

export const testApiIntegration = async () => {
  console.log('🧪 開始 API 整合測試...')

  try {
    // 1. 測試健康檢查
    console.log('1️⃣ 測試健康檢查端點...')
    const health = await healthApi.check()
    console.log('✅ 健康檢查:', health)

    // 2. 測試非同步分析任務建立
    console.log('2️⃣ 測試分析任務建立...')
    const request: AnalyzeRequest = {
      keyword: 'React 教學',
      audience: 'JavaScript 初學者',
      options: {
        generate_draft: true,
        include_faq: true,
        include_table: false
      }
    }

    const job = await analysisApi.createAsyncAnalysis(request)
    console.log('✅ 任務建立:', job)

    // 3. 測試任務狀態查詢
    console.log('3️⃣ 測試任務狀態查詢...')
    const status = await analysisApi.getJobStatus(job.job_id)
    console.log('✅ 任務狀態:', status)

    // 4. 輪詢直到完成 (僅用於測試)
    console.log('4️⃣ 開始輪詢任務進度...')
    let currentStatus = status
    let pollCount = 0
    const maxPolls = 30 // 最多輪詢 30 次 (約 1 分鐘)

    while (
      currentStatus.status !== 'completed' && 
      currentStatus.status !== 'failed' && 
      pollCount < maxPolls
    ) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // 等待 2 秒
      currentStatus = await analysisApi.getJobStatus(job.job_id)
      pollCount++
      
      console.log(`📊 進度 ${pollCount}/${maxPolls}:`, {
        status: currentStatus.status,
        progress: `${currentStatus.progress.percentage}%`,
        message: currentStatus.progress.message
      })
    }

    if (currentStatus.status === 'completed') {
      console.log('🎉 任務完成!', currentStatus.result)
    } else if (currentStatus.status === 'failed') {
      console.log('❌ 任務失敗:', currentStatus.error)
    } else {
      console.log('⏰ 測試超時，任務仍在進行中')
    }

    return {
      success: true,
      health,
      job,
      finalStatus: currentStatus
    }

  } catch (error) {
    console.error('❌ API 整合測試失敗:', error)
    return {
      success: false,
      error
    }
  }
}

// 快速健康檢查
export const quickHealthCheck = async () => {
  try {
    const health = await healthApi.check()
    console.log('🟢 Backend 健康狀態:', health)
    return health
  } catch (error) {
    console.error('🔴 Backend 連線失敗:', error)
    throw error
  }
}

// 僅在開發環境下掛載到 window 物件
if (import.meta.env.DEV) {
  (window as any).testAPI = {
    testApiIntegration,
    quickHealthCheck,
    analysisApi,
    healthApi
  }
}