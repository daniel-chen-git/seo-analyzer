/**
 * Phase 3: 前端完整流程整合測試
 * 
 * 驗證前端組件整合測試，確保：
 * 1. MainContent 組件正確解析扁平結構
 * 2. 分析報告 Markdown 正確渲染
 * 3. 導航和交互功能正常
 * 4. 下載功能使用完整數據
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MainContent from '@/components/layout/MainContent'
import type { AnalyzeRequest, AnalyzeResponse } from '@/types/api'
import type { ProgressState } from '@/types/progress'

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown-content">{children}</div>
  )
}))

// Mock 配置
vi.mock('@/config', () => ({
  isDevelopment: () => false
}))

// Mock 組件
vi.mock('@/components/form', () => ({
  InputForm: ({ onSubmit, onReset, isSubmitting, analysisStatus }: {
    onSubmit: (request: unknown) => void;
    onReset: () => void;
    isSubmitting: boolean;
    analysisStatus: string;
  }) => (
    <div data-testid="input-form">
      <button 
        onClick={() => onSubmit(mockAnalyzeRequest)} 
        disabled={isSubmitting}
        data-testid="submit-button"
      >
        {isSubmitting ? '分析中...' : '開始分析'}
      </button>
      <button onClick={onReset} data-testid="reset-button">
        重置表單
      </button>
      <span data-testid="analysis-status">{analysisStatus}</span>
    </div>
  )
}))

vi.mock('@/components/progress', () => ({
  ProgressIndicator: ({ progressState, onCancel }: {
    progressState: { status?: string } | null;
    onCancel: () => void;
  }) => (
    <div data-testid="progress-indicator">
      <span data-testid="progress-status">{progressState?.status}</span>
      <button onClick={onCancel} data-testid="cancel-button">
        取消分析
      </button>
    </div>
  )
}))

// 測試數據
const mockAnalyzeRequest: AnalyzeRequest = {
  keyword: 'SEO 工具推薦',
  audience: '行銷人員',
  options: {
    generate_draft: true,
    include_faq: true,
    include_table: false
  }
}

const mockAnalyzeResponse: AnalyzeResponse = {
  status: 'success',
  analysis_report: `# SEO 工具推薦分析報告

## 1. 關鍵字分析
針對「SEO 工具推薦」進行深度分析...

## 2. 內容建議
根據分析結果，建議以下內容策略...

## 3. SERP 洞察
搜尋結果頁面分析顯示...`,
  token_usage: 5484,
  processing_time: 22.46,
  success: true,
  cached_at: '2025-09-01T00:30:00Z',
  keyword: 'SEO 工具推薦'
}

const mockProgressState: ProgressState = {
  currentStage: 3 as const,
  overallProgress: 100,
  stageProgress: 100,
  status: 'completed',
  stages: {
    serp: { 
      status: 'completed', 
      progress: 100, 
      subtasks: [],
      statusMessage: '完成'
    },
    crawler: { 
      status: 'completed', 
      progress: 100, 
      subtasks: [],
      statusMessage: '完成'
    },
    ai: { 
      status: 'completed', 
      progress: 100, 
      subtasks: [],
      statusMessage: '完成'
    }
  },
  timing: {
    startTime: new Date(),
    currentStageStartTime: new Date(),
    estimatedTotalTime: 60,
    estimatedRemainingTime: 0
  },
  jobId: 'test-job-id',
  canCancel: false
}

// Mock props
const createMockProps = (overrides = {}) => ({
  showForm: false,
  onFormSubmit: vi.fn(),
  onFormReset: vi.fn(),
  isSubmitting: false,
  analysisStatus: 'completed' as const,
  progressState: null,
  onAnalysisCancel: vi.fn(),
  analysisResult: mockAnalyzeResponse,
  analysisRequest: mockAnalyzeRequest,
  onShowForm: vi.fn(),
  ...overrides
})

describe('Phase 3: 前端完整流程整合測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('MainContent 組件扁平結構解析', () => {
    it('應該正確解析和顯示扁平結構的分析結果', () => {
      const props = createMockProps()
      
      render(<MainContent {...props} />)
      
      // 驗證分析報告渲染
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('# SEO 工具推薦分析報告')
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('關鍵字分析')
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('內容建議')
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('SERP 洞察')
    })

    it('應該正確顯示處理統計信息', () => {
      const props = createMockProps()
      
      render(<MainContent {...props} />)
      
      // 驗證統計信息顯示
      expect(screen.getByText(/總處理時間/)).toBeInTheDocument()
      expect(screen.getByText('22.46 秒')).toBeInTheDocument()
      expect(screen.getByText(/Token 使用量/)).toBeInTheDocument()  
      expect(screen.getByText('5484')).toBeInTheDocument()
      expect(screen.getByText(/關鍵字/)).toBeInTheDocument()
      expect(screen.getByText('SEO 工具推薦')).toBeInTheDocument()
    })

    it('應該正確顯示業務狀態（雙欄位設計）', () => {
      const props = createMockProps()
      
      render(<MainContent {...props} />)
      
      // 驗證雙欄位設計：success 欄位顯示
      expect(screen.getByText(/業務狀態/)).toBeInTheDocument()
      expect(screen.getByText('完全成功')).toBeInTheDocument()
    })

    it('應該正確顯示快取時間', () => {
      const props = createMockProps()
      
      render(<MainContent {...props} />)
      
      // 驗證快取時間顯示
      expect(screen.getByText(/快取時間/)).toBeInTheDocument()
      expect(screen.getByText(/2025.*9.*1/)).toBeInTheDocument() // 匹配日期格式
    })
  })

  describe('下載功能測試', () => {
    // Mock document.createElement 和相關方法
    beforeEach(() => {
      const mockLink = {
        setAttribute: vi.fn(),
        click: vi.fn()
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement)
    })

    it('應該使用完整的扁平結構數據進行下載', async () => {
      const props = createMockProps()
      
      render(<MainContent {...props} />)
      
      const downloadButton = screen.getByText('📥 下載報告')
      fireEvent.click(downloadButton)
      
      // 驗證 document.createElement 被調用
      expect(document.createElement).toHaveBeenCalledWith('a')
      
      // 驗證 setAttribute 調用（檢查下載的檔案名）
      const createElementSpy = document.createElement as unknown as { mock: { results: Array<{ value: { setAttribute: (attr: string, value: string) => void } }> } }
      const mockLink = createElementSpy.mock.results[0].value
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 
        expect.stringMatching(/seo-analysis-SEO 工具推薦-\d{4}-\d{2}-\d{2}\.json/))
    })
  })

  describe('表單狀態管理', () => {
    it('應該正確處理表單顯示狀態', () => {
      const props = createMockProps({ 
        showForm: true,
        analysisResult: null,
        progressState: null
      })
      
      render(<MainContent {...props} />)
      
      // 驗證表單顯示
      expect(screen.getByTestId('input-form')).toBeInTheDocument()
      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
    })

    it('應該正確處理進度狀態', () => {
      const props = createMockProps({
        showForm: false,
        progressState: mockProgressState,
        analysisResult: null
      })
      
      render(<MainContent {...props} />)
      
      // 驗證進度顯示
      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('progress-status')).toHaveTextContent('completed')
    })

    it('應該正確處理結果顯示狀態', () => {
      const props = createMockProps()
      
      render(<MainContent {...props} />)
      
      // 驗證結果顯示
      expect(screen.getByText('✅ 分析完成')).toBeInTheDocument()
      expect(screen.getByText('以下是您的 SEO 分析報告')).toBeInTheDocument()
    })
  })

  describe('用戶交互功能', () => {
    it('應該正確處理重置操作', () => {
      const mockOnFormReset = vi.fn()
      const props = createMockProps({ onFormReset: mockOnFormReset })
      
      render(<MainContent {...props} />)
      
      const resetButton = screen.getByText('🔄 開始新分析')
      fireEvent.click(resetButton)
      
      expect(mockOnFormReset).toHaveBeenCalled()
    })

    it('應該在沒有表單和進度時顯示開始按鈕', () => {
      const mockOnShowForm = vi.fn()
      const props = createMockProps({
        showForm: false,
        progressState: null,
        analysisResult: null,
        onShowForm: mockOnShowForm
      })
      
      render(<MainContent {...props} />)
      
      const startButton = screen.getByText('開始分析')
      fireEvent.click(startButton)
      
      expect(mockOnShowForm).toHaveBeenCalled()
    })
  })

  describe('錯誤狀態處理', () => {
    it('應該正確處理部分成功狀態', () => {
      const partialSuccessResponse: AnalyzeResponse = {
        ...mockAnalyzeResponse,
        success: false  // 業務狀態為失敗
      }
      
      const props = createMockProps({ 
        analysisResult: partialSuccessResponse 
      })
      
      render(<MainContent {...props} />)
      
      // 驗證部分成功狀態顯示
      expect(screen.getByText('部分成功')).toBeInTheDocument()
    })
  })

  describe('響應式和可訪問性', () => {
    it('應該包含正確的語義化標籤', () => {
      const props = createMockProps()
      
      render(<MainContent {...props} />)
      
      // 驗證標題結構
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('🔍 SEO 關鍵字分析')
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('✅ 分析完成')
    })

    it('應該正確處理長內容的顯示', () => {
      const longContentResponse: AnalyzeResponse = {
        ...mockAnalyzeResponse,
        analysis_report: '# 超長分析報告\n\n' + '這是一個非常長的內容。'.repeat(100)
      }
      
      const props = createMockProps({ 
        analysisResult: longContentResponse 
      })
      
      render(<MainContent {...props} />)
      
      // 驗證長內容能正確渲染
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('超長分析報告')
    })
  })
})

// 導出測試組件以便其他測試使用
export { mockAnalyzeRequest, mockAnalyzeResponse, mockProgressState }