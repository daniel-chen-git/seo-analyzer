/**
 * useAnalysis Hook 增強版單元測試 - 支援雙欄位設計
 * 
 * 測試功能：
 * - API 呼叫成功流程（新舊格式相容）
 * - 雙欄位設計：status + success 欄位處理
 * - 網路錯誤處理和重試機制
 * - 進度狀態管理和三階段切換邏輯
 * - 向後相容性和適配器功能
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAnalysis } from './useAnalysis'
import type { 
  AnalyzeRequest, 
  AnalyzeResponse, 
  JobCreateResponse, 
  JobStatusResponse,
  LegacyAnalyzeResponse
} from '@/types/api'
import type { ProgressUpdate } from '@/types/progress'
// Mock 測試資料 - 支援新舊格式
const mockAnalyzeRequest: AnalyzeRequest = {
  keyword: "SEO 優化指南",
  audience: "網站經營者、數位行銷人員，希望提升網站搜尋排名和流量",
  options: {
    generate_draft: true,
    include_faq: true,
    include_table: false
  }
}

/**
 * 新格式 AnalyzeResponse - 雙欄位扁平結構
 */
const mockNewAnalyzeResponse: AnalyzeResponse = {
  status: "success",           // API 契約欄位
  analysis_report: `# SEO 優化指南分析報告\n\n## 執行摘要\n針對關鍵字「SEO 優化指南」的完整競爭對手分析已完成。`,
  token_usage: 5484,
  processing_time: 48.8,
  success: true,              // 業務狀態欄位：完全成功
  cached_at: "2025-08-27T11:30:00Z",
  keyword: "SEO 優化指南"
}

/**
 * 新格式 AnalyzeResponse - 部分成功場景
 */
const mockPartialSuccessResponse: AnalyzeResponse = {
  status: "success",           // API 契約：調用成功
  analysis_report: `# 部分分析結果\n\n## 注意\n由於部分資料源無法存取，這是簡化的分析報告。`,
  token_usage: 2500,
  processing_time: 25.3,
  success: false,             // 業務狀態：部分失敗
  cached_at: "2025-08-27T11:30:00Z",
  keyword: "SEO 優化指南"
}

/**
 * 舊版 LegacyAnalyzeResponse - 向後相容測試
 */
const mockLegacyAnalyzeResponse: LegacyAnalyzeResponse = {
  status: "success",
  data: {
    analysis_report: `# 舊格式分析報告\n\n這是使用舊版巢狀結構的回應。`,
    metadata: {
      keyword: "SEO 優化指南",
      audience: "網站經營者",
      serp_summary: {
        total_results: 10,
        successful_scrapes: 8,
        avg_word_count: 1500,
        avg_paragraphs: 12
      },
      analysis_timestamp: "2025-08-27T11:30:00Z"
    }
  },
  message: "Analysis completed successfully"
}

const mockStageUpdates = {
  serp: { status: "in_progress", message: "正在搜尋關鍵字相關結果...", progress: 30 },
  scraping: { status: "in_progress", message: "正在爬取競爭對手網站內容 (5/10)...", progress: 50 },
  analysis: { status: "in_progress", message: "正在進行 AI 分析並生成報告...", progress: 80 }
}

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

// Mock WebSocket with instance tracking
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: MockWebSocket[] = []
  static getLatestInstance = () => MockWebSocket.instances[MockWebSocket.instances.length - 1]

  url: string
  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    // Simulate connection success immediately for cleaner tests
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN
        if (this.onopen) {
          this.onopen(new Event('open'))
        }
      }
    }, 5)
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

  // Helper method to simulate receiving messages
  simulateMessage(data: string) {
    if (this.onmessage) {
      const event = new MessageEvent('message', { data })
      this.onmessage(event)
    }
  }

  // Helper method to simulate connection close
  simulateClose(code: number = 1000) {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code }))
    }
  }
}

// @ts-expect-error - Mocking global WebSocket
global.WebSocket = MockWebSocket

