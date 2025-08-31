import { type ReactNode } from 'react'

// 佈局模式類型
export type LayoutMode = 'single' | 'two-column'

// 側邊欄狀態類型
export type SidebarState = 'expanded' | 'collapsed' | 'hidden'

// 雙欄佈局屬性
export interface TwoColumnLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  sidebarState?: SidebarState
  onSidebarToggle?: () => void
  className?: string
}

// 側邊欄屬性
export interface SidebarProps {
  isExpanded?: boolean
  onToggle?: () => void
  className?: string
  children?: ReactNode
}

// 側邊欄區塊屬性
export interface SidebarSectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
  className?: string
}

// 佈局設定
export interface LayoutConfig {
  mode: LayoutMode
  sidebarWidth: {
    expanded: string
    collapsed: string
  }
  breakpoints: {
    mobile: string
    tablet: string
    desktop: string
  }
}

// 預設佈局設定
export const defaultLayoutConfig: LayoutConfig = {
  mode: 'single',
  sidebarWidth: {
    expanded: '25%', // 1/4 寬度
    collapsed: '4rem'
  },
  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1280px'
  }
}