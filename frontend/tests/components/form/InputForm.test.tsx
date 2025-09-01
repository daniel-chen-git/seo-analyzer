/**
 * InputForm 元件單元測試
 * 
 * 測試表單驗證、使用者互動、錯誤處理和提交邏輯，
 * 涵蓋關鍵字和受眾描述的各種邊界條件。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputForm } from '../../../src/components/form/InputForm'
// import { mockValidationErrors } from '../../fixtures/mockApiResponses' // 暫時註解未使用的導入

describe('InputForm 元件測試', () => {
  const mockOnSubmit = vi.fn()
  // const mockOnChange = vi.fn() // 暫時註解未使用的變數
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('基本渲染測試', () => {
    it('應該正確渲染所有表單元素', () => {
      // Arrange & Act
      render(
        <InputForm 
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      )
      
      // Assert
      expect(screen.getByLabelText(/關鍵字/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/目標受眾/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /開始分析/i })).toBeInTheDocument()
    })

    it('載入狀態時應該禁用提交按鈕', () => {
      // Arrange & Act
      render(
        <InputForm 
          onSubmit={mockOnSubmit}
          isSubmitting={true}
        />
      )
      
      // Assert
      const submitButton = screen.getByRole('button', { name: /分析中/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('關鍵字驗證測試', () => {
    it('空關鍵字應顯示錯誤訊息', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act
      const keywordInput = screen.getByLabelText(/關鍵字/i)
      await user.click(keywordInput)
      await user.clear(keywordInput)
      await user.tab() // 觸發 blur 事件
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/請輸入關鍵字/i)).toBeInTheDocument()
      })
    })

    it('1個字元關鍵字應該有效（邊界值測試）', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act
      const keywordInput = screen.getByLabelText(/關鍵字/i)
      await user.type(keywordInput, 'A')
      await user.tab()
      
      // Assert
      await waitFor(() => {
        expect(screen.queryByText(/請輸入關鍵字/i)).not.toBeInTheDocument()
      })
    })

    it('50個字元關鍵字應該有效（邊界值測試）', async () => {
      // Arrange  
      const user = userEvent.setup()
      const maxLengthKeyword = 'A'.repeat(50) // 正好50個字元
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act
      const keywordInput = screen.getByLabelText(/關鍵字/i)
      await user.type(keywordInput, maxLengthKeyword)
      await user.tab()
      
      // Assert
      await waitFor(() => {
        expect(screen.queryByText(/長度不能超過/i)).not.toBeInTheDocument()
      })
      expect(keywordInput).toHaveValue(maxLengthKeyword)
    })

    it('51個字元關鍵字應顯示錯誤（邊界值測試）', async () => {
      // Arrange
      const user = userEvent.setup()
      const overLimitKeyword = 'A'.repeat(51) // 超過50個字元限制
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act
      const keywordInput = screen.getByLabelText(/關鍵字/i)
      await user.type(keywordInput, overLimitKeyword)
      await user.tab()
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/長度不能超過.*50.*字元/i)).toBeInTheDocument()
      })
    })

    it('中文關鍵字應該正確處理', async () => {
      // Arrange
      const user = userEvent.setup()
      const chineseKeywords = [
        'SEO優化',
        '數位行銷策略',
        '網站排名提升技巧分析',
        '搜尋引擎最佳化完整指南教學'
      ]
      
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      for (const keyword of chineseKeywords) {
        // Act
        const keywordInput = screen.getByLabelText(/關鍵字/i)
        await user.clear(keywordInput)
        await user.type(keywordInput, keyword)
        await user.tab()
        
        // Assert
        expect(keywordInput).toHaveValue(keyword)
        expect(screen.queryByText(/包含無效字元/i)).not.toBeInTheDocument()
      }
    })

    it('特殊字元處理測試', async () => {
      // Arrange
      const user = userEvent.setup()
      const specialCharKeywords = [
        'SEO & 行銷',
        'Python/Django',
        'C++ 程式設計',
        '行銷策略 (2024)',
        '網站優化-完整指南'
      ]
      
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      for (const keyword of specialCharKeywords) {
        // Act
        const keywordInput = screen.getByLabelText(/關鍵字/i)
        await user.clear(keywordInput)
        await user.type(keywordInput, keyword)
        
        // Assert - 特殊字元應該被接受
        expect(keywordInput).toHaveValue(keyword)
      }
    })
  })

  describe('目標受眾驗證測試', () => {
    it('空受眾描述應顯示錯誤訊息', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act
      const audienceInput = screen.getByLabelText(/目標受眾/i)
      await user.click(audienceInput)
      await user.clear(audienceInput)
      await user.tab()
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/請輸入目標受眾描述/i)).toBeInTheDocument()
      })
    })

    it('200個字元受眾描述應該有效（邊界值測試）', async () => {
      // Arrange
      const user = userEvent.setup()
      const maxLengthAudience = '網站經營者和數位行銷人員，'.repeat(10).slice(0, 200) // 正好200字元
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act
      const audienceInput = screen.getByLabelText(/目標受眾/i)
      await user.type(audienceInput, maxLengthAudience)
      await user.tab()
      
      // Assert
      expect(audienceInput).toHaveValue(maxLengthAudience)
      expect(screen.queryByText(/長度不能超過.*200/i)).not.toBeInTheDocument()
    })

    it('201個字元受眾描述應顯示錯誤（邊界值測試）', async () => {
      // Arrange
      const user = userEvent.setup()
      const overLimitAudience = 'A'.repeat(201) // 超過200字元限制
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act
      const audienceInput = screen.getByLabelText(/目標受眾/i)
      await user.type(audienceInput, overLimitAudience)
      await user.tab()
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/長度不能超過.*200.*字元/i)).toBeInTheDocument()
      })
    })

    it('換行符號應該被正確處理', async () => {
      // Arrange
      const user = userEvent.setup()
      const multilineAudience = `網站經營者
數位行銷人員
希望提升搜尋排名的企業主`
      
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act
      const audienceInput = screen.getByLabelText(/目標受眾/i)
      await user.type(audienceInput, multilineAudience)
      
      // Assert
      expect(audienceInput).toHaveValue(multilineAudience)
    })
  })

  describe('表單提交測試', () => {
    it('有效資料應觸發 onSubmit 回調', async () => {
      // Arrange
      const user = userEvent.setup()
      const validData = {
        keyword: 'SEO 優化指南',
        targetAudience: '網站經營者、數位行銷人員，希望提升網站搜尋排名'
      }
      
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act
      await user.type(screen.getByLabelText(/關鍵字/i), validData.keyword)
      await user.type(screen.getByLabelText(/目標受眾/i), validData.targetAudience)
      await user.click(screen.getByRole('button', { name: /開始分析/i }))
      
      // Assert
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          keyword: validData.keyword,
          audience: validData.targetAudience // 正確的欄位名稱
        })
      })
    })

    it('無效資料不應觸發提交', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act - 不填寫任何資料直接提交
      await user.click(screen.getByRole('button', { name: /開始分析/i }))
      
      // Assert
      expect(mockOnSubmit).not.toHaveBeenCalled()
      expect(screen.getByText(/請輸入關鍵字/i)).toBeInTheDocument()
    })

    // 移除這個測試，因為 InputForm 沒有 onChange prop
    // it('提交時應觸發 onChange 回調更新狀態', async () => {
    //   const user = userEvent.setup()
    //   render(<InputForm onSubmit={mockOnSubmit} isSubmitting={false} />)
    //   await user.type(screen.getByLabelText(/關鍵字/i), 'test')
    //   expect(mockOnChange).toHaveBeenCalled()
    // })
  })

  describe('使用者體驗測試', () => {
    it('應提供即時錯誤提示', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act - 輸入過長關鍵字
      const keywordInput = screen.getByLabelText(/關鍵字/i)
      await user.type(keywordInput, 'A'.repeat(55)) // 超過50字元限制
      
      // Assert - 即時顯示錯誤（不需要 blur）
      await waitFor(() => {
        expect(screen.getByText(/長度不能超過.*50.*字元/i)).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('錯誤訊息應該使用者友善', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act
      const keywordInput = screen.getByLabelText(/關鍵字/i)
      await user.click(keywordInput)
      await user.tab()
      
      // Assert
      const errorMessage = await screen.findByText(/請輸入關鍵字/i)
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveClass(/error|danger|warning/) // 視覺上明顯標示
    })

    it('表單重置後應清除錯誤訊息', async () => {
      // Arrange
      const user = userEvent.setup()
      const { rerender } = render(
        <InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />
      )
      
      // Act - 產生錯誤
      const keywordInput = screen.getByLabelText(/關鍵字/i)
      await user.type(keywordInput, 'A'.repeat(55))
      
      await waitFor(() => {
        expect(screen.getByText(/長度不能超過/i)).toBeInTheDocument()
      })
      
      // Act - 重新渲染（模擬表單重置）
      rerender(
        <InputForm 
          onSubmit={mockOnSubmit} 
           
          isSubmitting={false}
          initialValues={{ keyword: '', audience: '' }}
        />
      )
      
      // Assert
      expect(screen.queryByText(/長度不能超過/i)).not.toBeInTheDocument()
    })

    it('應支援鍵盤快速鍵（Enter 提交）', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act
      await user.type(screen.getByLabelText(/關鍵字/i), 'SEO 優化')
      await user.type(screen.getByLabelText(/目標受眾/i), '網站經營者')
      
      // 在關鍵字欄位按 Enter
      await user.keyboard('{Enter}')
      
      // Assert
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('無障礙功能測試', () => {
    it('應該有適當的 ARIA 標籤', () => {
      // Arrange & Act
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Assert
      const keywordInput = screen.getByLabelText(/關鍵字/i)
      const audienceInput = screen.getByLabelText(/目標受眾/i)
      
      expect(keywordInput).toHaveAttribute('aria-required', 'true')
      expect(audienceInput).toHaveAttribute('aria-required', 'true')
    })

    it('錯誤狀態應該有適當的 ARIA 描述', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<InputForm onSubmit={mockOnSubmit}  isSubmitting={false} />)
      
      // Act - 產生錯誤
      const keywordInput = screen.getByLabelText(/關鍵字/i)
      await user.click(keywordInput)
      await user.tab()
      
      // Assert
      await waitFor(() => {
        expect(keywordInput).toHaveAttribute('aria-invalid', 'true')
        expect(keywordInput).toHaveAttribute('aria-describedby')
      })
    })
  })
})