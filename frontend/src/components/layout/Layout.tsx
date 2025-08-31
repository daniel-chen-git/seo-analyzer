import { type ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'
import TwoColumnLayout from './TwoColumnLayout'
import Sidebar from './Sidebar'
import type { LayoutMode, SidebarState } from '@/types/layout'

interface LayoutProps {
  children: ReactNode
  className?: string
  mode?: LayoutMode
  sidebarState?: SidebarState
  onSidebarToggle?: () => void
  sidebarContent?: ReactNode
  // 新增分析狀態支援
  analysisResult?: any
  isAnalysisCompleted?: boolean
}

function Layout({ 
  children, 
  className = '',
  mode = 'single',
  sidebarState = 'expanded',
  onSidebarToggle,
  sidebarContent,
  analysisResult,
  isAnalysisCompleted = false
}: LayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="flex-1">
        {mode === 'two-column' ? (
          <TwoColumnLayout
            sidebar={sidebarContent || (
              <Sidebar 
                isExpanded={sidebarState === 'expanded'}
                analysisResult={analysisResult}
                isAnalysisCompleted={isAnalysisCompleted}
              />
            )}
            sidebarState={sidebarState}
            onSidebarToggle={onSidebarToggle}
          >
            {children}
          </TwoColumnLayout>
        ) : (
          children
        )}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  )
}

export default Layout