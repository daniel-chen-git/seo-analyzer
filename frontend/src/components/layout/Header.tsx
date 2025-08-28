import { useState } from 'react'
import { config, isDevelopment, isDebugMode } from '@/config'

function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const navigation = [
    { name: '首頁', href: '#', current: true },
    { name: '關鍵字分析', href: '#analyze', current: false },
    { name: '使用教學', href: '#guide', current: false },
    { name: '關於我們', href: '#about', current: false },
  ]

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo 區域 */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-primary">
                🔍 {config.app.title}
              </span>
              {isDevelopment() && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                  開發版
                </span>
              )}
            </div>
          </div>

          {/* 桌面版導航 */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  item.current
                    ? 'text-primary bg-primary/10'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* 右側操作區 */}
          <div className="hidden md:flex items-center space-x-4">
            {/* 連線狀態指示器 */}
            <div className="flex items-center">
              <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
              <span className="text-xs text-gray-500">已連線</span>
            </div>

            {/* 開始分析按鈕 */}
            <button className="btn-primary text-sm px-4 py-2">
              開始分析
            </button>

            {/* 除錯資訊 (開發模式) */}
            {isDebugMode() && (
              <div className="text-xs text-gray-400 font-mono">
                v{config.app.version}
              </div>
            )}
          </div>

          {/* 手機版選單按鈕 */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              aria-expanded="false"
              onClick={toggleMobileMenu}
            >
              <span className="sr-only">開啟主選單</span>
              {/* Hamburger icon */}
              {!isMobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 手機版選單 */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                  item.current
                    ? 'text-primary bg-primary/10'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-current={item.current ? 'page' : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            
            {/* 手機版操作區 */}
            <div className="pt-4 pb-2 border-t border-gray-200 mt-4">
              <div className="flex items-center justify-between px-3">
                {/* 連線狀態 */}
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">已連線</span>
                </div>
                
                {/* 版本資訊 */}
                {isDebugMode() && (
                  <div className="text-xs text-gray-400 font-mono">
                    v{config.app.version}
                  </div>
                )}
              </div>
              
              <div className="mt-3 px-3">
                <button className="btn-primary w-full text-sm py-2">
                  開始分析
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header