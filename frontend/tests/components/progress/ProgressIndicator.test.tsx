/**
 * ProgressIndicator 元件單元測試
 * 
 * 測試三階段進度顯示、時間計數器、視覺回饋和錯誤狀態處理，
 * 確保使用者能清楚了解分析進度和預估完成時間。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { ProgressIndicator } from '../../../src/components/progress/ProgressIndicator'
import type { AnalysisStage } from '../../../src/types'

// Mock timer functions
vi.useFakeTimers()

describe('ProgressIndicator 元件測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })
  
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('基本渲染測試', () => {
    it('初始狀態應正確顯示', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="serp"
          isActive={false}
          elapsedTime={0}
        />
      )
      
      // Assert
      expect(screen.getByText(/準備開始分析/i)).toBeInTheDocument()
      expect(screen.getByText(/00:00/)).toBeInTheDocument()
    })

    it('應顯示所有三個階段', () => {
      // Arrange & Act  
      render(
        <ProgressIndicator 
          currentStage="serp"
          isActive={true}
          elapsedTime={0}
        />
      )
      
      // Assert
      expect(screen.getByText(/搜尋結果分析/i)).toBeInTheDocument()
      expect(screen.getByText(/網站內容爬取/i)).toBeInTheDocument() 
      expect(screen.getByText(/AI 智能分析/i)).toBeInTheDocument()
    })
  })

  describe('階段狀態更新測試', () => {
    it('SERP 階段應正確顯示進行中狀態', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="serp"
          isActive={true}
          elapsedTime={5}
        />
      )
      
      // Assert
      expect(screen.getByText(/正在搜尋關鍵字相關結果/i)).toBeInTheDocument()
      expect(screen.getByTestId('stage-serp')).toHaveClass(/active|current/)
      expect(screen.getByTestId('stage-scraping')).toHaveClass(/pending|waiting/)
      expect(screen.getByTestId('stage-analysis')).toHaveClass(/pending|waiting/)
    })

    it('爬蟲階段應正確顯示進行中狀態', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="scraping"
          isActive={true}
          elapsedTime={15}
          stageProgress={{
            serp: { status: 'completed', duration: 8 },
            scraping: { status: 'in_progress', progress: 60 },
            analysis: { status: 'pending' }
          }}
        />
      )
      
      // Assert
      expect(screen.getByText(/正在爬取競爭對手網站內容/i)).toBeInTheDocument()
      expect(screen.getByTestId('stage-serp')).toHaveClass(/completed|success/)
      expect(screen.getByTestId('stage-scraping')).toHaveClass(/active|current/)
      expect(screen.getByTestId('stage-analysis')).toHaveClass(/pending|waiting/)
      
      // 應該顯示進度百分比
      expect(screen.getByText(/60%/)).toBeInTheDocument()
    })

    it('AI 分析階段應正確顯示進行中狀態', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="analysis"
          isActive={true}
          elapsedTime={35}
          stageProgress={{
            serp: { status: 'completed', duration: 8 },
            scraping: { status: 'completed', duration: 22 },
            analysis: { status: 'in_progress', progress: 80 }
          }}
        />
      )
      
      // Assert
      expect(screen.getByText(/正在進行 AI 分析並生成報告/i)).toBeInTheDocument()
      expect(screen.getByTestId('stage-serp')).toHaveClass(/completed/)
      expect(screen.getByTestId('stage-scraping')).toHaveClass(/completed/)
      expect(screen.getByTestId('stage-analysis')).toHaveClass(/active|current/)
      
      expect(screen.getByText(/80%/)).toBeInTheDocument()
    })

    it('完成狀態應正確顯示', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="analysis"
          isActive={false}
          elapsedTime={48}
          stageProgress={{
            serp: { status: 'completed', duration: 8 },
            scraping: { status: 'completed', duration: 18 },
            analysis: { status: 'completed', duration: 22 }
          }}
        />
      )
      
      // Assert
      expect(screen.getByText(/分析完成/i)).toBeInTheDocument()
      expect(screen.getByTestId('stage-serp')).toHaveClass(/completed/)
      expect(screen.getByTestId('stage-scraping')).toHaveClass(/completed/)
      expect(screen.getByTestId('stage-analysis')).toHaveClass(/completed/)
    })
  })

  describe('時間計數器測試', () => {
    it('應正確格式化顯示經過時間', () => {
      // Test cases for different time formats
      const testCases = [
        { elapsedTime: 0, expected: '00:00' },
        { elapsedTime: 30, expected: '00:30' },
        { elapsedTime: 65, expected: '01:05' },
        { elapsedTime: 125, expected: '02:05' },
        { elapsedTime: 3665, expected: '61:05' } // Over 1 hour
      ]
      
      testCases.forEach(({ elapsedTime, expected }) => {
        // Arrange & Act
        const { rerender } = render(
          <ProgressIndicator 
            currentStage="serp"
            isActive={true}
            elapsedTime={elapsedTime}
          />
        )
        
        // Assert
        expect(screen.getByText(expected)).toBeInTheDocument()
        
        // Cleanup for next iteration
        rerender(<div />)
      })
    })

    it('60秒限制接近時應顯示警告', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="analysis"
          isActive={true}
          elapsedTime={55} // 接近60秒限制
        />
      )
      
      // Assert
      expect(screen.getByText(/55/)).toBeInTheDocument()
      expect(screen.getByTestId('time-warning')).toBeInTheDocument()
      expect(screen.getByTestId('time-warning')).toHaveClass(/warning|danger/)
    })

    it('超過60秒應顯示超時狀態', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="analysis"
          isActive={true}
          elapsedTime={65} // 超過60秒限制
        />
      )
      
      // Assert
      expect(screen.getByText(/01:05/)).toBeInTheDocument()
      expect(screen.getByTestId('time-overtime')).toBeInTheDocument()
      expect(screen.getByTestId('time-overtime')).toHaveClass(/error|danger/)
    })

    it('暫停狀態時時間應停止更新', async () => {
      // Arrange
      const { rerender } = render(
        <ProgressIndicator 
          currentStage="scraping"
          isActive={false} // 暫停狀態
          elapsedTime={30}
        />
      )
      
      // Act - 模擬時間經過但元件處於暫停狀態
      act(() => {
        vi.advanceTimersByTime(5000) // 5秒
      })
      
      rerender(
        <ProgressIndicator 
          currentStage="scraping"
          isActive={false}
          elapsedTime={30} // 時間不變
        />
      )
      
      // Assert
      expect(screen.getByText('00:30')).toBeInTheDocument()
    })
  })

  describe('視覺動畫測試', () => {
    it('進行中階段應有載入動畫', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="serp"
          isActive={true}
          elapsedTime={10}
        />
      )
      
      // Assert
      const activeStage = screen.getByTestId('stage-serp')
      expect(activeStage).toHaveClass(/loading|spinning|animated/)
    })

    it('已完成階段應有完成動畫', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="scraping"
          isActive={true}
          elapsedTime={15}
          stageProgress={{
            serp: { status: 'completed', duration: 8 },
            scraping: { status: 'in_progress' },
            analysis: { status: 'pending' }
          }}
        />
      )
      
      // Assert
      const completedStage = screen.getByTestId('stage-serp')
      expect(completedStage).toHaveClass(/completed|success/)
      expect(completedStage.querySelector('.checkmark, .success-icon')).toBeInTheDocument()
    })

    it('進度條應正確顯示百分比', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="scraping"
          isActive={true}
          elapsedTime={20}
          stageProgress={{
            serp: { status: 'completed', duration: 8 },
            scraping: { status: 'in_progress', progress: 75 },
            analysis: { status: 'pending' }
          }}
        />
      )
      
      // Assert
      const progressBar = screen.getByTestId('progress-bar-scraping')
      expect(progressBar).toHaveAttribute('aria-valuenow', '75')
      expect(progressBar).toHaveStyle({ width: '75%' })
    })
  })

  describe('錯誤狀態測試', () => {
    it('網路錯誤應正確顯示', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="serp"
          isActive={false}
          elapsedTime={10}
          error={{
            stage: 'serp',
            message: '網路連線失敗，請檢查網路狀態',
            type: 'network_error'
          }}
        />
      )
      
      // Assert
      expect(screen.getByText(/網路連線失敗/i)).toBeInTheDocument()
      expect(screen.getByTestId('stage-serp')).toHaveClass(/error|failed/)
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })

    it('API 錯誤應正確顯示', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="analysis"
          isActive={false}
          elapsedTime={45}
          error={{
            stage: 'analysis',
            message: 'AI 服務暫時無法使用，請稍後重試',
            type: 'api_error'
          }}
        />
      )
      
      // Assert
      expect(screen.getByText(/AI 服務暫時無法使用/i)).toBeInTheDocument()
      expect(screen.getByTestId('stage-analysis')).toHaveClass(/error|failed/)
    })

    it('逾時錯誤應正確顯示', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="scraping"
          isActive={false}
          elapsedTime={65}
          error={{
            stage: 'scraping',
            message: '處理時間超過限制，請重新開始分析',
            type: 'timeout_error'
          }}
        />
      )
      
      // Assert
      expect(screen.getByText(/處理時間超過限制/i)).toBeInTheDocument()
      expect(screen.getByTestId('stage-scraping')).toHaveClass(/error|timeout/)
      expect(screen.getByTestId('time-overtime')).toBeInTheDocument()
    })
  })

  describe('預估時間功能測試', () => {
    it('應顯示各階段預估時間', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="serp"
          isActive={true}
          elapsedTime={5}
          estimatedTimes={{
            serp: 8,
            scraping: 20,
            analysis: 25
          }}
        />
      )
      
      // Assert
      expect(screen.getByText(/預估.*8.*秒/)).toBeInTheDocument()
    })

    it('進行中階段應顯示剩餘時間', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="scraping"
          isActive={true}
          elapsedTime={25}
          stageProgress={{
            serp: { status: 'completed', duration: 8 },
            scraping: { status: 'in_progress', progress: 60 },
            analysis: { status: 'pending' }
          }}
          estimatedTimes={{
            serp: 8,
            scraping: 20, 
            analysis: 25
          }}
        />
      )
      
      // Assert
      // 爬蟲階段已經進行了17秒(25-8)，預估需要20秒，剩餘約3秒
      expect(screen.getByText(/剩餘.*3.*秒/)).toBeInTheDocument()
    })
  })

  describe('響應式設計測試', () => {
    it('在小螢幕上應正確顯示', () => {
      // Arrange - 模擬小螢幕
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone SE 寬度
      })
      
      // Act
      render(
        <ProgressIndicator 
          currentStage="scraping"
          isActive={true}
          elapsedTime={20}
        />
      )
      
      // Assert
      expect(screen.getByTestId('progress-indicator')).toHaveClass(/mobile|compact/)
    })
  })

  describe('無障礙功能測試', () => {
    it('應有適當的 ARIA 標籤', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="analysis"
          isActive={true}
          elapsedTime={40}
          stageProgress={{
            serp: { status: 'completed', duration: 8 },
            scraping: { status: 'completed', duration: 18 },
            analysis: { status: 'in_progress', progress: 75 }
          }}
        />
      )
      
      // Assert
      const progressIndicator = screen.getByTestId('progress-indicator')
      expect(progressIndicator).toHaveAttribute('role', 'progressbar')
      expect(progressIndicator).toHaveAttribute('aria-label')
      
      const analysisStage = screen.getByTestId('stage-analysis')
      expect(analysisStage).toHaveAttribute('aria-current', 'step')
    })

    it('錯誤狀態應有適當的 ARIA 標籤', () => {
      // Arrange & Act
      render(
        <ProgressIndicator 
          currentStage="serp"
          isActive={false}
          elapsedTime={10}
          error={{
            stage: 'serp',
            message: '搜尋服務暫時無法使用',
            type: 'api_error'
          }}
        />
      )
      
      // Assert
      const errorMessage = screen.getByTestId('error-message')
      expect(errorMessage).toHaveAttribute('role', 'alert')
      expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    })
  })
})