describe('useAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
    // Clear WebSocket instances
    MockWebSocket.instances = []
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
    status_url: '/api/status/test-job-123'
  }

  const mockResult: AnalyzeResponse = {
    status: 'success',
    analysis_report: 'Test analysis report content...',
    token_usage: 1500,
    processing_time: 45.2,
    success: true,
    cached_at: '2023-01-01T00:00:00Z',
    keyword: 'test keyword'
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

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/analyze-async', mockRequest)
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

      // Wait for WebSocket to connect and get the instance
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      act(() => {
        // Get the actual WebSocket instance and simulate message
        const wsInstance = MockWebSocket.getLatestInstance()
        if (wsInstance) {
          wsInstance.simulateMessage(JSON.stringify({
            type: 'progress',
            job_id: 'test-job-123',
            data: progressUpdate
          }))
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

      // Wait for WebSocket to connect
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      act(() => {
        const wsInstance = MockWebSocket.getLatestInstance()
        if (wsInstance) {
          wsInstance.simulateMessage(JSON.stringify({
            type: 'completed',
            job_id: 'test-job-123',
            data: mockResult
          }))
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

      // Wait for WebSocket to connect
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      act(() => {
        const wsInstance = MockWebSocket.getLatestInstance()
        if (wsInstance) {
          wsInstance.simulateMessage(JSON.stringify({
            type: 'error',
            job_id: 'test-job-123',
            data: { message: 'Analysis failed' }
          }))
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

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/status/test-job-123')
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
      // Clean setup
      vi.clearAllMocks()
      
      // Mock responses in order: start -> pause
      mockApiClient.post
        .mockResolvedValueOnce({ data: mockJobResponse })
        .mockResolvedValueOnce({ data: { status: 'paused' } })
      
      const { result } = renderHook(() => useAnalysis())

      // Start analysis
      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      // Verify start completed successfully  
      expect(result.current.status).toBe('running')
      expect(result.current.jobId).toBe('test-job-123')
      expect(result.current.canPause).toBe(true)

      // Pause analysis
      await act(async () => {
        await result.current.controls.pause()
      })

      // Verify pause completed successfully
      expect(mockApiClient.post).toHaveBeenCalledTimes(2)
      expect(mockApiClient.post).toHaveBeenLastCalledWith('/api/analysis/test-job-123/pause')
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
      // Clean setup
      vi.clearAllMocks()
      
      const { result } = renderHook(() => useAnalysis())
      
      // Mock first start call to fail
      const startError = new Error('Start failed')
      mockApiClient.post.mockRejectedValueOnce(startError)

      // 首次啟動失敗
      await act(async () => {
        await expect(result.current.controls.start(mockRequest)).rejects.toThrow('Start failed')
      })

      expect(result.current.status).toBe('error')

      // 重試應該成功 - Mock second start call to succeed
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

      // Wait for WebSocket to connect
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      // 模擬完成
      act(() => {
        const wsInstance = MockWebSocket.getLatestInstance()
        if (wsInstance) {
          wsInstance.simulateMessage(JSON.stringify({
            type: 'completed',
            job_id: 'test-job-123',
            data: mockResult
          }))
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

      // Wait for WebSocket to connect
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      // 模擬連接斷開和重連
      act(() => {
        const wsInstance = MockWebSocket.getLatestInstance()
        if (wsInstance) {
          wsInstance.simulateClose(1006) // 非正常關閉
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

      // Wait for WebSocket to connect
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Debug WebSocket status
      console.log('WebSocket status:', result.current.websocketStatus)
      expect(result.current.websocketStatus).toBe('connected')

      // Check WebSocket instance exists before unmount
      const wsInstance = MockWebSocket.getLatestInstance()
      expect(wsInstance).toBeTruthy()

      act(() => {
        unmount()
      })

      // WebSocket instance should be closed (we can't check result after unmount)
      expect(wsInstance.readyState).toBe(MockWebSocket.CLOSED)
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

  describe('進階功能測試', () => {
    it('應該正確處理三階段狀態切換', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      // Wait for WebSocket connection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      // 模擬 SERP 階段更新
      act(() => {
        const wsInstance = MockWebSocket.getLatestInstance()
        if (wsInstance) {
          wsInstance.simulateMessage(JSON.stringify({
            type: 'stage_update',
            job_id: 'test-job-123',
            data: { stage: 'serp', ...mockStageUpdates.serp }
          }))
        }
      })

      expect(result.current.progress?.currentStage).toBe(1)

      // 模擬進入爬蟲階段
      act(() => {
        const wsInstance = MockWebSocket.getLatestInstance()
        if (wsInstance) {
          wsInstance.simulateMessage(JSON.stringify({
            type: 'stage_update', 
            job_id: 'test-job-123',
            data: { stage: 'scraping', ...mockStageUpdates.scraping }
          }))
        }
      })

      expect(result.current.progress?.currentStage).toBe(2)

      // 模擬進入 AI 分析階段
      act(() => {
        const wsInstance = MockWebSocket.getLatestInstance()
        if (wsInstance) {
          wsInstance.simulateMessage(JSON.stringify({
            type: 'stage_update',
            job_id: 'test-job-123', 
            data: { stage: 'analysis', ...mockStageUpdates.analysis }
          }))
        }
      })

      expect(result.current.progress?.currentStage).toBe(3)
    })

    it('應該正確計算總處理時間', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis())

      const startTime = Date.now()

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      // Wait for WebSocket connection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // 模擬完成並檢查時間
      act(() => {
        const wsInstance = MockWebSocket.getLatestInstance()
        if (wsInstance) {
          wsInstance.simulateMessage(JSON.stringify({
            type: 'completed',
            job_id: 'test-job-123',
            data: mockResult
          }))
        }
      })

      const endTime = Date.now()
      const expectedDuration = endTime - startTime

      expect(result.current.statistics.totalDuration).toBeGreaterThan(50) // 至少50ms
      expect(result.current.statistics.totalDuration).toBeLessThanOrEqual(expectedDuration + 10) // 允許10ms誤差
    })

    it('應該支援重試機制與指數退避', async () => {
      // 模擬前2次失敗，第3次成功
      mockApiClient.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({ data: mockJobResponse })
      
      const { result } = renderHook(() => useAnalysis({
        autoRetry: true
      }))

      await act(async () => {
        await result.current.controls.start(mockRequest)
      })

      // 等待重試完成
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
      })

      expect(result.current.status).toBe('running')
      expect(result.current.statistics.reconnectAttempts).toBe(2)
    })

    it('應該處理網路錯誤並提供使用者友善訊息', async () => {
      const networkError = new Error('Network request failed')
      networkError.name = 'NetworkError'
      
      mockApiClient.post.mockRejectedValueOnce(networkError)
      
      const { result } = renderHook(() => useAnalysis())

      await act(async () => {
        try {
          await result.current.controls.start(mockRequest)
        } catch {
          // 預期會拋出錯誤
        }
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toContain('網路連線')
    })
  })

  // 新增：雙欄位設計測試組
  describe('雙欄位設計處理', () => {
    it('應該正確處理新格式的完全成功回應', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      mockApiClient.get.mockResolvedValueOnce({
        data: {
          job_id: 'test-job-123',
          status: 'completed',
          result: mockNewAnalyzeResponse // 新格式：雙欄位扁平結構
        }
      })
      
      const { result } = renderHook(() => useAnalysis({ 
        enableWebSocket: false, 
        pollingConfig: { enabled: true, interval: 10 } 
      }))

      await act(async () => {
        await result.current.controls.start(mockAnalyzeRequest)
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(result.current.status).toBe('completed')
      expect(result.current.result).toEqual(mockNewAnalyzeResponse)
      // 驗證雙欄位
      expect(result.current.result?.status).toBe('success')
      expect(result.current.result?.success).toBe(true)
    })

    it('應該正確處理新格式的部分成功回應', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      mockApiClient.get.mockResolvedValueOnce({
        data: {
          job_id: 'test-job-123',
          status: 'completed',
          result: mockPartialSuccessResponse // 部分成功：success: false
        }
      })
      
      const { result } = renderHook(() => useAnalysis({ 
        enableWebSocket: false, 
        pollingConfig: { enabled: true, interval: 10 } 
      }))

      await act(async () => {
        await result.current.controls.start(mockAnalyzeRequest)
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(result.current.status).toBe('completed') // API 調用成功
      expect(result.current.result).toEqual(mockPartialSuccessResponse)
      // 驗證雙欄位：API 成功但業務部分失敗
      expect(result.current.result?.status).toBe('success')
      expect(result.current.result?.success).toBe(false)
    })

    it('應該自動適配舊格式到新格式', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      mockApiClient.get.mockResolvedValueOnce({
        data: {
          job_id: 'test-job-123',
          status: 'completed',
          result: mockLegacyAnalyzeResponse // 舊格式：巢狀結構
        }
      })
      
      const { result } = renderHook(() => useAnalysis({ 
        enableWebSocket: false, 
        pollingConfig: { enabled: true, interval: 10 } 
      }))

      await act(async () => {
        await result.current.controls.start(mockAnalyzeRequest)
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(result.current.status).toBe('completed')
      
      // 驗證適配器正確轉換了格式
      const adaptedResult = result.current.result!
      expect(adaptedResult.status).toBe('success') // 適配器自動添加
      expect(adaptedResult.success).toBe(true)     // 舊格式假設成功
      expect(adaptedResult.analysis_report).toContain('舊格式分析報告')
      expect(adaptedResult.keyword).toBe('SEO 優化指南')
      
      // 確認已扁平化：不再有 data 屬性
      expect(adaptedResult).not.toHaveProperty('data')
    })

    it('應該在前端組件中提供正確的雙欄位狀態檢查', async () => {
      // 模擬前端組件的雙重檢查邏輯
      const simulateFrontendLogic = (response: AnalyzeResponse | null) => {
        if (!response) return 'no_result'
        
        if (response.status === 'success' && response.success) {
          return 'complete_success' // 完全成功
        } else if (response.status === 'success' && !response.success) {
          return 'partial_success'  // 部分成功
        } else {
          return 'api_error'        // API 錯誤
        }
      }

      // 測試完全成功場景
      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      mockApiClient.get.mockResolvedValueOnce({
        data: { job_id: 'test-job-123', status: 'completed', result: mockNewAnalyzeResponse }
      })
      
      const { result } = renderHook(() => useAnalysis({ enableWebSocket: false, pollingConfig: { enabled: true, interval: 10 } }))
      
      await act(async () => {
        await result.current.controls.start(mockAnalyzeRequest)
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(simulateFrontendLogic(result.current.result)).toBe('complete_success')

      // 測試部分成功場景（重置後重新測試）
      act(() => {
        result.current.controls.reset()
      })

      mockApiClient.post.mockResolvedValueOnce({ data: mockJobResponse })
      mockApiClient.get.mockResolvedValueOnce({
        data: { job_id: 'test-job-123', status: 'completed', result: mockPartialSuccessResponse }
      })

      await act(async () => {
        await result.current.controls.start(mockAnalyzeRequest)
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(simulateFrontendLogic(result.current.result)).toBe('partial_success')
    })
  })
})