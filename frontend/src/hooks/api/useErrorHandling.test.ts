import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useErrorHandling, ErrorClassification } from './useErrorHandling'
import type { ApiError } from '@/types/api'

describe('useErrorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Date.now for consistent error IDs
    vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  describe('基礎錯誤處理', () => {
    it('應該正確處理網絡錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())
      
      const networkError = {
        isAxiosError: true,
        code: 'ERR_NETWORK',
        request: {},
        response: undefined,
        message: 'Network Error'
      }

      const errorResult = result.current.handleError(networkError)

      expect(errorResult.classification.type).toBe('network')
      expect(errorResult.classification.severity).toBe('high')
      expect(errorResult.classification.recoverable).toBe(true)
      expect(errorResult.userMessage).toContain('網絡連線不穩定')
      expect(errorResult.canRetry).toBe(true)
      expect(errorResult.retryDelay).toBe(2000)
      expect(errorResult.suggestedActions).toContain('點擊重試按鈕')
    })

    it('應該正確處理超時錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())
      
      const timeoutError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      }

      const errorResult = result.current.handleError(timeoutError)

      expect(errorResult.classification.type).toBe('timeout')
      expect(errorResult.classification.severity).toBe('medium')
      expect(errorResult.userMessage).toContain('請求超時')
      expect(errorResult.canRetry).toBe(true)
      expect(errorResult.retryDelay).toBe(3000)
    })

    it('應該正確處理取消的請求', () => {
      const { result } = renderHook(() => useErrorHandling())
      
      const cancelledError = {
        isAxiosError: true,
        code: 'ERR_CANCELED',
        message: 'Request canceled'
      }

      const errorResult = result.current.handleError(cancelledError)

      expect(errorResult.classification.type).toBe('cancelled')
      expect(errorResult.classification.severity).toBe('low')
      expect(errorResult.userMessage).toBe('請求已被取消')
      expect(errorResult.canRetry).toBe(true)
      expect(errorResult.retryDelay).toBe(0)
    })

    it('應該正確處理 ApiError', () => {
      const { result } = renderHook(() => useErrorHandling())
      
      const apiError: ApiError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: { field: 'email' }
      }

      const errorResult = result.current.handleError(apiError)

      expect(errorResult.classification.type).toBe('client')
      expect(errorResult.classification.severity).toBe('low')
      expect(errorResult.userMessage).toContain('輸入資料格式不正確')
      expect(errorResult.canRetry).toBe(false)
    })

    it('應該正確處理原生 Error', () => {
      const { result } = renderHook(() => useErrorHandling())
      
      const nativeError = new Error('Something went wrong')

      const errorResult = result.current.handleError(nativeError)

      expect(errorResult.classification.type).toBe('unknown')
      expect(errorResult.classification.severity).toBe('medium')
      expect(errorResult.userMessage).toContain('系統錯誤')
      expect(errorResult.canRetry).toBe(false)
    })
  })

  describe('HTTP 狀態碼處理', () => {
    it('應該正確處理 400 錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())
      
      const badRequestError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Bad Request' }
        }
      }

      const errorResult = result.current.handleError(badRequestError)

      expect(errorResult.classification.type).toBe('client')
      expect(errorResult.classification.severity).toBe('medium')
      expect(errorResult.userMessage).toContain('請求資料格式錯誤')
      expect(errorResult.canRetry).toBe(false)
    })

    it('應該正確處理 401 認證錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())
      
      const unauthorizedError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      }

      const errorResult = result.current.handleError(unauthorizedError)

      expect(errorResult.classification.type).toBe('client')
      expect(errorResult.classification.severity).toBe('high')
      expect(errorResult.userMessage).toContain('登入已過期')
      expect(errorResult.classification.recoverable).toBe(true)
    })

    it('應該正確處理 403 權限錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())
      
      const forbiddenError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { message: 'Forbidden' }
        }
      }

      const errorResult = result.current.handleError(forbiddenError)

      expect(errorResult.classification.type).toBe('client')
      expect(errorResult.classification.severity).toBe('high')
      expect(errorResult.userMessage).toContain('沒有權限執行此操作')
      expect(errorResult.suggestedActions).toContain('請聯繫管理員獲取相應權限')
    })

    it('應該正確處理 404 錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())
      
      const notFoundError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Not Found' }
        }
      }

      const errorResult = result.current.handleError(notFoundError)

      expect(errorResult.userMessage).toContain('找不到請求的資源或頁面')
      expect(errorResult.suggestedActions).toContain('請確認網址正確或返回首頁')
    })

    it('應該正確處理 429 頻率限制錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())
      
      const rateLimitError = {
        isAxiosError: true,
        response: {
          status: 429,
          data: { message: 'Too Many Requests' }
        }
      }

      const errorResult = result.current.handleError(rateLimitError)

      expect(errorResult.userMessage).toContain('請求過於頻繁')
      expect(errorResult.suggestedActions).toContain('請等待一分鐘後重新嘗試')
    })

    it('應該正確處理 500 服務器錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())
      
      const serverError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { message: 'Internal Server Error' }
        }
      }

      const errorResult = result.current.handleError(serverError)

      expect(errorResult.classification.type).toBe('server')
      expect(errorResult.classification.severity).toBe('high')
      expect(errorResult.userMessage).toContain('服務器暫時無法處理請求')
      expect(errorResult.canRetry).toBe(true)
      expect(errorResult.retryDelay).toBe(5000)
    })
  })

  describe('錯誤統計功能', () => {
    it('應該正確統計錯誤數量', () => {
      const { result } = renderHook(() => useErrorHandling())

      act(() => {
        result.current.handleError(new Error('Error 1'))
        result.current.handleError(new Error('Error 2'))
        result.current.handleError(new Error('Error 3'))
      })

      expect(result.current.statistics.totalErrors).toBe(3)
      expect(result.current.statistics.errorsByType.unknown).toBe(3)
    })

    it('應該正確按類型分組統計錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())

      act(() => {
        // 網絡錯誤
        result.current.handleError({
          isAxiosError: true,
          code: 'ERR_NETWORK',
          request: {}
        })
        
        // 超時錯誤
        result.current.handleError({
          isAxiosError: true,
          code: 'ECONNABORTED'
        })
        
        // 另一個網絡錯誤
        result.current.handleError({
          isAxiosError: true,
          code: 'ERR_NETWORK',
          request: {}
        })
      })

      expect(result.current.statistics.errorsByType.network).toBe(2)
      expect(result.current.statistics.errorsByType.timeout).toBe(1)
    })

    it('應該正確按嚴重程度分組統計錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())

      act(() => {
        // 高嚴重程度 (網絡錯誤)
        result.current.handleError({
          isAxiosError: true,
          code: 'ERR_NETWORK',
          request: {}
        })
        
        // 中嚴重程度 (超時錯誤)
        result.current.handleError({
          isAxiosError: true,
          code: 'ECONNABORTED'
        })
        
        // 低嚴重程度 (取消請求)
        result.current.handleError({
          isAxiosError: true,
          code: 'ERR_CANCELED'
        })
      })

      expect(result.current.statistics.errorsBySeverity.high).toBe(1)
      expect(result.current.statistics.errorsBySeverity.medium).toBe(1)
      expect(result.current.statistics.errorsBySeverity.low).toBe(1)
    })

    it('應該識別最常見的錯誤類型', () => {
      const { result } = renderHook(() => useErrorHandling())

      act(() => {
        // 3 個網絡錯誤
        for (let i = 0; i < 3; i++) {
          result.current.handleError({
            isAxiosError: true,
            code: 'ERR_NETWORK',
            request: {}
          })
        }
        
        // 1 個超時錯誤
        result.current.handleError({
          isAxiosError: true,
          code: 'ECONNABORTED'
        })
      })

      expect(result.current.statistics.mostCommonError).toBe('network')
    })

    it('應該正確計算錯誤率', () => {
      const { result } = renderHook(() => useErrorHandling({ maxErrorHistory: 10 }))

      act(() => {
        // 添加 5 個錯誤（錯誤率應該是 5/10 = 0.5）
        for (let i = 0; i < 5; i++) {
          result.current.handleError(new Error(`Error ${i}`))
        }
      })

      expect(result.current.statistics.errorRate).toBe(0.5)
    })

    it('應該能夠標記錯誤為已解決並計算平均恢復時間', () => {
      const { result } = renderHook(() => useErrorHandling())

      let errorId: string
      
      act(() => {
        const errorResult = result.current.handleError(new Error('Test error'))
        errorId = errorResult.errorId
      })

      // 模擬 1 秒後解決錯誤
      vi.spyOn(Date, 'now').mockReturnValue(1234567891000)
      
      act(() => {
        result.current.markErrorResolved(errorId)
      })

      expect(result.current.statistics.averageRecoveryTime).toBe(1000)
    })

    it('應該能夠重置統計資料', () => {
      const { result } = renderHook(() => useErrorHandling())

      act(() => {
        result.current.handleError(new Error('Error 1'))
        result.current.handleError(new Error('Error 2'))
      })

      expect(result.current.statistics.totalErrors).toBe(2)

      act(() => {
        result.current.resetStatistics()
      })

      expect(result.current.statistics.totalErrors).toBe(0)
      expect(result.current.statistics.errorsByType).toEqual({})
    })
  })

  describe('錯誤歷史管理', () => {
    it('應該能夠獲取錯誤歷史', () => {
      const { result } = renderHook(() => useErrorHandling())

      act(() => {
        result.current.handleError(new Error('Error 1'))
        result.current.handleError(new Error('Error 2'))
      })

      const history = result.current.getErrorHistory()
      expect(history).toHaveLength(2)
      expect(history[0].classification.technicalMessage).toBe('Error 1')
      expect(history[1].classification.technicalMessage).toBe('Error 2')
    })

    it('應該能夠限制返回的歷史記錄數量', () => {
      const { result } = renderHook(() => useErrorHandling())

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.handleError(new Error(`Error ${i}`))
        }
      })

      const limitedHistory = result.current.getErrorHistory(3)
      expect(limitedHistory).toHaveLength(3)
      // 應該返回最新的 3 個錯誤
      expect(limitedHistory[0].classification.technicalMessage).toBe('Error 2')
      expect(limitedHistory[2].classification.technicalMessage).toBe('Error 4')
    })

    it('應該限制最大歷史記錄數量', () => {
      const { result } = renderHook(() => useErrorHandling({ maxErrorHistory: 3 }))

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.handleError(new Error(`Error ${i}`))
        }
      })

      const history = result.current.getErrorHistory()
      expect(history).toHaveLength(3)
      // 應該保留最新的 3 個錯誤
      expect(history[0].classification.technicalMessage).toBe('Error 2')
      expect(history[2].classification.technicalMessage).toBe('Error 4')
    })

    it('應該能夠查詢特定類型錯誤的頻率', () => {
      const { result } = renderHook(() => useErrorHandling())

      act(() => {
        // 添加多個網絡錯誤
        for (let i = 0; i < 3; i++) {
          result.current.handleError({
            isAxiosError: true,
            code: 'ERR_NETWORK',
            request: {}
          })
        }
        
        // 添加一個超時錯誤
        result.current.handleError({
          isAxiosError: true,
          code: 'ECONNABORTED'
        })
      })

      expect(result.current.getErrorFrequency('network')).toBe(3)
      expect(result.current.getErrorFrequency('timeout')).toBe(1)
      expect(result.current.getErrorFrequency('unknown')).toBe(0)
    })

    it('應該能夠限制時間窗口查詢錯誤頻率', () => {
      const { result } = renderHook(() => useErrorHandling())

      // 模擬 10 分鐘前的錯誤
      vi.spyOn(Date, 'now').mockReturnValue(1234567290000) // 10 分鐘前
      
      act(() => {
        result.current.handleError({
          isAxiosError: true,
          code: 'ERR_NETWORK',
          request: {}
        })
      })

      // 回到當前時間
      vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
      
      act(() => {
        result.current.handleError({
          isAxiosError: true,
          code: 'ERR_NETWORK',
          request: {}
        })
      })

      // 查詢最近 5 分鐘的錯誤（應該只有 1 個）
      expect(result.current.getErrorFrequency('network', 300000)).toBe(1)
    })
  })

  describe('自定義配置', () => {
    it('應該能夠使用自定義錯誤分類器', () => {
      const customClassifier = (): Partial<ErrorClassification> => ({
        type: 'unknown',
        severity: 'critical',
        userMessage: '自定義錯誤訊息'
      })

      const { result } = renderHook(() => 
        useErrorHandling({ customClassifier })
      )

      const errorResult = result.current.handleError(new Error('Test'))

      expect(errorResult.classification.type).toBe('unknown')
      expect(errorResult.classification.severity).toBe('critical')
      expect(errorResult.classification.userMessage).toBe('自定義錯誤訊息')
    })

    it('應該能夠使用自定義訊息轉換器', () => {
      const customMessageTranslator = (classification: ErrorClassification) => 
        `自定義: ${classification.userMessage}`

      const { result } = renderHook(() => 
        useErrorHandling({ customMessageTranslator })
      )

      const errorResult = result.current.handleError(new Error('Test'))

      expect(errorResult.userMessage).toContain('自定義:')
    })

    it('應該能夠禁用統計功能', () => {
      const { result } = renderHook(() => 
        useErrorHandling({ enableStatistics: false })
      )

      act(() => {
        result.current.handleError(new Error('Test'))
      })

      // 統計應該保持初始狀態
      expect(result.current.statistics.totalErrors).toBe(0)
    })

    it('應該能夠自定義最大歷史記錄數量', () => {
      const { result } = renderHook(() => 
        useErrorHandling({ maxErrorHistory: 2 })
      )

      act(() => {
        for (let i = 0; i < 4; i++) {
          result.current.handleError(new Error(`Error ${i}`))
        }
      })

      const history = result.current.getErrorHistory()
      expect(history).toHaveLength(2)
    })
  })

  describe('邊界情況', () => {
    it('應該正確處理 null 錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())

      const errorResult = result.current.handleError(null)

      expect(errorResult.classification.type).toBe('unknown')
      expect(errorResult.userMessage).toContain('發生未知錯誤')
    })

    it('應該正確處理 undefined 錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())

      const errorResult = result.current.handleError(undefined)

      expect(errorResult.classification.type).toBe('unknown')
      expect(errorResult.userMessage).toContain('發生未知錯誤')
    })

    it('應該正確處理字符串錯誤', () => {
      const { result } = renderHook(() => useErrorHandling())

      const errorResult = result.current.handleError('String error')

      expect(errorResult.classification.type).toBe('unknown')
      expect(errorResult.classification.technicalMessage).toBe('String error')
    })

    it('應該正確處理沒有 response 的 AxiosError', () => {
      const { result } = renderHook(() => useErrorHandling())

      const axiosError = {
        isAxiosError: true,
        message: 'Request failed'
      }

      const errorResult = result.current.handleError(axiosError)

      expect(errorResult.classification.type).toBe('unknown')
      expect(errorResult.userMessage).toContain('請求處理時發生錯誤')
    })

    it('應該正確處理標記不存在錯誤ID為已解決', () => {
      const { result } = renderHook(() => useErrorHandling())

      // 不應該拋出錯誤
      expect(() => {
        act(() => {
          result.current.markErrorResolved('non-existent-id')
        })
      }).not.toThrow()
    })

    it('應該正確處理重複標記錯誤為已解決', () => {
      const { result } = renderHook(() => useErrorHandling())

      let errorId: string
      
      act(() => {
        const errorResult = result.current.handleError(new Error('Test'))
        errorId = errorResult.errorId
        result.current.markErrorResolved(errorId)
        result.current.markErrorResolved(errorId) // 重複標記
      })

      // 不應該拋出錯誤
      const history = result.current.getErrorHistory()
      expect(history[0].resolved).toBe(true)
    })

    it('應該正確處理空的錯誤歷史', () => {
      const { result } = renderHook(() => useErrorHandling())

      expect(result.current.getErrorHistory()).toHaveLength(0)
      expect(result.current.getErrorFrequency('network')).toBe(0)
      expect(result.current.statistics.mostCommonError).toBeNull()
    })
  })

  describe('整合場景測試', () => {
    it('應該能夠處理複雜的錯誤處理流程', () => {
      const { result } = renderHook(() => useErrorHandling())

      // 第一個錯誤：網絡錯誤
      let networkErrorResult: ReturnType<typeof result.current.handleError>
      act(() => {
        networkErrorResult = result.current.handleError({
          isAxiosError: true,
          code: 'ERR_NETWORK',
          request: {}
        })
      })

      expect(networkErrorResult.canRetry).toBe(true)
      expect(networkErrorResult.retryDelay).toBe(2000)

      // 第二個錯誤：服務器錯誤  
      let serverErrorResult: ReturnType<typeof result.current.handleError>
      act(() => {
        serverErrorResult = result.current.handleError({
          isAxiosError: true,
          response: { status: 500 }
        })
      })

      expect(serverErrorResult.canRetry).toBe(true)
      expect(serverErrorResult.retryDelay).toBe(5000)

      // 標記網絡錯誤為已解決
      act(() => {
        result.current.markErrorResolved(networkErrorResult.errorId)
      })

      // 檢查統計
      expect(result.current.statistics.totalErrors).toBe(2)
      expect(result.current.statistics.errorsByType.network).toBe(1)
      expect(result.current.statistics.errorsByType.server).toBe(1)

      // 檢查歷史
      const history = result.current.getErrorHistory()
      expect(history[0].resolved).toBe(true)  // 網絡錯誤已解決
      expect(history[1].resolved).toBe(false) // 服務器錯誤未解決
    })

    it('應該能夠處理高頻錯誤場景', () => {
      const { result } = renderHook(() => useErrorHandling())

      // 模擬高頻網絡錯誤
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.handleError({
            isAxiosError: true,
            code: 'ERR_NETWORK',
            request: {}
          })
        }
      })

      expect(result.current.getErrorFrequency('network')).toBe(10)
      expect(result.current.statistics.mostCommonError).toBe('network')
      expect(result.current.statistics.errorsBySeverity.high).toBe(10)
    })
  })
})