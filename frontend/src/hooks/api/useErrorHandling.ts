import { useState, useCallback, useRef, useMemo } from 'react'
import type { ApiError } from '@/types/api'

/**
 * 錯誤分類介面
 */
export interface ErrorClassification {
  /** 錯誤類型 */
  type: 'network' | 'server' | 'client' | 'timeout' | 'cancelled' | 'unknown'
  /** 嚴重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** 是否可恢復 */
  recoverable: boolean
  /** 用戶友善訊息 */
  userMessage: string
  /** 技術詳細訊息 */
  technicalMessage: string
  /** 建議用戶動作 */
  suggestedAction: string
  /** 是否建議重試 */
  retryable: boolean
  /** 建議重試延遲（毫秒） */
  retryDelay?: number
}

/**
 * 錯誤處理結果介面
 */
export interface ErrorHandlingResult {
  /** 錯誤分類 */
  classification: ErrorClassification
  /** 簡化的用戶訊息 */
  userMessage: string
  /** 建議動作列表 */
  suggestedActions: string[]
  /** 是否可重試 */
  canRetry: boolean
  /** 重試延遲 */
  retryDelay?: number
  /** 錯誤 ID（用於追踪） */
  errorId: string
}

/**
 * 錯誤統計介面
 */
export interface ErrorStatistics {
  /** 總錯誤數 */
  totalErrors: number
  /** 按類型分組的錯誤數 */
  errorsByType: Record<string, number>
  /** 按嚴重程度分組的錯誤數 */
  errorsBySeverity: Record<string, number>
  /** 最常見的錯誤 */
  mostCommonError: string | null
  /** 錯誤率（最近 100 個請求） */
  errorRate: number
  /** 平均恢復時間 */
  averageRecoveryTime: number
}

/**
 * 錯誤歷史記錄
 */
interface ErrorRecord {
  id: string
  timestamp: number
  classification: ErrorClassification
  resolved: boolean
  resolutionTime?: number
}

/**
 * useErrorHandling Hook 配置
 */
export interface ErrorHandlingConfig {
  /** 是否啟用錯誤統計 */
  enableStatistics?: boolean
  /** 錯誤歷史保留數量 */
  maxErrorHistory?: number
  /** 自定義錯誤分類器 */
  customClassifier?: (error: unknown) => Partial<ErrorClassification>
  /** 自定義訊息轉換器 */
  customMessageTranslator?: (classification: ErrorClassification) => string
}

/**
 * 預設錯誤處理配置
 */
const DEFAULT_CONFIG: Required<ErrorHandlingConfig> = {
  enableStatistics: true,
  maxErrorHistory: 100,
  customClassifier: () => ({}),
  customMessageTranslator: (classification) => classification.userMessage
}

/**
 * 錯誤分類邏輯
 */
const classifyError = (
  error: unknown,
  customClassifier?: (error: unknown) => Partial<ErrorClassification>
): ErrorClassification => {
  let baseClassification: ErrorClassification

  // 處理 AxiosError
  if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
    const axiosError = error as {
      isAxiosError: boolean
      code?: string
      response?: { status: number; data?: { message?: string } }
      request?: unknown
      message: string
    }
    baseClassification = classifyAxiosError(axiosError)
  }
  // 處理 ApiError
  else if (error && typeof error === 'object' && 'message' in error && 'code' in error) {
    const apiError = error as ApiError
    baseClassification = classifyApiError(apiError)
  }
  // 處理原生錯誤
  else if (error instanceof Error) {
    baseClassification = classifyNativeError(error)
  }
  // 處理未知錯誤
  else {
    baseClassification = {
      type: 'unknown',
      severity: 'medium',
      recoverable: false,
      userMessage: '發生未知錯誤，請稍後再試',
      technicalMessage: String(error),
      suggestedAction: '請重新載入頁面或聯繫技術支援',
      retryable: false
    }
  }

  // 應用自定義分類器
  if (customClassifier) {
    const customization = customClassifier(error)
    baseClassification = { ...baseClassification, ...customization }
  }

  return baseClassification
}

