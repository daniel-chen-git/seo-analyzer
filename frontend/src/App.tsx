import { useState, useEffect } from 'react'
import { config, isDebugMode, isDevelopment } from '@/config'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import Layout from '@/components/layout/Layout'
import MainContent from '@/components/layout/MainContent'
import DevPanel from '@/components/ui/DevPanel'
import { InputForm } from '@/components/form'
import { ProgressIndicator } from '@/components/progress'
import { useAnalysis, useErrorHandling } from '@/hooks/api'
import ReactMarkdown from 'react-markdown'
// 移除不需要的狀態映射導入
import type { AnalyzeFormData } from '@/types/form'
import type { AnalyzeRequest } from '@/types/api'
// 開發工具會在 DevPanel 中載入
import './styles/globals.css'

interface AppState {
  isLoading: boolean
  isOnline: boolean
  error: string | null
}

interface HealthStatus {
  status: string;
  timestamp: string;
  services: Record<string, string>;
}

// 型別輔助函數，避免 any
const getResultData = (result: any) => result as {
  processing_time?: number;
  data?: {
    serp_summary?: {
      total_results: number;
      successful_scrapes: number;
      avg_word_count: number;
      avg_paragraphs: number;
    };
    analysis_report?: string;
    metadata?: {
      token_usage?: number;
      phase_timings?: {
        serp_duration?: number;
        scraping_duration?: number;
        ai_duration?: number;
      };
    };
  };
}

