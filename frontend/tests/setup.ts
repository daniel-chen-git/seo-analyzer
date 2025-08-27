/**
 * Vitest 測試環境設定
 * 
 * 提供 React Testing Library 整合、DOM 環境設定、
 * 全域 Mock 配置和測試工具初始化。
 */

import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// 每個測試後清理 DOM
afterEach(() => {
  cleanup()
})

// 全域 Mock - fetch API
global.fetch = vi.fn()

// 全域 Mock - window.matchMedia (響應式設計測試用)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// 全域 Mock - IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// 測試環境變數
process.env.VITE_API_BASE_URL = 'http://localhost:8000'