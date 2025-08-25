import './globals.css'
import './components.css'
import './progress-animations.css'

// SEO Analyzer 設計令牌
export const theme = {
  // 色彩系統
  colors: {
    // 品牌主色
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#1a73e8', // 主色
      600: '#1557b0',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#0c4a6e',
      950: '#082f49'
    },
    // 語意化顏色
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#34a853',
      600: '#16a34a',
      900: '#14532d'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#fbbc04',
      600: '#d97706',
      900: '#92400e'
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ea4335',
      600: '#dc2626',
      900: '#991b1b'
    },
    // 中性色系
    neutral: {
      50: '#f8f9fa',
      100: '#f1f3f4',
      200: '#e8eaed',
      300: '#dadce0',
      400: '#bdc1c6',
      500: '#5f6368',
      600: '#3c4043',
      700: '#202124',
      800: '#171717',
      900: '#0f0f0f',
      950: '#050505'
    }
  },
  
  // 字體系統
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    mono: ['Fira Code', 'Monaco', 'Consolas', 'monospace'],
    display: ['Inter', 'system-ui', 'sans-serif']
  },
  
  // 字體大小
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }]
  },
  
  // 間距系統 - 8px 基礎網格
  spacing: {
    xs: '0.5rem',    // 8px
    sm: '1rem',      // 16px
    md: '1.5rem',    // 24px
    lg: '2rem',      // 32px
    xl: '3rem',      // 48px
    '2xl': '4rem',   // 64px
    '3xl': '6rem',   // 96px
  },
  
  // 邊框半徑
  borderRadius: {
    none: '0',
    sm: '0.25rem',     // 4px
    md: '0.5rem',      // 8px
    lg: '0.75rem',     // 12px
    xl: '1rem',        // 16px
    '2xl': '1.5rem',   // 24px
    full: '9999px'
  },
  
  // 陰影系統
  boxShadow: {
    xs: '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)',
    sm: '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 2px 6px 2px rgba(60, 64, 67, 0.15)',
    md: '0 2px 4px -1px rgba(60, 64, 67, 0.3), 0 4px 12px -1px rgba(60, 64, 67, 0.15)',
    lg: '0 4px 6px -1px rgba(60, 64, 67, 0.3), 0 8px 20px -2px rgba(60, 64, 67, 0.15)',
    xl: '0 10px 15px -3px rgba(60, 64, 67, 0.3), 0 16px 24px -4px rgba(60, 64, 67, 0.15)',
    '2xl': '0 20px 25px -5px rgba(60, 64, 67, 0.3), 0 25px 50px -12px rgba(60, 64, 67, 0.25)',
    none: 'none',
  },
  
  // 響應式斷點
  screens: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Z-index 層級
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    toast: 1070,
  }
} as const

// 設計令牌類型
export type Theme = typeof theme
export type ThemeColor = keyof typeof theme.colors
export type ThemeSpacing = keyof typeof theme.spacing
export type ThemeFontSize = keyof typeof theme.fontSize

// 深色模式檢測
export const isDarkMode = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches ||
    document.documentElement.classList.contains('dark')
}

// 主題切換工具
export const toggleDarkMode = (enabled?: boolean) => {
  const root = document.documentElement
  const shouldEnable = enabled !== undefined ? enabled : !root.classList.contains('dark')
  
  if (shouldEnable) {
    root.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    root.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

// 初始化主題
export const initTheme = () => {
  const stored = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const shouldBeDark = stored === 'dark' || (!stored && prefersDark)
  
  toggleDarkMode(shouldBeDark)
}