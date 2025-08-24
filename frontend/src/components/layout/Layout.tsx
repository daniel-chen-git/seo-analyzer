import { type ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'

interface LayoutProps {
  children: ReactNode
  className?: string
}

function Layout({ children, className = '' }: LayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="flex-1">
        {children}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  )
}

export default Layout