/**
 * 分類 AxiosError
 */
const classifyAxiosError = (error: {
  isAxiosError: boolean
  code?: string
  response?: { status: number; data?: { message?: string } }
  request?: unknown
  message: string
}): ErrorClassification => {
  const { code, response, request } = error

  // 網絡錯誤
  if (!response && request) {
    return {
      type: 'network',
      severity: 'high',
      recoverable: true,
      userMessage: '網絡連線不穩定，請檢查網絡設定後重試',
      technicalMessage: `Network error: ${code || 'Unknown network error'}`,
      suggestedAction: '檢查網絡連線並重試',
      retryable: true,
      retryDelay: 2000
    }
  }

  // 超時錯誤
  if (code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      type: 'timeout',
      severity: 'medium',
      recoverable: true,
      userMessage: '請求超時，可能因為網絡較慢或服務器負載較高',
      technicalMessage: `Request timeout: ${error.message}`,
      suggestedAction: '請稍候重試，或檢查網絡連線狀況',
      retryable: true,
      retryDelay: 3000
    }
  }

  // 取消的請求
  if (code === 'ERR_CANCELED' || error.message?.includes('canceled')) {
    return {
      type: 'cancelled',
      severity: 'low',
      recoverable: true,
      userMessage: '請求已被取消',
      technicalMessage: `Request cancelled: ${error.message}`,
      suggestedAction: '如需要，請重新發送請求',
      retryable: true,
      retryDelay: 0
    }
  }

  // HTTP 狀態碼錯誤
  if (response?.status) {
    return classifyHttpStatus(response.status, response.data?.message || error.message)
  }

  // 其他錯誤
  return {
    type: 'unknown',
    severity: 'medium',
    recoverable: false,
    userMessage: '請求處理時發生錯誤，請稍後重試',
    technicalMessage: error.message || 'Unknown axios error',
    suggestedAction: '請重試或聯繫技術支援',
    retryable: false
  }
}

/**
 * 分類 ApiError
 */
const classifyApiError = (error: ApiError): ErrorClassification => {
  const { code, message } = error

  // 根據錯誤代碼分類
  switch (code) {
    case 'NETWORK_ERROR':
      return {
        type: 'network',
        severity: 'high',
        recoverable: true,
        userMessage: '網絡連線失敗，請檢查網絡設定',
        technicalMessage: message,
        suggestedAction: '檢查網絡連線並重試',
        retryable: true,
        retryDelay: 2000
      }

    case 'TIMEOUT_ERROR':
      return {
        type: 'timeout',
        severity: 'medium',
        recoverable: true,
        userMessage: '請求超時，請稍後重試',
        technicalMessage: message,
        suggestedAction: '請等待一段時間後重試',
        retryable: true,
        retryDelay: 3000
      }

    case 'VALIDATION_ERROR':
      return {
        type: 'client',
        severity: 'low',
        recoverable: true,
        userMessage: '輸入資料格式不正確，請檢查後重新提交',
        technicalMessage: message,
        suggestedAction: '請檢查輸入資料並修正後重試',
        retryable: false
      }

    case 'AUTHORIZATION_ERROR':
      return {
        type: 'client',
        severity: 'high',
        recoverable: true,
        userMessage: '授權失效，請重新登入',
        technicalMessage: message,
        suggestedAction: '請重新登入後繼續操作',
        retryable: false
      }

    default:
      return {
        type: 'unknown',
        severity: 'medium',
        recoverable: false,
        userMessage: message || '發生未知錯誤',
        technicalMessage: message,
        suggestedAction: '請稍後重試或聯繫技術支援',
        retryable: false
      }
  }
}

/**
 * 分類原生 Error
 */
const classifyNativeError = (error: Error): ErrorClassification => {
  return {
    type: 'unknown',
    severity: 'medium',
    recoverable: false,
    userMessage: '系統錯誤，請稍後重試',
    technicalMessage: error.message,
    suggestedAction: '請重新載入頁面或聯繫技術支援',
    retryable: false
  }
}

/**
 * 根據 HTTP 狀態碼分類錯誤
 */
const classifyHttpStatus = (status: number, message?: string): ErrorClassification => {
  if (status >= 400 && status < 500) {
    // 客戶端錯誤
    const commonMessage = message || '請求格式錯誤或權限不足'
    return {
      type: 'client',
      severity: status === 401 || status === 403 ? 'high' : 'medium',
      recoverable: status === 401 || status === 403,
      userMessage: getClientErrorMessage(status),
      technicalMessage: `HTTP ${status}: ${commonMessage}`,
      suggestedAction: getClientErrorAction(status),
      retryable: false
    }
  }

  if (status >= 500) {
    // 服務器錯誤
    return {
      type: 'server',
      severity: 'high',
      recoverable: true,
      userMessage: '服務器暫時無法處理請求，請稍後重試',
      technicalMessage: `HTTP ${status}: ${message || 'Internal server error'}`,
      suggestedAction: '請等待一段時間後重試',
      retryable: true,
      retryDelay: 5000
    }
  }

  // 其他狀態碼
  return {
    type: 'unknown',
    severity: 'medium',
    recoverable: false,
    userMessage: '請求處理異常，請稍後重試',
    technicalMessage: `HTTP ${status}: ${message || 'Unknown error'}`,
    suggestedAction: '請稍後重試或聯繫技術支援',
    retryable: false
  }
}

/**
 * 取得客戶端錯誤的用戶友善訊息
 */
const getClientErrorMessage = (status: number): string => {
  switch (status) {
    case 400:
      return '請求資料格式錯誤，請檢查輸入內容'
    case 401:
      return '登入已過期，請重新登入'
    case 403:
      return '沒有權限執行此操作'
    case 404:
      return '找不到請求的資源或頁面'
    case 409:
      return '操作衝突，請稍後重試'
    case 422:
      return '輸入資料驗證失敗，請檢查後重新提交'
    case 429:
      return '請求過於頻繁，請稍後再試'
    default:
      return '請求處理失敗，請檢查輸入資料'
  }
}

/**
 * 取得客戶端錯誤的建議動作
 */
const getClientErrorAction = (status: number): string => {
  switch (status) {
    case 400:
    case 422:
      return '請檢查輸入資料格式並修正後重試'
    case 401:
      return '請重新登入後繼續操作'
    case 403:
      return '請聯繫管理員獲取相應權限'
    case 404:
      return '請確認網址正確或返回首頁'
    case 409:
      return '請稍候片刻後重新嘗試'
    case 429:
      return '請等待一分鐘後重新嘗試'
    default:
      return '請檢查操作內容或聯繫技術支援'
  }
}

/**
 * 生成唯一錯誤 ID
 */
const generateErrorId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * useErrorHandling Hook
 * 
 * 提供統一的錯誤處理、分類和統計功能
 */
