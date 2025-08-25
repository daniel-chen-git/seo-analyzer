import { useState, useEffect } from 'react'
import { config, getConfig, isDevelopment } from '@/config'
import { devTools } from '@/utils/devTools'

interface DevPanelProps {
  isOpen?: boolean
  onToggle?: (open: boolean) => void
}

function DevPanel({ isOpen = false, onToggle }: DevPanelProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'errors' | 'system' | 'tools'>('config')
  const [devInfo, setDevInfo] = useState(devTools.getDevInfo())

  // 如果不是開發環境，不顯示面板
  if (!isDevelopment()) {
    return null
  }

  // 定期更新開發資訊
  useEffect(() => {
    const interval = setInterval(() => {
      setDevInfo(devTools.getDevInfo())
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const runTests = () => {
    devTools.runTests()
    setDevInfo(devTools.getDevInfo())
  }

  const clearErrors = () => {
    devTools.errorCollector.clearErrors()
    setDevInfo(devTools.getDevInfo())
  }

  const clearMetrics = () => {
    devTools.performance.clearMetrics()
    setDevInfo(devTools.getDevInfo())
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => onToggle?.(true)}
        className="fixed bottom-4 right-4 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors z-50"
        title="開啟開發者面板"
      >
        🔧
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full h-2/3 rounded-t-lg shadow-2xl flex flex-col">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold">🔧 開發者面板</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {config.app.version}
            </span>
          </div>
          <button
            onClick={() => onToggle?.(false)}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* 標籤導航 */}
        <div className="flex border-b">
          {[
            { key: 'config', label: '配置', icon: '⚙️' },
            { key: 'errors', label: '錯誤', icon: '🚨' },
            { key: 'system', label: '系統', icon: '💻' },
            { key: 'tools', label: '工具', icon: '🔧' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* 內容區域 */}
        <div className="flex-1 overflow-auto p-4">
          
          {/* 配置標籤 */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-3">應用配置</h3>
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(getConfig(), null, 2)}
              </pre>
              <div className="flex space-x-2">
                <button 
                  onClick={() => console.log('Config:', getConfig())}
                  className="btn bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs px-3 py-1"
                >
                  輸出到控制台
                </button>
              </div>
            </div>
          )}

          {/* 錯誤標籤 */}
          {activeTab === 'errors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">錯誤記錄 ({devInfo.errors.length})</h3>
                <div className="space-x-2">
                  <button 
                    onClick={clearErrors}
                    className="btn bg-red-50 text-red-700 hover:bg-red-100 text-xs px-3 py-1"
                  >
                    清除
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded max-h-96 overflow-auto">
                {devInfo.errors.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">暫無錯誤記錄</div>
                ) : (
                  <div className="divide-y">
                    {devInfo.errors.map((error, index) => (
                      <div key={index} className="p-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="font-semibold text-red-600">
                            {error.type.toUpperCase()}
                          </span>
                          <span className="text-xs bg-red-100 text-red-700 px-1 rounded">
                            {error.severity}
                          </span>
                        </div>
                        <div className="mt-1 text-gray-700">{error.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 系統標籤 */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-3">系統資訊</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium mb-2">環境</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>開發模式: {devInfo.environment.isDevelopment ? '是' : '否'}</div>
                    <div>除錯模式: {devInfo.environment.isDebugMode ? '是' : '否'}</div>
                    <div>線上狀態: {devInfo.environment.online ? '是' : '否'}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium mb-2">視窗</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>寬度: {devInfo.environment.viewport.width}px</div>
                    <div>高度: {devInfo.environment.viewport.height}px</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium mb-2">效能指標</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>記錄數: {devInfo.metrics.length}</div>
                    {devInfo.metrics.length > 0 && (
                      <div>最新: {devInfo.metrics[devInfo.metrics.length - 1]?.name}</div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium mb-2">應用資訊</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>名稱: {devInfo.config.app.title}</div>
                    <div>版本: {devInfo.config.app.version}</div>
                    <div>環境: {devInfo.config.app.environment}</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium mb-2">User Agent</h4>
                <div className="text-xs text-gray-600 break-all">
                  {devInfo.environment.userAgent}
                </div>
              </div>
            </div>
          )}

          {/* 工具標籤 */}
          {activeTab === 'tools' && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-3">開發工具</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={runTests}
                  className="btn bg-green-50 text-green-700 hover:bg-green-100 p-4 text-center rounded border"
                >
                  <div className="text-2xl mb-2">🧪</div>
                  <div className="font-medium">執行測試</div>
                  <div className="text-xs text-gray-500">測試各個開發工具</div>
                </button>

                <button
                  onClick={clearMetrics}
                  className="btn bg-blue-50 text-blue-700 hover:bg-blue-100 p-4 text-center rounded border"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-medium">清除指標</div>
                  <div className="text-xs text-gray-500">清除效能記錄</div>
                </button>

                <button
                  onClick={() => console.log('Dev Info:', devInfo)}
                  className="btn bg-purple-50 text-purple-700 hover:bg-purple-100 p-4 text-center rounded border"
                >
                  <div className="text-2xl mb-2">🔍</div>
                  <div className="font-medium">控制台輸出</div>
                  <div className="text-xs text-gray-500">輸出完整資訊</div>
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="btn bg-yellow-50 text-yellow-700 hover:bg-yellow-100 p-4 text-center rounded border"
                >
                  <div className="text-2xl mb-2">🔄</div>
                  <div className="font-medium">重新載入</div>
                  <div className="text-xs text-gray-500">重新載入頁面</div>
                </button>
              </div>

              {/* 最近的效能指標 */}
              {devInfo.metrics.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-2">最近效能指標</h4>
                  <div className="bg-gray-50 rounded max-h-48 overflow-auto">
                    <div className="divide-y">
                      {devInfo.metrics.slice(-10).reverse().map((metric, index) => (
                        <div key={index} className="p-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{metric.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-blue-600">{metric.duration}ms</span>
                              <span className="text-gray-400">
                                {new Date(metric.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DevPanel