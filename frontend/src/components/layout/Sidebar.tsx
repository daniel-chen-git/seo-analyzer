import React from 'react'
import type { SidebarProps } from '@/types/layout'

/**
 * 側邊欄區塊組件
 */
interface SidebarSectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ 
  title, 
  icon, 
  children, 
  className = '' 
}) => (
  <div className={`sidebar-section ${className}`}>
    <h3 className="sidebar-section__title">
      {icon && <span className="sidebar-section__icon">{icon}</span>}
      <span>{title}</span>
    </h3>
    <div className="sidebar-section__content">
      {children}
    </div>
  </div>
)

/**
 * 主要側邊欄組件
 */
const Sidebar: React.FC<SidebarProps> = ({ 
  isExpanded = true, 
  className = '',
  children,
  analysisResult,
  isAnalysisCompleted = false
}) => {

  // 動態導航項目
  const navigationItems = [
    { 
      name: '競爭分析', 
      href: isAnalysisCompleted && analysisResult ? '#competitive-analysis' : '#',
      disabled: !isAnalysisCompleted,
      icon: '📊'
    },
    { 
      name: '內容建議', 
      href: isAnalysisCompleted && analysisResult ? '#content-suggestions' : '#',
      disabled: !isAnalysisCompleted,
      icon: '✍️'
    },
    { 
      name: 'SERP 洞察', 
      href: isAnalysisCompleted && analysisResult ? '#serp-insights' : '#',
      disabled: !isAnalysisCompleted,
      icon: '🔍'
    },
    { 
      name: '趨勢追蹤', 
      href: '#trends',
      disabled: false, // 保持可用
      icon: '📈'
    },
  ]

  // 快速操作項目
  const quickActions = [
    { name: '新增分析', action: 'new-analysis', icon: '🆕' },
    { name: '分析歷史', action: 'history', icon: '📂' },
    { name: '匯出報告', action: 'export', icon: '📥' },
    { name: '設定選項', action: 'settings', icon: '⚙️' },
  ]

  const handleActionClick = (action: string) => {
    console.log(`側邊欄操作: ${action}`)
    // TODO: 實作具體操作邏輯
  }

  // 處理導航連結點擊
  const handleNavClick = (href: string, disabled: boolean) => {
    if (disabled) {
      return false // 禁用連結
    }
    // 平滑滾動到目標區域
    const targetElement = document.querySelector(href)
    if (targetElement) {
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      })
      
      // 添加高亮效果
      targetElement.classList.add('highlight-flash')
      setTimeout(() => {
        targetElement.classList.remove('highlight-flash')
      }, 2000)
    }
  }

  return (
    <div className={`sidebar ${isExpanded ? 'sidebar--expanded' : 'sidebar--collapsed'} ${className}`}>
      {/* 側邊欄標題 */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          🎯 <span className="sidebar-title__text">關鍵字分析</span>
        </h2>
      </div>

      {/* 側邊欄內容 */}
      <div className="sidebar-body">
        {/* 主要功能區塊 */}
        <SidebarSection 
          title="主要功能" 
          icon="🎯"
          className="mb-6"
        >
          <nav className="sidebar-nav">
            <ul className="sidebar-nav__list">
              {navigationItems.map((item) => (
                <li key={item.name} className="sidebar-nav__item">
                  <a
                    href={item.href}
                    className={`sidebar-nav__link ${
                      item.disabled ? 'sidebar-nav__link--disabled' : ''
                    }`}
                    onClick={(e) => {
                      e.preventDefault()
                      handleNavClick(item.href, item.disabled)
                    }}
                    title={item.disabled ? '請先完成SEO分析' : `跳轉到${item.name}`}
                  >
                    <span className="sidebar-nav__icon">{item.icon}</span>
                    <span className="sidebar-nav__text">{item.name}</span>
                    {item.disabled && (
                      <span className="sidebar-nav__badge">需完成分析</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </SidebarSection>

        {/* 快速操作區塊 */}
        <SidebarSection 
          title="快速操作" 
          icon="⚡"
          className="mb-6"
        >
          <div className="quick-actions">
            {quickActions.map((action) => (
              <button
                key={action.name}
                onClick={() => handleActionClick(action.action)}
                className="quick-action-button"
              >
                <span className="quick-action-button__icon">{action.icon}</span>
                <span className="quick-action-button__text">{action.name}</span>
              </button>
            ))}
          </div>
        </SidebarSection>

        {/* 系統狀態區塊 */}
        <SidebarSection 
          title="系統狀態" 
          icon="📡"
          className="sidebar-section--status"
        >
          <div className="system-status">
            <div className="status-item">
              <div className="status-indicator status-indicator--online"></div>
              <div className="status-content">
                <span className="status-label">後端服務</span>
                <span className="status-value">正常</span>
              </div>
            </div>
            
            <div className="status-item">
              <div className="status-indicator status-indicator--fast"></div>
              <div className="status-content">
                <span className="status-label">API 回應</span>
                <span className="status-value">快速</span>
              </div>
            </div>

            <div className="status-item">
              <div className="status-indicator status-indicator--synced"></div>
              <div className="status-content">
                <span className="status-label">同步狀態</span>
                <span className="status-value">已同步</span>
              </div>
            </div>
          </div>
        </SidebarSection>

        {/* 自訂內容區域 */}
        {children && (
          <div className="sidebar-custom">
            {children}
          </div>
        )}
      </div>

      {/* 側邊欄底部 */}
      <div className="sidebar-footer">
        <div className="sidebar-footer__content">
          <div className="sidebar-version">
            <span className="sidebar-version__label">版本</span>
            <span className="sidebar-version__number">v0.1.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
export { SidebarSection }