export const useErrorHandling = (config: ErrorHandlingConfig = {}) => {
  const finalConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config
  }), [config])

  // 錯誤歷史記錄
  const errorHistoryRef = useRef<ErrorRecord[]>([])
  
  // 統計狀態
  const [statistics, setStatistics] = useState<ErrorStatistics>({
    totalErrors: 0,
    errorsByType: {},
    errorsBySeverity: {},
    mostCommonError: null,
    errorRate: 0,
    averageRecoveryTime: 0
  })

  /**
   * 更新錯誤統計
   */
  const updateStatistics = useCallback(() => {
    const history = errorHistoryRef.current
    const recentHistory = history.slice(-100) // 最近 100 個錯誤

    const errorsByType: Record<string, number> = {}
    const errorsBySeverity: Record<string, number> = {}
    let totalResolutionTime = 0
    let resolvedCount = 0

    recentHistory.forEach(record => {
      // 按類型統計
      errorsByType[record.classification.type] = (errorsByType[record.classification.type] || 0) + 1
      
      // 按嚴重程度統計
      errorsBySeverity[record.classification.severity] = (errorsBySeverity[record.classification.severity] || 0) + 1
      
      // 計算恢復時間
      if (record.resolved && record.resolutionTime) {
        totalResolutionTime += record.resolutionTime
        resolvedCount++
      }
    })

    // 找出最常見的錯誤
    const mostCommonError = Object.entries(errorsByType).reduce(
      (max, [type, count]) => count > max.count ? { type, count } : max,
      { type: '', count: 0 }
    ).type || null

    setStatistics({
      totalErrors: history.length,
      errorsByType,
      errorsBySeverity,
      mostCommonError,
      errorRate: recentHistory.length / Math.max(100, recentHistory.length),
      averageRecoveryTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0
    })
  }, [])

  /**
   * 處理錯誤的主要函數
   */
  const handleError = useCallback((error: unknown): ErrorHandlingResult => {
    const classification = classifyError(error, finalConfig.customClassifier)
    const errorId = generateErrorId()
    
    // 創建錯誤記錄
    const errorRecord: ErrorRecord = {
      id: errorId,
      timestamp: Date.now(),
      classification,
      resolved: false
    }

    // 更新錯誤歷史
    if (finalConfig.enableStatistics) {
      errorHistoryRef.current.push(errorRecord)
      
      // 限制歷史記錄數量
      if (errorHistoryRef.current.length > finalConfig.maxErrorHistory) {
        errorHistoryRef.current = errorHistoryRef.current.slice(-finalConfig.maxErrorHistory)
      }
      
      // 更新統計
      updateStatistics()
    }

    // 應用自定義訊息轉換
    const userMessage = finalConfig.customMessageTranslator(classification)

    // 生成建議動作列表
    const suggestedActions = [classification.suggestedAction]
    if (classification.retryable) {
      suggestedActions.unshift('點擊重試按鈕')
    }

    return {
      classification,
      userMessage,
      suggestedActions,
      canRetry: classification.retryable,
      retryDelay: classification.retryDelay,
      errorId
    }
  }, [finalConfig, updateStatistics])

  /**
   * 標記錯誤為已解決
   */
  const markErrorResolved = useCallback((errorId: string) => {
    const errorRecord = errorHistoryRef.current.find(record => record.id === errorId)
    if (errorRecord && !errorRecord.resolved) {
      errorRecord.resolved = true
      errorRecord.resolutionTime = Date.now() - errorRecord.timestamp
      
      if (finalConfig.enableStatistics) {
        updateStatistics()
      }
    }
  }, [finalConfig.enableStatistics, updateStatistics])

  /**
   * 重置錯誤統計
   */
  const resetStatistics = useCallback(() => {
    errorHistoryRef.current = []
    setStatistics({
      totalErrors: 0,
      errorsByType: {},
      errorsBySeverity: {},
      mostCommonError: null,
      errorRate: 0,
      averageRecoveryTime: 0
    })
  }, [])

  /**
   * 取得錯誤歷史
   */
  const getErrorHistory = useCallback((limit?: number): ErrorRecord[] => {
    const history = errorHistoryRef.current
    return limit ? history.slice(-limit) : [...history]
  }, [])

  /**
   * 檢查特定類型錯誤的頻率
   */
  const getErrorFrequency = useCallback((errorType: string, timeWindow: number = 300000): number => {
    const now = Date.now()
    const recentErrors = errorHistoryRef.current.filter(
      record => record.classification.type === errorType && (now - record.timestamp) <= timeWindow
    )
    return recentErrors.length
  }, [])

  return {
    handleError,
    markErrorResolved,
    resetStatistics,
    getErrorHistory,
    getErrorFrequency,
    statistics
  }
}

export default useErrorHandling