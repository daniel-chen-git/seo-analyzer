import { Component, type ErrorInfo, type ReactNode } from 'react'
import { config, isDebugMode, isDevelopment } from '@/config'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // 在除錯模式下記錄詳細錯誤資訊
    if (isDebugMode()) {
      console.group('🚨 Error Boundary Caught Error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }

    // 在生產環境下可以集成錯誤回報服務
    if (config.features.errorReporting && config.services?.sentry) {
      // TODO: 整合 Sentry 錯誤回報
      console.warn('Error reporting to external service would be implemented here')
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // 使用自定義 fallback UI 或預設錯誤頁面
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            {/* 錯誤圖示 */}
            <div className="mb-6">
              <svg 
                className="w-16 h-16 text-error mx-auto mb-4" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>

            {/* 錯誤標題 */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              糟糕，發生了錯誤
            </h1>

            {/* 錯誤描述 */}
            <p className="text-gray-600 mb-8">
              {isDevelopment() 
                ? '應用程式遇到了未預期的錯誤，請查看瀏覽器控制台獲取詳細資訊。'
                : '很抱歉，應用程式遇到了問題。請嘗試重新載入頁面。'
              }
            </p>

            {/* 操作按鈕 */}
            <div className="space-y-4">
              <button
                onClick={this.handleRetry}
                className="btn-primary w-full"
              >
                重試
              </button>
              
              <button
                onClick={this.handleRefresh}
                className="btn w-full bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                重新載入頁面
              </button>
            </div>

            {/* 開發模式下的詳細錯誤資訊 */}
            {isDevelopment() && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                  顯示錯誤詳情 (開發模式)
                </summary>
                <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-left overflow-auto max-h-48">
                  <div className="text-red-600 font-semibold mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre className="text-gray-600 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-4">
                      <div className="text-blue-600 font-semibold mb-1">Component Stack:</div>
                      <pre className="text-gray-600 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* 應用程式資訊 */}
            <div className="mt-8 text-xs text-gray-400">
              {config.app.title} v{config.app.version}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary