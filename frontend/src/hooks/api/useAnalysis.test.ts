import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAnalysis } from './useAnalysis'
import type { 
  AnalyzeRequest, 
  AnalyzeResponse, 
  JobCreateResponse, 
  JobStatusResponse 
} from '@/types/api'
import type { ProgressUpdate } from '@/types/progress'

// Mock ApiClient
const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn()
}

// Mock dependencies
vi.mock('./useApiClient', () => ({
  useApiClient: () => mockApiClient
}))

vi.mock('./useErrorHandling', () => ({
  useErrorHandling: () => ({
    handleError: vi.fn((error) => ({
      userMessage: typeof error === 'string' ? error : error.message || 'Unknown error',
      canRetry: false
    }))
  })
}))

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    // Simulate connection success
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 10)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000 }))
    }
  }

  send() {
    // Mock send implementation
  }
}

// @ts-expect-error - Mocking global WebSocket
global.WebSocket = MockWebSocket

describe('useAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
  })

  const mockRequest: AnalyzeRequest = {
    keyword: 'test keyword',
    audience: 'test audience',
    options: {
      generate_draft: true,
      include_faq: true,
      include_table: false
    }
  }

  const mockJobResponse: JobCreateResponse = {
    status: 'pending',
    job_id: 'test-job-123',
    message: 'Analysis started',
    status_url: '/api/analysis/test-job-123/status'
  }

  const mockResult: AnalyzeResponse = {
    status: 'success',
    data: {
      analysis_report: 'Test analysis report content...',
      metadata: {
        keyword: 'test keyword',
        audience: 'test audience',
        serp_summary: {
          total_results: 10,
          successful_scrapes: 8,
          avg_word_count: 1500,
          avg_paragraphs: 12
        },
        analysis_timestamp: '2023-01-01T00:00:00Z'
      }
    },
    message: 'Analysis completed successfully'
  }

  describe('基礎功能', () => {
    it('應該正確初始化預設狀態', () => {
      const { result } = renderHook(() => useAnalysis())

      expect(result.current.status).toBe('idle')
      expect(result.current.websocketStatus).toBe('disconnected')
      expect(result.current.progress).toBe(null)
      expect(result.current.result).toBe(null)
      expect(result.current.error).toBe(null)
      expect(result.current.jobId).toBe(null)
      expect(result.current.canCancel).toBe(false)
      expect(result.current.canPause).toBe(false)
      expect(result.current.canResume).toBe(false)
    })

    it('應該提供正確的便利狀態屬性', () => {
      const { result } = renderHook(() => useAnalysis())

      expect(result.current.isIdle).toBe(true)
      expect(result.current.isRunning).toBe(false)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.isCompleted).toBe(false)
      expect(result.current.isError).toBe(false)
      expect(result.current.isCancelled).toBe(false)
      expect(result.current.hasResult).toBe(false)
      expect(result.current.hasError).toBe(false)
    })

    it('應該提供完整的控制介面', () => {
      const { result } = renderHook(() => useAnalysis())

      expect(result.current.controls).toHaveProperty('start')
      expect(result.current.controls).toHaveProperty('cancel')
      expect(result.current.controls).toHaveProperty('pause')
      expect(result.current.controls).toHaveProperty('resume')
      expect(result.current.controls).toHaveProperty('retry')
      expect(result.current.controls).toHaveProperty('reset')
    })
  })

  describe('分析啟動', () => {
    it('應該能夠成功啟動分析', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/analysis/async', mockRequest)
      expect(result.current.status).toBe('running')
      expect(result.current.jobId).toBe('test-job-123')
      expect(result.current.request).toEqual(mockRequest)
      expect(result.current.canCancel).toBe(true)
      expect(result.current.canPause).toBe(true)
      expect(result.current.progress).not.toBe(null)
    })

    it('應該正確設定初始進度狀態', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      expect(result.current.progress).toMatchObject({
        currentStage: 1,
        overallProgress: 0,
        stageProgress: 0,
        status: 'idle',
        jobId: 'test-job-123',
        canCancel: true
      })
    })

    it('應該處理啟動失敗的情況', async () => {
      const error = new Error('Failed to start analysis')
      mockApiClient.post.mockRejectedValueOnce(error)
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await expect(result.current.controls.start(mockRequest)).rejects.toThrow()
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('Failed to start analysis')
    })

    it('應該防止重複啟動', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      await act(async () => {
        await expect(result.current.controls.start(mockRequest)).rejects.toThrow('Analysis is already running')
      })
    })
  })

  describe('WebSocket 整合', () => {
    it('應該在分析啟動後建立 WebSocket 連接', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      // 等待 WebSocket 連接
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(result.current.websocketStatus).toBe('connected')
    })

    it('應該能夠處理進度更新消息', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      // 模擬接收到進度更新
      const progressUpdate: ProgressUpdate = {
        current_stage: 2,
        overall_progress: 45,
        stage_progress: 60,
        estimated_remaining: 120
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'progress',
          job_id: 'test-job-123',
          data: progressUpdate
        })
      })

      act(() => {
        // Simulate WebSocket message
        const ws = MockWebSocket.prototype
        if (ws.onmessage) {
          ws.onmessage(messageEvent)
        }
      })

      expect(result.current.progress?.currentStage).toBe(2)
      expect(result.current.progress?.overallProgress).toBe(45)
      expect(result.current.progress?.stageProgress).toBe(60)
      expect(result.current.status).toBe('running')
    })

    it('應該能夠處理分析完成消息', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      const completedMessage = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'completed',
          job_id: 'test-job-123',
          data: mockResult
        })
      })

      act(() => {
        const ws = MockWebSocket.prototype
        if (ws.onmessage) {
          ws.onmessage(completedMessage)
        }
      })

      expect(result.current.status).toBe('completed')
      expect(result.current.result).toEqual(mockResult)
      expect(result.current.canCancel).toBe(false)
      expect(result.current.canPause).toBe(false)
      expect(result.current.progress?.status).toBe('completed')
    })

    it('應該能夠處理錯誤消息', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      const errorMessage = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'error',
          job_id: 'test-job-123',
          data: { message: 'Analysis failed' }
        })
      })

      act(() => {
        const ws = MockWebSocket.prototype
        if (ws.onmessage) {
          ws.onmessage(errorMessage)
        }
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('Analysis failed')
      expect(result.current.progress?.status).toBe('error')
    })

    it('應該禁用 WebSocket 時使用輪詢', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      mockApiClient.get.mockResolvedValueOnce({
        data: {
          job_id: 'test-job-123',
          status: 'processing',
          progress: {
            current_step: 2,
            total_steps: 6,
            message: 'Processing...',
            percentage: 33
          }
        } as JobStatusResponse
      })
      
      const { result } = renderHook(() => 
        useAnalysis({ enableWebSocket: false, pollingConfig: { enabled: true, interval: 100 } })
      )

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      expect(result.current.websocketStatus).toBe('disconnected')

      // 等待輪詢執行
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/analysis/test-job-123/status')
      expect(result.current.status).toBe('running')
    })
  })

  describe('分析控制', () => {
    beforeEach(async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
    })

    it('應該能夠取消分析', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      mockApiClient.post.mockResolvedValueOnce({ data: { status: 'cancelled' } })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      await act(async () => {
        await result.current.controls.cancel()
      })

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/analysis/test-job-123/cancel')
      expect(result.current.status).toBe('cancelled')
      expect(result.current.canCancel).toBe(false)
    })

    it('應該能夠暫停分析', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      mockApiClient.post.mockResolvedValueOnce({ data: { status: 'paused' } })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      await act(async () => {
        await result.current.controls.pause()
      })

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/analysis/test-job-123/pause')
      expect(result.current.status).toBe('paused')
      expect(result.current.canPause).toBe(false)
      expect(result.current.canResume).toBe(true)
    })

    it('應該能夠恢復分析', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      mockApiClient.post.mockResolvedValueOnce({ data: { status: 'paused' } })
      mockApiClient.post.mockResolvedValueOnce({ data: { status: 'running' } })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      await act(async () => {
        await result.current.controls.pause()
      })

      await act(async () => {
        await result.current.controls.resume()
      })

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/analysis/test-job-123/resume')
      expect(result.current.status).toBe('running')
      expect(result.current.canPause).toBe(true)
      expect(result.current.canResume).toBe(false)
    })

    it('應該能夠重試分析', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      const error = new Error('Network error')
      mockApiClient.post.mockRejectedValueOnce(error)
      
      const { result } = renderHook(() => useAnalysis())

      // 首次啟動失敗
      await act(async () => {
        await expect(result.current.controls.start(mockRequest)).rejects.toThrow()
      })

      expect(result.current.status).toBe('error')

      // 重試應該成功
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      await act(async () => {
        await result.current.controls.retry()
      })

      expect(result.current.status).toBe('running')
      expect(result.current.jobId).toBe('test-job-123')
    })

    it('應該能夠重置狀態', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      act(() => {
        result.current.controls.reset()
      })

      expect(result.current.status).toBe('idle')
      expect(result.current.progress).toBe(null)
      expect(result.current.result).toBe(null)
      expect(result.current.error).toBe(null)
      expect(result.current.jobId).toBe(null)
      expect(result.current.websocketStatus).toBe('disconnected')
    })
  })

  describe('統計功能', () => {
    it('應該正確追踪分析統計', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      expect(result.current.statistics.startTime).toBe(null)
      expect(result.current.statistics.endTime).toBe(null)
      expect(result.current.statistics.totalDuration).toBe(null)

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      expect(result.current.statistics.startTime).toBeInstanceOf(Date)
      expect(result.current.statistics.reconnectAttempts).toBe(0)
      expect(result.current.statistics.pollCount).toBe(0)

      // 模擬完成
      const completedMessage = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'completed',
          job_id: 'test-job-123',
          data: mockResult
        })
      })

      act(() => {
        const ws = MockWebSocket.prototype
        if (ws.onmessage) {
          ws.onmessage(completedMessage)
        }
      })

      expect(result.current.statistics.endTime).toBeInstanceOf(Date)
      expect(result.current.statistics.totalDuration).toBeGreaterThan(0)
    })

    it('應該追踪 WebSocket 重連次數', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      // 模擬連接斷開和重連
      act(() => {
        const ws = MockWebSocket.prototype
        if (ws.onclose) {
          ws.onclose(new CloseEvent('close', { code: 1006 })) // 非正常關閉
        }
      })

      expect(result.current.statistics.reconnectAttempts).toBe(1)
    })
  })

  describe('配置選項', () => {
    it('應該能夠自定義 WebSocket 配置', () => {
      const config = {
        websocketConfig: {
          maxRetries: 5,
          retryDelay: 2000,
          retryBackoff: 1.5
        }
      }
      
      const { result } = renderHook(() => useAnalysis(config))
      
      // 配置應該被正確應用（通過行為驗證）
      expect(result.current.status).toBe('idle')
    })

    it('應該能夠自定義輪詢配置', () => {
      const config = {
        pollingConfig: {
          enabled: true,
          interval: 5000,
          maxPolls: 50
        }
      }
      
      const { result } = renderHook(() => useAnalysis(config))
      
      expect(result.current.status).toBe('idle')
    })

    it('應該能夠禁用自動重試', () => {
      const config = {
        autoRetry: false
      }
      
      const { result } = renderHook(() => useAnalysis(config))
      
      expect(result.current.status).toBe('idle')
    })
  })

  describe('錯誤處理', () => {
    it('應該處理無效的控制操作', async () => {
      const { result } = renderHook(() => useAnalysis())

      // 在未啟動狀態下嘗試取消
      await act(async () => {
        await result.current.controls.cancel()
      })

      // 不應該發生錯誤，只是靜默忽略
      expect(result.current.status).toBe('idle')
    })

    it('應該處理 WebSocket 連接失敗', async () => {
      // Mock WebSocket 連接失敗
      const FailingWebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event('error'))
            }
          }, 10)
        }
      }

      // @ts-expect-error - Mocking global WebSocket
      global.WebSocket = FailingWebSocket

      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(result.current.websocketStatus).toBe('error')
    })

    it('應該處理輪詢 API 錯誤', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      mockApiClient.get.mockRejectedValueOnce(new Error('API Error'))
      
      const { result } = renderHook(() => 
        useAnalysis({ enableWebSocket: false, pollingConfig: { enabled: true, interval: 100 } })
      )

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      // 等待輪詢執行和失敗
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('API Error')
    })
  })

  describe('清理和內存管理', () => {
    it('應該在組件卸載時清理資源', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result, unmount } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      expect(result.current.websocketStatus).toBe('connected')

      act(() => {
        unmount()
      })

      // WebSocket 應該被清理
      expect(result.current.websocketStatus).toBe('disconnected')
    })

    it('應該正確清理定時器', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      act(() => {
        result.current.controls.reset()
      })

      // 重置後狀態應該被清理
      expect(result.current.status).toBe('idle')
      expect(result.current.websocketStatus).toBe('disconnected')
    })
  })
})