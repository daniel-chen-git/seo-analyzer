import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import type { ApiError } from '@/types/api'

// 擴展 AxiosRequestConfig 以支援 metadata
declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      startTime: number
    }
  }
}

// 重試配置介面
export interface RetryConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryCondition: (error: ApiError) => boolean
}

// 攔截器配置介面
export interface InterceptorConfig {
  requestInterceptors?: Array<{
    onFulfilled?: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>
    onRejected?: (error: unknown) => unknown
  }>
  responseInterceptors?: Array<{
    onFulfilled?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>
    onRejected?: (error: unknown) => unknown
  }>
}

// 智慧超時配置介面
export interface TimeoutConfig {
  default: number           // 預設超時時間
  min: number              // 最小超時時間
  max: number              // 最大超時時間
  adaptive: boolean        // 是否啟用自適應超時
  adaptiveMultiplier: number // 自適應倍數（基於歷史響應時間）
}

// API 客戶端配置介面
export interface ApiClientConfig {
  baseURL?: string
  timeout?: number
  timeoutConfig?: TimeoutConfig
  retryConfig?: RetryConfig
  interceptors?: InterceptorConfig
  enableRetry?: boolean
  enableInterceptors?: boolean
  enableSmartTimeout?: boolean
}

// API 客戶端狀態介面
export interface ApiClientState {
  isConfigured: boolean
  activeRequests: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  avgResponseTime: number
  currentTimeout: number
  timeoutAdjustments: number
}

// 預設重試配置
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1秒
  maxDelay: 30000,    // 30秒
  backoffMultiplier: 2,
  retryCondition: (error: ApiError) => {
    // 重試條件：網絡錯誤或 5xx 伺服器錯誤
    return error.code === 'NETWORK_ERROR' || 
           (error.code?.startsWith('HTTP_5') ?? false)
  }
}

// 預設超時配置
const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  default: 30000,          // 30秒預設超時
  min: 5000,               // 最小5秒
  max: 120000,             // 最大2分鐘
  adaptive: true,          // 啟用自適應
  adaptiveMultiplier: 2.5  // 響應時間的2.5倍作為超時
}

// 預設 API 客戶端配置
const DEFAULT_CONFIG: ApiClientConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  timeoutConfig: DEFAULT_TIMEOUT_CONFIG,
  retryConfig: DEFAULT_RETRY_CONFIG,
  enableRetry: true,
  enableInterceptors: true,
  enableSmartTimeout: true
}

/**
 * useApiClient Hook
 * 提供企業級的 HTTP 客戶端功能
 * 
 * 特色功能：
 * - 自動重試機制（指數退避）
 * - 請求/響應攔截器
 * - 智慧超時管理
 * - 請求統計和監控
 */
export const useApiClient = (config: ApiClientConfig = {}) => {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config])
  
  // 稳定化interceptors引用，避免无限循环
  const stableInterceptors = useMemo(() => mergedConfig.interceptors, [mergedConfig.interceptors?.requestInterceptors, mergedConfig.interceptors?.responseInterceptors])
  
  // 狀態管理
  const [state, setState] = useState<ApiClientState>({
    isConfigured: false,
    activeRequests: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    currentTimeout: mergedConfig.timeoutConfig?.default || mergedConfig.timeout || 30000,
    timeoutAdjustments: 0
  })

  // Axios 實例引用
  const clientRef = useRef<AxiosInstance | null>(null)
  const responseTimesRef = useRef<number[]>([])
  
  // 請求取消控制器管理
  const cancelTokensRef = useRef<Map<string, AbortController>>(new Map())

  // 計算智慧超時時間
  const calculateSmartTimeout = useCallback((url?: string): number => {
    const timeoutConfig = mergedConfig.timeoutConfig || DEFAULT_TIMEOUT_CONFIG
    
    // 如果未啟用智慧超時，返回預設值
    if (!mergedConfig.enableSmartTimeout || !timeoutConfig.adaptive) {
      return timeoutConfig.default
    }
    
    // 如果沒有歷史數據，使用預設超時
    if (responseTimesRef.current.length < 3) {
      return timeoutConfig.default
    }
    
    // 計算基於歷史響應時間的智慧超時
    const avgResponseTime = responseTimesRef.current.reduce((sum, time) => sum + time, 0) / 
                           responseTimesRef.current.length
    
    const adaptiveTimeout = Math.round(avgResponseTime * timeoutConfig.adaptiveMultiplier)
    
    // 確保超時時間在合理範圍內
    const smartTimeout = Math.max(
      timeoutConfig.min,
      Math.min(timeoutConfig.max, adaptiveTimeout)
    )
    
    // 特定端點超時調整（可根據需要擴展）
    if (url?.includes('/analyze-async') || url?.includes('/analyze')) {
      return Math.max(smartTimeout, 60000) // SEO 分析至少 60 秒
    }
    
    return smartTimeout
  }, [mergedConfig.timeoutConfig, mergedConfig.enableSmartTimeout])

  // 計算平均響應時間並更新智慧超時
  const updateAvgResponseTime = useCallback((responseTime: number) => {
    responseTimesRef.current.push(responseTime)
    
    // 保持最近 50 個請求的響應時間
    if (responseTimesRef.current.length > 50) {
      responseTimesRef.current = responseTimesRef.current.slice(-50)
    }
    
    const avg = responseTimesRef.current.reduce((sum, time) => sum + time, 0) / 
                responseTimesRef.current.length
    
    // 更新當前超時時間
    const newTimeout = calculateSmartTimeout()
    
    setState(prev => ({
      ...prev,
      avgResponseTime: Math.round(avg),
      currentTimeout: newTimeout,
      timeoutAdjustments: prev.currentTimeout !== newTimeout ? prev.timeoutAdjustments + 1 : prev.timeoutAdjustments
    }))
  }, [calculateSmartTimeout])

  // 更新請求統計
  const updateRequestStats = useCallback((success: boolean, responseTime?: number) => {
    setState(prev => ({
      ...prev,
      totalRequests: prev.totalRequests + 1,
      successfulRequests: success ? prev.successfulRequests + 1 : prev.successfulRequests,
      failedRequests: success ? prev.failedRequests : prev.failedRequests + 1,
      activeRequests: prev.activeRequests - 1
    }))
    
    if (success && responseTime) {
      updateAvgResponseTime(responseTime)
    }
  }, [updateAvgResponseTime])

  // 指數退避延遲計算
  const calculateRetryDelay = useCallback((attempt: number, config: RetryConfig): number => {
    const delay = Math.min(
      config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
      config.maxDelay
    )
    
    // 添加隨機抖動 (±25%) 避免雷群效應
    const jitter = delay * 0.25 * (Math.random() - 0.5)
    return Math.max(100, delay + jitter) // 最小 100ms
  }, [])

  // 睡眠函數
  const sleep = useCallback((ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }, [])

  // 執行重試的核心邏輯
  const executeWithRetry = useCallback(async <T>(
    requestFn: () => Promise<T>,
    retryConfig: RetryConfig
  ): Promise<T> => {
    let lastError: ApiError | null = null
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error) {
        const apiError = error as ApiError
        lastError = apiError
        
        // 最後一次嘗試失敗
        if (attempt === retryConfig.maxRetries) {
          break
        }
        
        // 檢查是否滿足重試條件
        if (!retryConfig.retryCondition(apiError)) {
          break
        }
        
        // 計算延遲並等待
        const delay = calculateRetryDelay(attempt, retryConfig)
        console.warn(`請求失敗，${delay}ms 後進行第 ${attempt + 1} 次重試:`, apiError.message)
        await sleep(delay)
      }
    }
    
    throw lastError
  }, [calculateRetryDelay, sleep])

  // 設置請求攔截器
  const setupRequestInterceptors = useCallback((client: AxiosInstance) => {
    // 預設請求攔截器：添加時間戳和請求 ID
    client.interceptors.request.use(
      (config) => {
        // 添加請求開始時間（用於計算響應時間）
        config.metadata = { startTime: Date.now() }
        
        // 添加請求 ID（用於日誌追踪）
        config.headers = {
          ...config.headers,
          'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
        
        console.debug(`[API] 發起請求: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('[API] 請求攔截器錯誤:', error)
        return Promise.reject(error)
      }
    )

    // 用戶自定義請求攔截器
    if (stableInterceptors?.requestInterceptors) {
      stableInterceptors.requestInterceptors.forEach(interceptor => {
        client.interceptors.request.use(
          interceptor.onFulfilled,
          interceptor.onRejected
        )
      })
    }
  }, [stableInterceptors])

  // 設置響應攔截器
  const setupResponseInterceptors = useCallback((client: AxiosInstance) => {
    // 預設響應攔截器：日誌和統計
    client.interceptors.response.use(
      (response) => {
        const responseTime = Date.now() - (response.config.metadata?.startTime || Date.now())
        const requestId = response.config.headers?.['X-Request-ID']
        
        console.debug(
          `[API] 請求成功: ${response.config.method?.toUpperCase()} ${response.config.url}`,
          `(${responseTime}ms, ID: ${requestId})`
        )
        
        return response
      },
      (error) => {
        const axiosError = error as AxiosError
        const responseTime = Date.now() - (axiosError.config?.metadata?.startTime || Date.now())
        const requestId = axiosError.config?.headers?.['X-Request-ID']
        
        console.error(
          `[API] 請求失敗: ${axiosError.config?.method?.toUpperCase()} ${axiosError.config?.url}`,
          `(${responseTime}ms, ID: ${requestId})`,
          `Status: ${axiosError.response?.status}, Message: ${axiosError.message}`
        )
        
        return Promise.reject(error)
      }
    )

    // 用戶自定義響應攔截器
    if (stableInterceptors?.responseInterceptors) {
      stableInterceptors.responseInterceptors.forEach(interceptor => {
        client.interceptors.response.use(
          interceptor.onFulfilled,
          interceptor.onRejected
        )
      })
    }
  }, [stableInterceptors])

  // 初始化 Axios 客戶端
  const initializeClient = useCallback(() => {
    const client = axios.create({
      baseURL: mergedConfig.baseURL,
      timeout: mergedConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
      }
    })

    // 設置攔截器
    if (mergedConfig.enableInterceptors) {
      setupRequestInterceptors(client)
      setupResponseInterceptors(client)
    }

    clientRef.current = client
    setState(prev => ({ ...prev, isConfigured: true }))

    return client
  }, [
    mergedConfig.baseURL, 
    mergedConfig.timeout, 
    mergedConfig.enableInterceptors,
    setupRequestInterceptors, 
    setupResponseInterceptors
  ])

  // 初始化客戶端（只在未配置時執行）
  useEffect(() => {
    if (!state.isConfigured) {
      initializeClient()
    }
  }, [initializeClient, state.isConfigured])

  // 獲取客戶端實例
  const getClient = useCallback((): AxiosInstance => {
    if (!clientRef.current) {
      return initializeClient()
    }
    return clientRef.current
  }, [initializeClient])

  // 創建請求取消控制器
  const createCancelToken = useCallback((requestId: string): AbortController => {
    const controller = new AbortController()
    cancelTokensRef.current.set(requestId, controller)
    
    // 自動清理（請求完成或超時後）
    setTimeout(() => {
      cancelTokensRef.current.delete(requestId)
    }, 300000) // 5分鐘後清理
    
    return controller
  }, [])

  // 取消指定請求
  const cancelRequest = useCallback((requestId: string): boolean => {
    const controller = cancelTokensRef.current.get(requestId)
    if (controller) {
      controller.abort()
      cancelTokensRef.current.delete(requestId)
      console.debug(`[API] 請求已取消: ${requestId}`)
      return true
    }
    return false
  }, [])

  // 取消所有活躍請求
  const cancelAllRequests = useCallback((): number => {
    const activeCount = cancelTokensRef.current.size
    cancelTokensRef.current.forEach((controller, requestId) => {
      controller.abort()
      console.debug(`[API] 批量取消請求: ${requestId}`)
    })
    cancelTokensRef.current.clear()
    return activeCount
  }, [])

  // 企業級請求包裝器
  const request = useCallback(async <T>(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    const client = getClient()
    const startTime = Date.now()
    const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`
    
    // 創建取消令牌
    const cancelController = createCancelToken(requestId)
    
    // 計算智慧超時
    const smartTimeout = calculateSmartTimeout(config.url)
    
    // 合併配置，包含取消令牌和智慧超時
    const mergedRequestConfig: AxiosRequestConfig = {
      ...config,
      signal: cancelController.signal,
      timeout: smartTimeout,
      metadata: { startTime }
    }
    
    // 更新活躍請求數
    setState(prev => ({ ...prev, activeRequests: prev.activeRequests + 1 }))
    
    const requestFunction = async () => {
      try {
        const response = await client.request<T>(mergedRequestConfig)
        const responseTime = Date.now() - startTime
        updateRequestStats(true, responseTime)
        
        // 清理取消令牌
        cancelTokensRef.current.delete(requestId)
        
        return response
      } catch (error) {
        // 清理取消令牌
        cancelTokensRef.current.delete(requestId)
        
        const axiosError = error as AxiosError
        updateRequestStats(false)
        
        // 處理取消請求
        if (cancelController.signal.aborted) {
          const cancelError: ApiError = {
            message: '請求已被取消',
            code: 'REQUEST_CANCELLED',
            details: { requestId, cancelled: true }
          }
          throw cancelError
        }
        
        // 統一錯誤格式轉換
        const apiError: ApiError = {
          message: axiosError.response?.statusText || axiosError.message || '請求失敗',
          code: axiosError.code || `HTTP_${axiosError.response?.status || 'UNKNOWN'}`,
          details: {
            requestId,
            status: axiosError.response?.status,
            data: axiosError.response?.data,
            config: axiosError.config,
            timeout: smartTimeout
          }
        }
        
        throw apiError
      }
    }

    // 根據配置決定是否使用重試機制
    if (mergedConfig.enableRetry && mergedConfig.retryConfig) {
      return executeWithRetry(requestFunction, mergedConfig.retryConfig)
    } else {
      return requestFunction()
    }
  }, [getClient, createCancelToken, calculateSmartTimeout, updateRequestStats, executeWithRetry, mergedConfig])

  // 便捷方法：GET 請求
  const get = useCallback(<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return request<T>({ ...config, method: 'GET', url })
  }, [request])

  // 便捷方法：POST 請求
  const post = useCallback(<T>(
    url: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    return request<T>({ ...config, method: 'POST', url, data })
  }, [request])

  // 便捷方法：PUT 請求
  const put = useCallback(<T>(
    url: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    return request<T>({ ...config, method: 'PUT', url, data })
  }, [request])

  // 便捷方法：DELETE 請求
  const del = useCallback(<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return request<T>({ ...config, method: 'DELETE', url })
  }, [request])

  // 重置統計數據
  const resetStats = useCallback(() => {
    setState(prev => ({
      ...prev,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0
    }))
    responseTimesRef.current = []
  }, [])

  return {
    // 核心方法
    request,
    get,
    post,
    put,
    delete: del,
    
    // 客戶端管理
    getClient,
    resetStats,
    
    // 請求控制
    cancelRequest,
    cancelAllRequests,
    
    // 狀態
    ...state,
    
    // 配置
    config: mergedConfig,
    
    // 統計方法
    getActiveRequestsCount: () => cancelTokensRef.current.size,
    getResponseTimeHistory: () => [...responseTimesRef.current]
  }
}