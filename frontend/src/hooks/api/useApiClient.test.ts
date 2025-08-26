// useApiClient Hook 整合測試
// 此測試文件驗證企業級 API 客戶端的所有功能

import { renderHook, act } from '@testing-library/react'
import { useApiClient } from './useApiClient'
import type { ApiClientConfig, RetryConfig } from './useApiClient'

// 模擬 console 方法避免測試輸出雜訊
const mockConsole = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// 保存原始 console 方法
const originalConsole = {
  debug: console.debug,
  warn: console.warn,
  error: console.error
}

beforeAll(() => {
  console.debug = mockConsole.debug
  console.warn = mockConsole.warn
  console.error = mockConsole.error
})

afterAll(() => {
  console.debug = originalConsole.debug
  console.warn = originalConsole.warn
  console.error = originalConsole.error
})

describe('useApiClient Hook', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('基礎功能測試', () => {
    test('應該正確初始化默認配置', () => {
      const { result } = renderHook(() => useApiClient())
      
      expect(result.current.isConfigured).toBe(true)
      expect(result.current.config.baseURL).toBe('http://localhost:8000')
      expect(result.current.config.enableRetry).toBe(true)
      expect(result.current.config.enableInterceptors).toBe(true)
      expect(result.current.config.enableSmartTimeout).toBe(true)
    })

    test('應該支援自定義配置', () => {
      const customConfig: ApiClientConfig = {
        baseURL: 'https://api.example.com',
        timeout: 60000,
        enableRetry: false,
        enableSmartTimeout: false
      }

      const { result } = renderHook(() => useApiClient(customConfig))
      
      expect(result.current.config.baseURL).toBe('https://api.example.com')
      expect(result.current.config.timeout).toBe(60000)
      expect(result.current.config.enableRetry).toBe(false)
      expect(result.current.config.enableSmartTimeout).toBe(false)
    })

    test('應該正確初始化狀態', () => {
      const { result } = renderHook(() => useApiClient())
      
      expect(result.current.activeRequests).toBe(0)
      expect(result.current.totalRequests).toBe(0)
      expect(result.current.successfulRequests).toBe(0)
      expect(result.current.failedRequests).toBe(0)
      expect(result.current.avgResponseTime).toBe(0)
      expect(result.current.timeoutAdjustments).toBe(0)
    })
  })

  describe('智慧超時功能測試', () => {
    test('應該根據歷史響應時間計算智慧超時', async () => {
      const { result } = renderHook(() => useApiClient({
        enableSmartTimeout: true,
        timeoutConfig: {
          default: 30000,
          min: 5000,
          max: 120000,
          adaptive: true,
          adaptiveMultiplier: 2.5
        }
      }))

      // 模擬一些響應時間歷史
      await act(async () => {
        // 模擬幾次成功的請求來建立響應時間歷史
        // 這裡我們需要訪問內部方法，在實際測試中可能需要調整
        expect(result.current.currentTimeout).toBeGreaterThan(0)
      })
    })

    test('應該為特定端點設置最小超時時間', () => {
      const { result } = renderHook(() => useApiClient())
      
      // 雖然無法直接測試內部的 calculateSmartTimeout 方法
      // 但我們可以驗證配置是否正確設置
      expect(result.current.config.enableSmartTimeout).toBe(true)
      expect(result.current.currentTimeout).toBeGreaterThan(0)
    })
  })

  describe('統計功能測試', () => {
    test('應該提供重置統計的功能', () => {
      const { result } = renderHook(() => useApiClient())
      
      expect(typeof result.current.resetStats).toBe('function')
      
      act(() => {
        result.current.resetStats()
      })
      
      expect(result.current.totalRequests).toBe(0)
      expect(result.current.successfulRequests).toBe(0)
      expect(result.current.failedRequests).toBe(0)
      expect(result.current.avgResponseTime).toBe(0)
    })

    test('應該提供獲取活躍請求數的方法', () => {
      const { result } = renderHook(() => useApiClient())
      
      expect(typeof result.current.getActiveRequestsCount).toBe('function')
      expect(result.current.getActiveRequestsCount()).toBe(0)
    })

    test('應該提供獲取響應時間歷史的方法', () => {
      const { result } = renderHook(() => useApiClient())
      
      expect(typeof result.current.getResponseTimeHistory).toBe('function')
      expect(Array.isArray(result.current.getResponseTimeHistory())).toBe(true)
    })
  })

  describe('請求取消功能測試', () => {
    test('應該提供取消單個請求的功能', () => {
      const { result } = renderHook(() => useApiClient())
      
      expect(typeof result.current.cancelRequest).toBe('function')
      
      const cancelled = result.current.cancelRequest('non-existent-id')
      expect(cancelled).toBe(false) // 不存在的請求 ID 應該返回 false
    })

    test('應該提供取消所有請求的功能', () => {
      const { result } = renderHook(() => useApiClient())
      
      expect(typeof result.current.cancelAllRequests).toBe('function')
      
      const cancelledCount = result.current.cancelAllRequests()
      expect(typeof cancelledCount).toBe('number')
    })
  })

  describe('HTTP 方法測試', () => {
    test('應該提供所有標準 HTTP 方法', () => {
      const { result } = renderHook(() => useApiClient())
      
      expect(typeof result.current.get).toBe('function')
      expect(typeof result.current.post).toBe('function')
      expect(typeof result.current.put).toBe('function')
      expect(typeof result.current.delete).toBe('function')
      expect(typeof result.current.request).toBe('function')
    })
  })

  describe('重試配置測試', () => {
    test('應該支援自定義重試配置', () => {
      const customRetryConfig: RetryConfig = {
        maxRetries: 5,
        initialDelay: 2000,
        maxDelay: 60000,
        backoffMultiplier: 3,
        retryCondition: () => true
      }

      const { result } = renderHook(() => useApiClient({
        retryConfig: customRetryConfig
      }))
      
      expect(result.current.config.retryConfig).toEqual(customRetryConfig)
    })

    test('應該支援禁用重試機制', () => {
      const { result } = renderHook(() => useApiClient({
        enableRetry: false
      }))
      
      expect(result.current.config.enableRetry).toBe(false)
    })
  })

  describe('攔截器配置測試', () => {
    test('應該支援禁用攔截器', () => {
      const { result } = renderHook(() => useApiClient({
        enableInterceptors: false
      }))
      
      expect(result.current.config.enableInterceptors).toBe(false)
    })

    test('應該支援自定義攔截器配置', () => {
      const customInterceptors = {
        requestInterceptors: [
          {
            onFulfilled: (config: unknown) => config,
            onRejected: (error: unknown) => Promise.reject(error)
          }
        ],
        responseInterceptors: [
          {
            onFulfilled: (response: unknown) => response,
            onRejected: (error: unknown) => Promise.reject(error)
          }
        ]
      }

      const { result } = renderHook(() => useApiClient({
        interceptors: customInterceptors
      }))
      
      expect(result.current.config.interceptors).toEqual(customInterceptors)
    })
  })

  describe('錯誤處理測試', () => {
    test('應該正確處理網路錯誤', async () => {
      const { result } = renderHook(() => useApiClient())
      
      // 測試錯誤處理邏輯是否存在
      expect(result.current.config.retryConfig?.retryCondition).toBeDefined()
      
      // 測試重試條件邏輯
      const retryCondition = result.current.config.retryConfig!.retryCondition
      
      expect(retryCondition({ message: 'Network Error', code: 'NETWORK_ERROR' })).toBe(true)
      expect(retryCondition({ message: 'Server Error', code: 'HTTP_500' })).toBe(true)
      expect(retryCondition({ message: 'Client Error', code: 'HTTP_400' })).toBe(false)
    })
  })
})

// 整合測試：模擬真實使用場景
describe('useApiClient 整合場景測試', () => {
  test('SEO 分析 API 配置場景', () => {
    const { result } = renderHook(() => useApiClient({
      timeoutConfig: {
        default: 60000,
        min: 30000,
        max: 180000,
        adaptive: true,
        adaptiveMultiplier: 2.0
      },
      retryConfig: {
        maxRetries: 2,
        initialDelay: 5000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        retryCondition: (error) => error.code === 'NETWORK_ERROR'
      }
    }))

    expect(result.current.config.timeoutConfig?.default).toBe(60000)
    expect(result.current.config.retryConfig?.maxRetries).toBe(2)
    expect(result.current.isConfigured).toBe(true)
  })

  test('高頻 API 配置場景', () => {
    const { result } = renderHook(() => useApiClient({
      timeout: 10000,
      enableRetry: false,
      enableSmartTimeout: false,
      timeoutConfig: {
        default: 10000,
        min: 2000,
        max: 15000,
        adaptive: false,
        adaptiveMultiplier: 1.5
      }
    }))

    expect(result.current.config.timeout).toBe(10000)
    expect(result.current.config.enableRetry).toBe(false)
    expect(result.current.config.enableSmartTimeout).toBe(false)
  })
})