import React, { useState } from 'react'
import type { TwoColumnLayoutProps, SidebarState } from '@/types/layout'

/**
 * 雙欄佈局組件
 * 使用 CSS Grid 實現響應式雙欄佈局，左側邊欄 1/4 寬度，主內容區 3/4 寬度
 */
const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({
  sidebar,
  children,
  sidebarState: controlledSidebarState,
  onSidebarToggle,
  className = ''
}) => {
  // 內部狀態管理（如果沒有外部控制）
  const [internalSidebarState, setInternalSidebarState] = useState<SidebarState>('expanded')
  
  // 使用外部控制或內部狀態
  const sidebarState = controlledSidebarState || internalSidebarState
  
  // 處理側邊欄切換
  const handleSidebarToggle = () => {
    if (onSidebarToggle) {
      onSidebarToggle()
    } else {
      setInternalSidebarState(prevState => 
        prevState === 'expanded' ? 'collapsed' : 'expanded'
      )
    }
  }

  // 根據側邊欄狀態決定 CSS 類別
  const getLayoutClasses = () => {
    const baseClasses = 'two-column-layout min-h-full'
    
    switch (sidebarState) {
      case 'expanded':
        return `${baseClasses} two-column-layout--expanded`
      case 'collapsed':
        return `${baseClasses} two-column-layout--collapsed`
      case 'hidden':
        return `${baseClasses} two-column-layout--hidden`
      default:
        return `${baseClasses} two-column-layout--expanded`
    }
  }

  return (
    <div className={`${getLayoutClasses()} ${className}`}>
      {/* 側邊欄區域 */}
      {sidebarState !== 'hidden' && (
        <aside 
          className="two-column-layout__sidebar"
          onClick={(e) => e.stopPropagation()} // 防止 sidebar 點擊觸發收合
        >
          {/* 側邊欄切換按鈕 (手機版顯示) */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleSidebarToggle()
            }}
            className="sidebar-toggle md:hidden fixed top-4 left-4 z-50 px-3 py-2 bg-white border border-neutral-300 rounded-md shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary flex items-center gap-2"
            tabIndex={-1}
            aria-label={sidebarState === 'expanded' ? '收合側邊欄' : '展開側邊欄'}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {sidebarState === 'expanded' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
            <span className="text-sm font-medium">
              {sidebarState === 'expanded' ? '收合' : '選單'}
            </span>
          </button>
          
          {/* 側邊欄內容 */}
          <div className="sidebar-content">
            {sidebar}
          </div>
        </aside>
      )}

      {/* 主內容區域 */}
      <main 
        className="two-column-layout__main"
        onClick={() => {
          // 桌面版點擊 main content 收合 sidebar
          if (sidebarState === 'expanded' && onSidebarToggle) {
            const isDesktop = window.innerWidth >= 768 // md breakpoint
            if (isDesktop) {
              onSidebarToggle()
            }
          }
        }}
      >
        
        {/* 主內容 */}
        <div 
          className="main-content"
          onClick={(e) => e.stopPropagation()} // 防止內容區域的點擊觸發收合
        >
          {children}
        </div>
      </main>

      {/* 手機版遮罩（只在手機版且側邊欄展開時顯示） */}
      {sidebarState === 'expanded' && (
        <div 
          className="sidebar-overlay hidden max-md:block fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={handleSidebarToggle}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

export default TwoColumnLayout