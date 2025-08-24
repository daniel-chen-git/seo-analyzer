import { useState, useEffect } from 'react'
import { config, isDebugMode, isDevelopment } from '@/config'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import Layout from '@/components/layout/Layout'
import './styles/globals.css'

interface AppState {
  isLoading: boolean
  isOnline: boolean
  error: string | null
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    isLoading: true,
    isOnline: navigator.onLine,
    error: null
  })

  // 監聽網路連線狀態
  useEffect(() => {
    const handleOnline = () => {
      setAppState(prev => ({ ...prev, isOnline: true }))
      if (isDebugMode()) {
        console.log('🌐 Connection restored')
      }
    }

    const handleOffline = () => {
      setAppState(prev => ({ ...prev, isOnline: false }))
      if (isDebugMode()) {
        console.log('🔌 Connection lost')
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 模擬初始載入
    const loadingTimer = setTimeout(() => {
      setAppState(prev => ({ ...prev, isLoading: false }))
    }, 1000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearTimeout(loadingTimer)
    }
  }, [])

  // 在 debug 模式下顯示應用狀態
  useEffect(() => {
    if (isDebugMode()) {
      console.group('📱 App State Update')
      console.log('Loading:', appState.isLoading)
      console.log('Online:', appState.isOnline)
      console.log('Error:', appState.error)
      console.groupEnd()
    }
  }, [appState])

  // 全域載入畫面
  if (appState.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{config.app.title} 載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* 連線狀態指示器 */}
        {!appState.isOnline && (
          <div className="bg-warning text-white px-4 py-2 text-center text-sm">
            <span className="inline-flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              目前處於離線模式
            </span>
          </div>
        )}
        
        <Layout>
          {/* 主要內容區域 */}
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              {/* 歡迎區塊 */}
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  <span className="text-primary">🔍 {config.app.title}</span>
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                  {config.app.description}
                </p>
                
                {/* 開發狀態指示器 */}
                {isDevelopment() && (
                  <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm mb-6">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    開發模式 - React {import.meta.env.REACT_VERSION} + Vite 6 + Tailwind CSS 4
                  </div>
                )}
              </div>

              {/* 功能預覽卡片 */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="card group hover:shadow-lg transition-shadow">
                  <div className="text-3xl mb-4">🎯</div>
                  <h3 className="text-lg font-semibold mb-2">關鍵字分析</h3>
                  <p className="text-gray-600 text-sm">深度分析關鍵字競爭度和搜尋意圖</p>
                </div>
                
                <div className="card group hover:shadow-lg transition-shadow">
                  <div className="text-3xl mb-4">📊</div>
                  <h3 className="text-lg font-semibold mb-2">SERP 分析</h3>
                  <p className="text-gray-600 text-sm">全面分析搜尋結果頁面競爭情況</p>
                </div>
                
                <div className="card group hover:shadow-lg transition-shadow">
                  <div className="text-3xl mb-4">✍️</div>
                  <h3 className="text-lg font-semibold mb-2">內容生成</h3>
                  <p className="text-gray-600 text-sm">AI 驅動的 SEO 優化內容建議</p>
                </div>
              </div>

              {/* 開始使用按鈕 */}
              <div className="text-center">
                <button className="btn-primary text-lg px-8 py-3">
                  開始分析
                </button>
              </div>

              {/* 除錯資訊 */}
              {isDebugMode() && (
                <div className="mt-12 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">🔧 除錯資訊</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>環境: {config.app.environment}</div>
                    <div>版本: {config.app.version}</div>
                    <div>API 端點: {config.api.baseUrl}</div>
                    <div>連線狀態: {appState.isOnline ? '線上' : '離線'}</div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </Layout>
      </div>
    </ErrorBoundary>
  )
}

export default App