function App() {
  // 基本應用狀態
  const [appState, setAppState] = useState<AppState>({
    isLoading: true,
    isOnline: navigator.onLine,
    error: null
  })
  const [devPanelOpen, setDevPanelOpen] = useState(false)
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [showForm, setShowForm] = useState(true);
  
  // 雙欄佈局狀態
  const [layoutMode, setLayoutMode] = useState<'single' | 'two-column'>('two-column');
  const [sidebarState, setSidebarState] = useState<'expanded' | 'collapsed' | 'hidden'>('expanded');

  // 企業級 Hooks 整合
  const analysisHook = useAnalysis({
    enableWebSocket: false,
    pollingConfig: {
      enabled: true,
      interval: 2000,
      maxPolls: 150
    }
  })
  const { handleError } = useErrorHandling()

  // 從 useAnalysis 計算衍生狀態
  const isAnalyzing = analysisHook.isRunning || analysisHook.status === 'starting'
  const progressState = analysisHook.progress ? {
    ...analysisHook.progress,
    canCancel: analysisHook.canCancel
  } : (analysisHook.status !== 'idle' ? {
    currentStage: 1 as 1 | 2 | 3,
    overallProgress: 0,
    stageProgress: 0,
    status: analysisHook.status,
    stages: {
      serp: { 
        status: 'pending' as const, 
        progress: 0, 
        startTime: undefined,
        completedTime: undefined,
        subtasks: [],
        currentSubtask: '準備開始 SERP 分析',
        statusMessage: '準備分析搜尋結果'
      },
      crawler: { 
        status: 'pending' as const, 
        progress: 0, 
        startTime: undefined,
        completedTime: undefined,
        subtasks: [],
        currentSubtask: '準備開始網頁爬取',
        statusMessage: '準備爬取網頁內容'
      },
      ai: { 
        status: 'pending' as const, 
        progress: 0, 
        startTime: undefined,
        completedTime: undefined,
        subtasks: [],
        currentSubtask: '準備開始 AI 分析',
        statusMessage: '準備 AI 分析'
      }
    },
    timing: {
      startTime: new Date(),
      currentStageStartTime: new Date(),
      estimatedTotalTime: 60,
      estimatedRemainingTime: 60
    },
    jobId: 'default-job-id',
    canCancel: analysisHook.canCancel
  } : null)
  const hasError = analysisHook.error || appState.error

  // 健康檢查測試
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${config.api.baseUrl}/api/health`);
        const data = await response.json();
        setHealthStatus(data);
        if (isDebugMode()) {
          console.log('🔗 Backend health check successful:', data);
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setHealthStatus({ status: 'error', timestamp: new Date().toISOString(), services: {} });
      } finally {
        setHealthLoading(false);
      }
    };

    checkHealth();
  }, []);

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

    // 快速初始載入
    const loadingTimer = setTimeout(() => {
      setAppState(prev => ({ ...prev, isLoading: false }))
      
      // 記錄應用啟動完成
      if (isDevelopment()) {
        console.log('🚀 SEO Analyzer application loaded', {
          loadTime: performance.now(),
          online: navigator.onLine
        })
      }
    }, 100)

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

  // 轉換表單資料為 API 請求格式
  const convertFormDataToRequest = (formData: AnalyzeFormData): AnalyzeRequest => ({
    keyword: formData.keyword,
    audience: formData.audience,
    options: formData.options
  })

  // 處理分析取消
  const handleAnalysisCancel = async () => {
    try {
      await analysisHook.controls.cancel()
      console.log('分析已取消')
    } catch (error) {
      const errorResult = handleError(error)
      console.error('取消分析失敗:', errorResult.userMessage)
      setAppState(prev => ({ ...prev, error: errorResult.userMessage }))
    }
  }

  // 處理表單提交
  const handleAnalysisSubmit = async (data: AnalyzeFormData) => {
    try {
      // 清除之前的錯誤
      setAppState(prev => ({ ...prev, error: null }))
      
      // 轉換表單資料為 API 請求格式
      const request = convertFormDataToRequest(data)
      
      console.log('提交分析請求:', request)
      
      // 使用真實的分析 Hook 啟動分析
      await analysisHook.controls.start(request)
      
    } catch (error) {
      console.error('分析啟動失敗:', error)
      const errorResult = handleError(error)
      setAppState(prev => ({ ...prev, error: errorResult.userMessage }))
      throw error
    }
  }

  // 處理表單重置
  const handleFormReset = () => {
    analysisHook.controls.reset()
    setAppState(prev => ({ ...prev, error: null }))
    console.log('表單已重置')
  }

  // 處理側邊欄切換
  const handleSidebarToggle = () => {
    setSidebarState(prevState => {
      if (prevState === 'expanded') return 'collapsed'
      if (prevState === 'collapsed') return 'expanded'
      return 'expanded'
    })
  }

  // 處理佈局模式切換
  const handleLayoutModeToggle = () => {
    setLayoutMode(prevMode => prevMode === 'single' ? 'two-column' : 'single')
  }

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
        
        <Layout
          mode={layoutMode}
          sidebarState={sidebarState}
          onSidebarToggle={handleSidebarToggle}
          analysisResult={analysisHook.result}
          isAnalysisCompleted={analysisHook.isCompleted}
        >
          {/* 使用新的 MainContent 組件 */}
          {layoutMode === 'two-column' ? (
            <MainContent
              showForm={showForm}
              onFormSubmit={handleAnalysisSubmit}
              onFormReset={handleFormReset}
              isSubmitting={isAnalyzing}
              analysisStatus={analysisHook.status}
              progressState={progressState}
              onAnalysisCancel={handleAnalysisCancel}
              analysisResult={analysisHook.result}
              analysisRequest={analysisHook.request}
              onShowForm={() => setShowForm(true)}
              developmentControls={
                isDevelopment() && progressState ? (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-4">🧪 分析控制面板</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button 
                        onClick={() => analysisHook.controls.pause()}
                        disabled={!analysisHook.canPause}
                        className="btn bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 text-sm px-3 py-1"
                      >
                        暫停分析
                      </button>
                      <button 
                        onClick={() => analysisHook.controls.resume()}
                        disabled={!analysisHook.canResume}
                        className="btn bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm px-3 py-1"
                      >
                        恢復分析
                      </button>
                      <button 
                        onClick={() => analysisHook.controls.retry()}
                        disabled={!analysisHook.isError}
                        className="btn bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm px-3 py-1"
                      >
                        重試分析
                      </button>
                      <button 
                        onClick={handleFormReset}
                        className="btn bg-gray-600 text-white hover:bg-gray-700 text-sm px-3 py-1"
                      >
                        重置全部
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>分析狀態: <span className="font-mono">{analysisHook.status}</span></div>
                      <div>整體進度: <span className="font-mono">{analysisHook.progress?.overallProgress?.toFixed(1) || '0.0'}%</span></div>
                      <div>階段進度: <span className="font-mono">{analysisHook.progress?.stageProgress?.toFixed(1) || '0.0'}%</span></div>
                      <div>WebSocket: <span className="font-mono">{analysisHook.websocketStatus}</span></div>
                      {analysisHook.jobId && <div>任務 ID: <span className="font-mono">{analysisHook.jobId}</span></div>}
                      {analysisHook.error && (
                        <div className="text-red-600">
                          錯誤: <span className="font-mono">{analysisHook.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : undefined
              }
            />
          ) : (
            /* 原有的單欄佈局內容 */
            <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="w-full">
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

                {/* 佈局切換測試區域 */}
                {isDevelopment() && (
                  <div className="card w-full max-w-4xl mx-auto mb-12">
                    <h3 className="text-lg font-semibold mb-4">🏗️ 佈局模式測試</h3>
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={handleLayoutModeToggle}
                        className={`btn px-6 py-3 ${
                          layoutMode === 'two-column' 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
                        {layoutMode === 'two-column' ? '🔄 切換到單欄模式' : '🔄 切換到雙欄模式'}
                      </button>
                      <button
                        onClick={handleSidebarToggle}
                        disabled={layoutMode === 'single'}
                        className="btn bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 px-6 py-3"
                      >
                        側邊欄: {sidebarState === 'expanded' ? '展開' : '收合'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-4 text-center">
                      當前佈局: <span className="font-semibold">{layoutMode}</span> | 
                      側邊欄: <span className="font-semibold">{sidebarState}</span>
                    </p>
                  </div>
                )}

                {/* 原有的表單和進度顯示邏輯 */}
                <div className="mb-12">
                  <div className="text-center mb-8">
                    {!showForm && !progressState ? (
                      <button 
                        onClick={() => setShowForm(true)}
                        className="btn-primary text-lg px-8 py-3"
                      >
                        開始分析
                      </button>
                    ) : !progressState ? (
                      <button 
                        onClick={() => setShowForm(false)}
                        className="btn bg-gray-600 text-white hover:bg-gray-700 text-sm px-4 py-2"
                      >
                        隱藏表單
                      </button>
                    ) : null}
                  </div>
                  
                  {showForm && !progressState && (
                    <div className="transition-all duration-500 ease-in-out mb-8 flex justify-center">
                      <InputForm
                        onSubmit={handleAnalysisSubmit}
                        onReset={handleFormReset}
                        isSubmitting={isAnalyzing}
                        analysisStatus={analysisHook.status}
                      />
                    </div>
                  )}

                  {progressState && (
                    <div className="transition-all duration-500 ease-in-out">
                      <ProgressIndicator
                        progressState={progressState}
                        onCancel={handleAnalysisCancel}
                        layout={progressState.status === 'completed' ? 'detailed' : 'default'}
                        displayOptions={{
                          showProgressBar: true,
                          showStageIndicator: true,
                          showTimeEstimator: true,
                          showSubtasks: progressState.status === 'completed',
                          timeEstimatorVariant: analysisHook.isRunning ? 'detailed' : 'compact'
                        }}
                      />
                    </div>
                  )}

                  {/* 分析結果顯示 */}
                  {analysisHook.result && analysisHook.status === 'completed' && (
                    <div className="mt-8 transition-all duration-500 ease-in-out">
                      <div className="card max-w-6xl mx-auto">
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-bold text-success mb-2">✅ 分析完成</h2>
                          <p className="text-gray-600">以下是您的 SEO 分析報告</p>
                        </div>

                        {/* 分析結果內容 */}
                        <div className="space-y-6">
                          {/* 基本信息 */}
                          <div className="border-b pb-4">
                            <h3 className="text-lg font-semibold mb-3">📋 分析概要</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="bg-gray-50 p-3 rounded">
                                <span className="font-medium">關鍵字：</span>
                                <span className="ml-2">{analysisHook.request?.keyword || 'N/A'}</span>
                              </div>
                              <div className="bg-gray-50 p-3 rounded">
                                <span className="font-medium">目標受眾：</span>
                                <span className="ml-2">{analysisHook.request?.audience || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* SERP 競爭分析 */}
                          {getResultData(analysisHook.result)?.data?.serp_summary && (
                            <div className="border-b pb-4">
                              <h3 className="text-lg font-semibold mb-3">🔍 SERP 競爭分析</h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg text-center">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {getResultData(analysisHook.result).data?.serp_summary?.total_results}
                                  </div>
                                  <div className="text-sm text-gray-600">總搜尋結果</div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg text-center">
                                  <div className="text-2xl font-bold text-green-600">
                                    {getResultData(analysisHook.result).data?.serp_summary?.successful_scrapes}
                                  </div>
                                  <div className="text-sm text-gray-600">成功爬取</div>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg text-center">
                                  <div className="text-2xl font-bold text-purple-600">
                                    {getResultData(analysisHook.result).data?.serp_summary?.avg_word_count}
                                  </div>
                                  <div className="text-sm text-gray-600">平均字數</div>
                                </div>
                                <div className="bg-orange-50 p-4 rounded-lg text-center">
                                  <div className="text-2xl font-bold text-orange-600">
                                    {getResultData(analysisHook.result).data?.serp_summary?.avg_paragraphs}
                                  </div>
                                  <div className="text-sm text-gray-600">平均段落</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 分析報告 */}
                          {getResultData(analysisHook.result)?.data?.analysis_report && (
                            <div className="border-b pb-4">
                              <h3 className="text-lg font-semibold mb-3">✍️ 分析報告</h3>
                              <div className="bg-white p-6 rounded-lg border prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700">
                                <ReactMarkdown>
                                  {getResultData(analysisHook.result).data?.analysis_report}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {/* 操作按鈕 */}
                          <div className="flex justify-center gap-4 pt-4 border-t">
                            <button
                              onClick={() => {
                                const dataStr = JSON.stringify(analysisHook.result, null, 2);
                                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                                const exportFileDefaultName = `seo-analysis-${analysisHook.request?.keyword || 'report'}-${new Date().toISOString().slice(0,10)}.json`;
                                const linkElement = document.createElement('a');
                                linkElement.setAttribute('href', dataUri);
                                linkElement.setAttribute('download', exportFileDefaultName);
                                linkElement.click();
                              }}
                              className="btn-primary"
                            >
                              📥 下載報告
                            </button>
                            <button
                              onClick={handleFormReset}
                              className="btn bg-secondary text-white hover:bg-secondary/90"
                            >
                              🔄 開始新分析
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                      <div>分析狀態: {analysisHook.status}</div>
                      <div>WebSocket 狀態: {analysisHook.websocketStatus}</div>
                      <div>統計 - 重連次數: {analysisHook.statistics.reconnectAttempts}</div>
                      <div>統計 - 輪詢次數: {analysisHook.statistics.pollCount}</div>
                      {hasError && <div className="text-red-600">錯誤: {hasError}</div>}
                    </div>
                  </div>
                )}
              </div>
            </main>
          )}
        </Layout>

        {/* 開發者面板 (僅開發環境) */}
        {isDevelopment() && (
          <DevPanel
            isOpen={devPanelOpen}
            onToggle={setDevPanelOpen}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}

export default App