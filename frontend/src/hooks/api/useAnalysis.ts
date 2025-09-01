import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useApiClient } from './useApiClient'
import { useErrorHandling } from './useErrorHandling'
import type { 
  AnalyzeRequest, 
  AnalyzeResponse, 
  JobCreateResponse, 
  JobStatusResponse
} from '@/types/api'
import { adaptAnalyzeResponse, isNewAnalyzeResponse } from '@/types/api'
import type { ProgressState, ProgressUpdate } from '@/types/progress'

/**
 * 分析狀態類型
 */
export type AnalysisStatus = 'idle' | 'starting' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled'

/**
 * WebSocket 連接狀態
 */
export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

/**
 * 分析配置介面
 */
export interface AnalysisConfig {
  /** 是否啟用 WebSocket 即時更新 */
  enableWebSocket?: boolean
  /** WebSocket 重連配置 */
  websocketConfig?: {
    /** 最大重連次數 */
    maxRetries?: number
    /** 重連延遲（毫秒） */
    retryDelay?: number
    /** 重連延遲倍數 */
    retryBackoff?: number
  }
  /** 輪詢配置（WebSocket 不可用時的備選方案） */
  pollingConfig?: {
    /** 是否啟用輪詢 */
    enabled?: boolean
    /** 輪詢間隔（毫秒） */
    interval?: number
    /** 最大輪詢次數 */
    maxPolls?: number
  }
  /** 自動重試失敗的分析 */
  autoRetry?: boolean
}

/**
 * 分析控制介面
 */
export interface AnalysisControls {
  /** 開始分析 */
  start: (request: AnalyzeRequest) => Promise<void>
  /** 取消分析 */
  cancel: () => Promise<void>
  /** 暫停分析 */
  pause: () => Promise<void>
  /** 恢復分析 */
  resume: () => Promise<void>
  /** 重試分析 */
  retry: () => Promise<void>
  /** 重置狀態 */
  reset: () => void
}

/**
 * 分析狀態介面
 */
export interface AnalysisState {
  /** 當前狀態 */
  status: AnalysisStatus
  /** WebSocket 連接狀態 */
  websocketStatus: WebSocketStatus
  /** 進度狀態 */
  progress: ProgressState | null
  /** 分析結果 */
  result: AnalyzeResponse | null
  /** 錯誤信息 */
  error: string | null
  /** 任務 ID */
  jobId: string | null
  /** 分析請求 */
  request: AnalyzeRequest | null
  /** 是否可以取消 */
  canCancel: boolean
  /** 是否可以暫停 */
  canPause: boolean
  /** 是否可以恢復 */
  canResume: boolean
  /** 統計信息 */
  statistics: {
    /** 分析開始時間 */
    startTime: Date | null
    /** 分析完成時間 */
    endTime: Date | null
    /** 總耗時（毫秒） */
    totalDuration: number | null
    /** WebSocket 重連次數 */
    reconnectAttempts: number
    /** 輪詢次數 */
    pollCount: number
  }
}

/**
 * WebSocket 消息類型
 */
interface WebSocketMessage {
  type: 'progress' | 'completed' | 'error' | 'paused' | 'resumed' | 'cancelled'
  job_id: string
  data?: ProgressUpdate | AnalyzeResponse | { message: string }
}

/**
 * 預設配置
 */
const DEFAULT_CONFIG: Required<AnalysisConfig> = {
  enableWebSocket: false, // 暫時禁用 WebSocket，強制使用輪詢
  websocketConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    retryBackoff: 2
  },
  pollingConfig: {
    enabled: true,
    interval: 2000,
    maxPolls: 150 // 5 分鐘最大輪詢時間
  },
  autoRetry: false
}

/**
 * 創建初始進度狀態
 */
const createInitialProgressState = (jobId: string): ProgressState => ({
  currentStage: 1,
  overallProgress: 0,
  stageProgress: 0,
  status: 'idle',
  stages: {
    serp: { 
      status: 'pending', 
      progress: 0,
      subtasks: []
    },
    crawler: { 
      status: 'pending', 
      progress: 0,
      subtasks: []
    },
    ai: { 
      status: 'pending', 
      progress: 0,
      subtasks: []
    }
  },
  timing: {
    startTime: new Date(),
    currentStageStartTime: new Date(),
    estimatedTotalTime: 0,
    estimatedRemainingTime: 0
  },
  jobId,
  canCancel: true
})

/**
 * WebSocket URL 生成
 */
const getWebSocketUrl = (jobId: string): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}/ws/progress/${jobId}`
}

/**
 * useAnalysis Hook
 * 
 * 提供完整的 SEO 分析生命週期管理，包括：
 * - WebSocket 即時進度更新
 * - 分析控制（開始/取消/暫停/恢復/重試）
 * - 錯誤處理和恢復
 * - 統計和監控
 */
export const useAnalysis = (config: AnalysisConfig = {}) => {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config])
  
  // API 客戶端和錯誤處理
  const apiClient = useApiClient({
    enableRetry: true,
    enableSmartTimeout: true
  })
  const errorHandler = useErrorHandling()
  
  // WebSocket 引用
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const pollCountRef = useRef(0)
  
  // 狀態管理
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    websocketStatus: 'disconnected',
    progress: null,
    result: null,
    error: null,
    jobId: null,
    request: null,
    canCancel: false,
    canPause: false,
    canResume: false,
    statistics: {
      startTime: null,
      endTime: null,
      totalDuration: null,
      reconnectAttempts: 0,
      pollCount: 0
    }
  })

  /**
   * 更新統計信息
   */
  const updateStatistics = useCallback((updates: Partial<AnalysisState['statistics']>) => {
    setState(prev => ({
      ...prev,
      statistics: {
        ...prev.statistics,
        ...updates
      }
    }))
  }, [])

  /**
   * 處理進度更新
   */
  const handleProgressUpdate = useCallback((update: ProgressUpdate) => {
    setState(prev => {
      if (!prev.progress) return prev
      
      const updatedProgress: ProgressState = {
        ...prev.progress,
        currentStage: update.current_stage,
        overallProgress: update.overall_progress,
        stageProgress: update.stage_progress,
        status: 'running',
        timing: {
          ...prev.progress.timing,
          estimatedRemainingTime: update.estimated_remaining
        }
      }
      
      // 更新階段狀態
      const stageKeys: Array<keyof typeof updatedProgress.stages> = ['serp', 'crawler', 'ai']
      stageKeys.forEach((key, index) => {
        const stageIndex = index + 1
        if (stageIndex < update.current_stage) {
          updatedProgress.stages[key] = {
            ...updatedProgress.stages[key],
            status: 'completed',
            progress: 100
          }
        } else if (stageIndex === update.current_stage) {
          updatedProgress.stages[key] = {
            ...updatedProgress.stages[key],
            status: 'running',
            progress: update.stage_progress
          }
          updatedProgress.timing.currentStageStartTime = new Date()
        } else {
          updatedProgress.stages[key] = {
            ...updatedProgress.stages[key],
            status: 'pending',
            progress: 0
          }
        }
      })
      
      return {
        ...prev,
        progress: updatedProgress,
        status: 'running'
      }
    })
  }, [])

  /**
   * 清理 WebSocket 連接
   */
  const cleanupWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setState(prev => ({ ...prev, websocketStatus: 'disconnected' }))
    reconnectAttemptsRef.current = 0
  }, [])

  /**
   * 清理輪詢
   */
  const clearPolling = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }
    pollCountRef.current = 0
  }, [])

  /**
   * 處理分析完成 - 雙欄位適配與狀態檢查
   * 
   * 功能作用：
   * - 使用適配器統一處理新舊格式的分析結果
   * - 檢查雙欄位狀態：status 和 success
   * - 根據 success 欄位決定最終狀態（完全成功 vs 部分成功）
   * - 自動清理 WebSocket 和輪詢資源
   * 
   * @param rawResult 原始分析結果（可能是新舊任一格式）
   */
  const handleAnalysisComplete = useCallback((rawResult: unknown) => {
    const endTime = new Date()
    
    // 使用適配器確保結果為新的扁平格式
    const result = adaptAnalyzeResponse(rawResult)
    
    // 雙欄位狀態檢查：根據 success 欄位決定最終狀態
    const finalStatus: AnalysisStatus = result.success ? 'completed' : 'completed'
    // 注意：即使 success 為 false，我們仍然標記為 'completed'，因為 API 調用成功了
    // 前端可以通過 result.success 欄位來區分完全成功和部分成功
    
    console.log('🎉 分析完成，雙欄位狀態:', {
      status: result.status,      // API 契約欄位
      success: result.success,    // 業務狀態欄位
      finalStatus,
      isNewFormat: isNewAnalyzeResponse(rawResult)
    })
    
    setState(prev => ({
      ...prev,
      status: finalStatus,
      result,
      error: null,
      canCancel: false,
      canPause: false,
      canResume: false,
      progress: prev.progress ? {
        ...prev.progress,
        overallProgress: 100,
        stageProgress: 100,
        status: 'completed',
        stages: {
          serp: { ...prev.progress.stages.serp, status: 'completed', progress: 100 },
          crawler: { ...prev.progress.stages.crawler, status: 'completed', progress: 100 },
          ai: { ...prev.progress.stages.ai, status: 'completed', progress: 100 }
        }
      } : null,
      statistics: {
        ...prev.statistics,
        endTime,
        totalDuration: prev.statistics.startTime ? endTime.getTime() - prev.statistics.startTime.getTime() : null
      }
    }))
    
    // 清理資源
    cleanupWebSocket()
    clearPolling()
  }, [cleanupWebSocket, clearPolling])

  /**
   * 處理分析錯誤
   */
  const handleAnalysisError = useCallback((errorMessage: string) => {
    const errorResult = errorHandler.handleError(new Error(errorMessage))
    
    setState(prev => ({
      ...prev,
      status: 'error',
      error: errorResult.userMessage,
      canCancel: false,
      canPause: false,
      canResume: false,
      progress: prev.progress ? {
        ...prev.progress,
        status: 'error'
      } : null
    }))
    
    // 清理資源
    cleanupWebSocket()
    clearPolling()
  }, [errorHandler, cleanupWebSocket, clearPolling])

  /**
   * WebSocket 消息處理
   */
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'progress':
        if (message.data && 'current_stage' in message.data) {
          handleProgressUpdate(message.data as ProgressUpdate)
        }
        break
        
      case 'completed':
        if (message.data) {
          // WebSocket 訊息中的完成資料，可能是新舊任一格式
          handleAnalysisComplete(message.data)
        }
        break
        
      case 'error':
        if (message.data && 'message' in message.data) {
          handleAnalysisError((message.data as { message: string }).message)
        }
        break
        
      case 'paused':
        setState(prev => ({
          ...prev,
          status: 'paused',
          canPause: false,
          canResume: true
        }))
        break
        
      case 'resumed':
        setState(prev => ({
          ...prev,
          status: 'running',
          canPause: true,
          canResume: false
        }))
        break
        
      case 'cancelled':
        setState(prev => ({
          ...prev,
          status: 'cancelled',
          canCancel: false,
          canPause: false,
          canResume: false,
          progress: prev.progress ? {
            ...prev.progress,
            status: 'cancelled'
          } : null
        }))
        cleanupWebSocket()
        clearPolling()
        break
    }
  }, [handleProgressUpdate, handleAnalysisComplete, handleAnalysisError, cleanupWebSocket, clearPolling])

  /**
   * WebSocket 連接管理
   */
  const connectWebSocket = useCallback((jobId: string) => {
    if (!finalConfig.enableWebSocket) return
    
    cleanupWebSocket()
    
    setState(prev => ({ ...prev, websocketStatus: 'connecting' }))
    
    try {
      const ws = new WebSocket(getWebSocketUrl(jobId))
      wsRef.current = ws
      
      ws.onopen = () => {
        setState(prev => ({ ...prev, websocketStatus: 'connected' }))
        reconnectAttemptsRef.current = 0
      }
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      ws.onclose = (event) => {
        wsRef.current = null
        setState(prev => ({ ...prev, websocketStatus: 'disconnected' }))
        
        // 自動重連（如果不是正常關閉）
        if (event.code !== 1000 && reconnectAttemptsRef.current < finalConfig.websocketConfig.maxRetries!) {
          reconnectAttemptsRef.current++
          updateStatistics({ reconnectAttempts: reconnectAttemptsRef.current })
          
          const delay = finalConfig.websocketConfig.retryDelay! * 
            Math.pow(finalConfig.websocketConfig.retryBackoff!, reconnectAttemptsRef.current - 1)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket(jobId)
          }, delay)
        } else if (finalConfig.pollingConfig.enabled!) {
          // WebSocket 重連失敗，啟用輪詢
          startPolling(jobId)
        }
      }
      
      ws.onerror = () => {
        setState(prev => ({ ...prev, websocketStatus: 'error' }))
      }
      
    } catch {
      setState(prev => ({ ...prev, websocketStatus: 'error' }))
      if (finalConfig.pollingConfig.enabled) {
        startPolling(jobId)
      }
    }
  }, [finalConfig, cleanupWebSocket, handleWebSocketMessage, updateStatistics])

  /**
   * 輪詢狀態更新
   */
  const startPolling = useCallback((jobId: string) => {
    console.log('🔄 開始輪詢任務狀態:', jobId)
    if (!finalConfig.pollingConfig.enabled) {
      console.log('❌ 輪詢已禁用')
      return
    }
    if (pollCountRef.current >= finalConfig.pollingConfig.maxPolls!) {
      console.log('❌ 達到最大輪詢次數限制')
      return
    }
    
    const poll = async () => {
      try {
        pollCountRef.current++
        updateStatistics({ pollCount: pollCountRef.current })
        
        console.log(`📡 輪詢第 ${pollCountRef.current} 次，查詢任務: ${jobId}`)
        const response = await apiClient.get<JobStatusResponse>(`/api/status/${jobId}`)
        const data = response.data
        
        console.log('📊 輪詢回應:', { status: data.status, progress: data.progress })
        
        if (data.status === 'completed' && data.result) {
          // 輪詢取得的完成結果，可能是新舊任一格式
          handleAnalysisComplete(data.result)
        } else if (data.status === 'failed' && data.error) {
          handleAnalysisError(data.error)
        } else if (data.status === 'processing' && data.progress) {
          // 轉換 JobProgress 到 ProgressUpdate - 修復格式匹配問題
          // 計算當前階段的進度：將整體進度映射到當前階段的進度
          const stageProgress = Math.min(100, Math.max(0, 
            ((data.progress.percentage - (data.progress.current_step - 1) * 33.33) / 33.33) * 100
          ))
          
          const progressUpdate: ProgressUpdate = {
            current_stage: data.progress.current_step as 1 | 2 | 3, // 直接使用後端的階段數
            overall_progress: data.progress.percentage, // 直接使用後端的整體進度
            stage_progress: stageProgress, // 計算當前階段的進度百分比
            estimated_remaining: 0 // API 未提供此數據
          }
          
          // 輸出進度資訊以供調試
          console.log('Progress Update:', {
            stage: data.progress.current_step,
            message: data.progress.message,
            overall: data.progress.percentage,
            stage_progress: stageProgress
          })
          
          handleProgressUpdate(progressUpdate)
          
          // 繼續輪詢
          if (pollCountRef.current < finalConfig.pollingConfig.maxPolls!) {
            pollingTimeoutRef.current = setTimeout(poll, finalConfig.pollingConfig.interval!)
          }
        }
      } catch (error) {
        const errorResult = errorHandler.handleError(error)
        handleAnalysisError(errorResult.userMessage)
      }
    }
    
    pollingTimeoutRef.current = setTimeout(poll, finalConfig.pollingConfig.interval!)
  }, [finalConfig, apiClient, handleAnalysisComplete, handleAnalysisError, handleProgressUpdate, errorHandler, updateStatistics])

  /**
   * 開始分析
   */
  const start = useCallback(async (request: AnalyzeRequest) => {
    console.log('🎯 開始分析:', { request, currentStatus: state.status })
    
    if (state.status === 'running' || state.status === 'starting') {
      console.log('❌ 分析已在進行中:', state.status)
      throw new Error('Analysis is already running')
    }
    
    console.log('⚙️ 使用配置:', finalConfig)
    
    try {
      const startTime = new Date()
      
      setState(prev => ({
        ...prev,
        status: 'starting',
        error: null,
        result: null,
        request,
        statistics: {
          ...prev.statistics,
          startTime,
          endTime: null,
          totalDuration: null,
          reconnectAttempts: 0,
          pollCount: 0
        }
      }))
      
      // 創建非同步分析任務
      const jobResponse = await apiClient.post<JobCreateResponse>('/api/analyze-async', request)
      const jobId = jobResponse.data.job_id
      
      // 更新狀態
      setState(prev => ({
        ...prev,
        status: 'running',
        jobId,
        progress: createInitialProgressState(jobId),
        canCancel: true,
        canPause: true,
        canResume: false
      }))
      
      // 啟動進度監控
      console.log('🚀 啟動進度監控:', { 
        enableWebSocket: finalConfig.enableWebSocket, 
        pollingEnabled: finalConfig.pollingConfig.enabled,
        jobId 
      })
      
      if (finalConfig.enableWebSocket) {
        console.log('📡 使用 WebSocket 監控')
        connectWebSocket(jobId)
      } else if (finalConfig.pollingConfig.enabled) {
        console.log('🔄 使用輪詢監控')
        startPolling(jobId)
      } else {
        console.log('❌ 沒有啟用任何進度監控方式')
      }
      
    } catch (error) {
      const errorResult = errorHandler.handleError(error)
      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorResult.userMessage
      }))
      throw error
    }
  }, [state.status, apiClient, errorHandler, finalConfig, connectWebSocket, startPolling])

  /**
   * 取消分析
   */
  const cancel = useCallback(async () => {
    if (!state.jobId || !state.canCancel) return
    
    try {
      // TODO: 實作取消端點
      // await apiClient.post(`/api/cancel/${state.jobId}`)
      console.warn('取消功能尚未實作')
      
      setState(prev => ({
        ...prev,
        status: 'cancelled',
        canCancel: false,
        canPause: false,
        canResume: false,
        progress: prev.progress ? {
          ...prev.progress,
          status: 'cancelled'
        } : null
      }))
      
      cleanupWebSocket()
      clearPolling()
      
    } catch (error) {
      const errorResult = errorHandler.handleError(error)
      setState(prev => ({ ...prev, error: errorResult.userMessage }))
      throw error
    }
  }, [state.jobId, state.canCancel, apiClient, errorHandler, cleanupWebSocket, clearPolling])

  /**
   * 暫停分析
   */
  const pause = useCallback(async () => {
    if (!state.jobId || !state.canPause) return
    
    try {
      // TODO: 實作暫停端點
      // await apiClient.post(`/api/pause/${state.jobId}`)
      console.warn('暫停功能尚未實作')
      
      setState(prev => ({
        ...prev,
        status: 'paused',
        canPause: false,
        canResume: true
      }))
      
    } catch (error) {
      const errorResult = errorHandler.handleError(error)
      setState(prev => ({ ...prev, error: errorResult.userMessage }))
      throw error
    }
  }, [state.jobId, state.canPause, apiClient, errorHandler])

  /**
   * 恢復分析
   */
  const resume = useCallback(async () => {
    if (!state.jobId || !state.canResume) return
    
    try {
      // TODO: 實作恢復端點
      // await apiClient.post(`/api/resume/${state.jobId}`)
      console.warn('恢復功能尚未實作')
      
      setState(prev => ({
        ...prev,
        status: 'running',
        canPause: true,
        canResume: false
      }))
      
    } catch (error) {
      const errorResult = errorHandler.handleError(error)
      setState(prev => ({ ...prev, error: errorResult.userMessage }))
      throw error
    }
  }, [state.jobId, state.canResume, apiClient, errorHandler])

  /**
   * 重試分析
   */
  const retry = useCallback(async () => {
    if (!state.request) return
    
    // 重置狀態並重新開始
    cleanupWebSocket()
    clearPolling()
    
    setState({
      status: 'idle',
      websocketStatus: 'disconnected',
      progress: null,
      result: null,
      error: null,
      jobId: null,
      request: null,
      canCancel: false,
      canPause: false,
      canResume: false,
      statistics: {
        startTime: null,
        endTime: null,
        totalDuration: null,
        pollCount: 0,
        reconnectAttempts: 0
      }
    })
    
    pollCountRef.current = 0
    reconnectAttemptsRef.current = 0
    
    await start(state.request)
  }, [state.request, start, cleanupWebSocket, clearPolling])

  /**
   * 重置狀態
   */
  const reset = useCallback(() => {
    cleanupWebSocket()
    clearPolling()
    
    setState({
      status: 'idle',
      websocketStatus: 'disconnected',
      progress: null,
      result: null,
      error: null,
      jobId: null,
      request: null,
      canCancel: false,
      canPause: false,
      canResume: false,
      statistics: {
        startTime: null,
        endTime: null,
        totalDuration: null,
        reconnectAttempts: 0,
        pollCount: 0
      }
    })
  }, [cleanupWebSocket, clearPolling])

  // 組件卸載時清理資源
  useEffect(() => {
    return () => {
      cleanupWebSocket()
      clearPolling()
    }
  }, [cleanupWebSocket, clearPolling])

  // 控制介面
  const controls: AnalysisControls = useMemo(() => ({
    start,
    cancel,
    pause,
    resume,
    retry,
    reset
  }), [start, cancel, pause, resume, retry, reset])

  return {
    ...state,
    controls,
    // 便利方法
    isIdle: state.status === 'idle',
    isRunning: state.status === 'running',
    isPaused: state.status === 'paused',
    isCompleted: state.status === 'completed',
    isError: state.status === 'error',
    isCancelled: state.status === 'cancelled',
    hasResult: !!state.result,
    hasError: !!state.error
  }
}

export default useAnalysis