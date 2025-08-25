import { useState, useEffect } from 'react'
import { config, isDebugMode, isDevelopment } from '@/config'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import Layout from '@/components/layout/Layout'
import DevPanel from '@/components/ui/DevPanel'
import { InputForm } from '@/components/form'
import { ProgressIndicator } from '@/components/progress'
import type { AnalyzeFormData } from '@/types/form'
import type { ProgressState, StageInfo } from '@/types/progress'
// 開發工具會在 DevPanel 中載入
import './styles/globals.css'

interface AppState {
  isLoading: boolean
  isOnline: boolean
  error: string | null
}

interface HealthStatus {
  status: string;
  backend_connected: boolean;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    isLoading: true,
    isOnline: navigator.onLine,
    error: null
  })
  const [devPanelOpen, setDevPanelOpen] = useState(false)
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState | null>(null);
  const [progressInterval, setProgressInterval] = useState<number | null>(null);

  // 健康檢查測試
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setHealthStatus(data);
        if (isDebugMode()) {
          console.log('🔗 Backend health check successful:', data);
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setHealthStatus({ status: 'error', backend_connected: false });
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

    // 模擬初始載入
    const loadingTimer = setTimeout(() => {
      setAppState(prev => ({ ...prev, isLoading: false }))
      
      // 記錄應用啟動完成
      if (isDevelopment()) {
        console.log('🚀 SEO Analyzer application loaded', {
          loadTime: performance.now(),
          online: navigator.onLine
        })
      }
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

  // 創建初始進度狀態
  const createInitialProgressState = (jobId: string): ProgressState => ({
    currentStage: 1,
    overallProgress: 0,
    stageProgress: 0,
    status: 'running',
    stages: {
      serp: createInitialStageInfo(),
      crawler: createInitialStageInfo(),
      ai: createInitialStageInfo()
    },
    timing: {
      startTime: new Date(),
      currentStageStartTime: new Date(),
      estimatedTotalTime: 57, // 18 + 22 + 17 = 57 seconds
      estimatedRemainingTime: 57
    },
    jobId,
    canCancel: true
  });

  // 創建初始階段資訊
  const createInitialStageInfo = (): StageInfo => ({
    status: 'pending',
    progress: 0,
    subtasks: []
  });

  // 模擬進度更新
  const simulateProgress = () => {
    let stage = 1;
    let stageProgress = 0;
    let overallProgress = 0;
    
    const interval = setInterval(() => {
      setProgressState(prevState => {
        if (!prevState || prevState.status === 'completed' || prevState.status === 'cancelled') {
          clearInterval(interval);
          return prevState;
        }

        // 更新階段進度
        stageProgress += Math.random() * 15 + 5; // 每次增加 5-20%
        
        if (stageProgress >= 100) {
          // 當前階段完成，進入下一階段
          const newStages = { ...prevState.stages };
          const stageKeys = ['serp', 'crawler', 'ai'] as const;
          const currentStageKey = stageKeys[stage - 1];
          
          newStages[currentStageKey] = {
            ...newStages[currentStageKey],
            status: 'completed',
            progress: 100,
            completedTime: new Date()
          };

          if (stage < 3) {
            stage += 1;
            stageProgress = 0;
            
            // 更新下一階段為運行中
            const nextStageKey = stageKeys[stage - 1];
            newStages[nextStageKey] = {
              ...newStages[nextStageKey],
              status: 'running',
              startTime: new Date()
            };
          } else {
            // 所有階段完成
            clearInterval(interval);
            setProgressInterval(null);
            
            return {
              ...prevState,
              currentStage: 3 as const,
              overallProgress: 100,
              stageProgress: 100,
              status: 'completed',
              stages: newStages,
              canCancel: false,
              timing: {
                ...prevState.timing,
                estimatedRemainingTime: 0
              }
            };
          }

          return {
            ...prevState,
            currentStage: stage as 1 | 2 | 3,
            stageProgress,
            stages: newStages,
            timing: {
              ...prevState.timing,
              currentStageStartTime: new Date()
            }
          };
        }

        // 計算整體進度
        const stageWeights = [18, 22, 17]; // SERP, Crawler, AI 權重
        const totalWeight = 57;
        let completedWeight = 0;
        
        for (let i = 0; i < stage - 1; i++) {
          completedWeight += stageWeights[i];
        }
        
        const currentStageWeight = (stageWeights[stage - 1] * stageProgress) / 100;
        overallProgress = ((completedWeight + currentStageWeight) / totalWeight) * 100;

        // 計算剩餘時間
        const elapsed = (Date.now() - prevState.timing.startTime.getTime()) / 1000;
        const estimatedTotal = elapsed / (overallProgress / 100);
        const estimatedRemaining = Math.max(0, estimatedTotal - elapsed);

        return {
          ...prevState,
          stageProgress: Math.min(100, stageProgress),
          overallProgress: Math.min(100, overallProgress),
          timing: {
            ...prevState.timing,
            estimatedRemainingTime: estimatedRemaining
          }
        };
      });
    }, 500); // 每 500ms 更新一次

    setProgressInterval(interval);
  };

  // 處理分析取消
  const handleAnalysisCancel = async () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      setProgressInterval(null);
    }

    setProgressState(prev => prev ? {
      ...prev,
      status: 'cancelled',
      canCancel: false
    } : null);

    setIsAnalyzing(false);
    console.log('分析已取消');
  };

  // 處理表單提交
  const handleAnalysisSubmit = async (data: AnalyzeFormData) => {
    try {
      setIsAnalyzing(true);
      console.log('提交分析請求:', data);
      
      // 創建進度狀態
      const jobId = `job_${Date.now()}`;
      const initialProgress = createInitialProgressState(jobId);
      setProgressState(initialProgress);

      // 開始模擬進度
      simulateProgress();
      
    } catch (error) {
      console.error('分析失敗:', error);
      setProgressState(prev => prev ? {
        ...prev,
        status: 'error',
        canCancel: false
      } : null);
      setIsAnalyzing(false);
      throw error;
    }
  };

  // 處理表單重置
  const handleFormReset = () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      setProgressInterval(null);
    }
    
    setIsAnalyzing(false);
    setProgressState(null);
    console.log('表單已重置');
  };

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

              {/* Phase 1.6 環境設定驗證 */}
              {isDevelopment() && (
                <div className="card max-w-4xl mx-auto mb-12">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-semibold mb-4">🔍 Phase 1.6 環境設定驗證</h2>
                  </div>
                  
                  {/* 技術棧資訊 */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">🚀 技術棧版本</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>React:</span>
                        <span className="font-mono text-success">19.1.1</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>Vite:</span>
                        <span className="font-mono text-success">6.3.5</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>Tailwind CSS:</span>
                        <span className="font-mono text-success">4.1.12</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>TypeScript:</span>
                        <span className="font-mono text-success">5.8.3</span>
                      </div>
                    </div>
                  </div>

                  {/* Backend 連線狀態 */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">🔗 Backend 連線狀態</h3>
                    <div className="p-4 rounded-lg border-2 border-dashed">
                      {healthLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                          <span>檢查中...</span>
                        </div>
                      ) : healthStatus?.backend_connected ? (
                        <div className="flex items-center text-success">
                          <span className="w-3 h-3 bg-success rounded-full mr-2"></span>
                          <span>Backend 連線正常</span>
                          <span className="ml-2 text-xs text-gray-500">({healthStatus.status})</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-warning">
                          <span className="w-3 h-3 bg-warning rounded-full mr-2"></span>
                          <span>Backend 未連線 (開發模式)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 環境變數測試 */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">⚙️ 環境配置</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>API Base URL:</span>
                        <span className="font-mono">{import.meta.env.VITE_API_BASE_URL}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>App Title:</span>
                        <span className="font-mono">{import.meta.env.VITE_APP_TITLE}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>Debug Mode:</span>
                        <span className="font-mono">{import.meta.env.VITE_ENABLE_DEBUG}</span>
                      </div>
                    </div>
                  </div>

                  {/* 樣式系統測試 */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">🎨 樣式系統測試</h3>
                    <div className="space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        <button className="btn-primary">Primary Button</button>
                        <button className="btn bg-secondary text-white hover:bg-secondary/90">Secondary</button>
                        <button className="btn bg-success text-white hover:bg-success/90">Success</button>
                        <button className="btn bg-warning text-white hover:bg-warning/90">Warning</button>
                        <button className="btn bg-error text-white hover:bg-error/90">Error</button>
                      </div>
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          className="input" 
                          placeholder="測試輸入欄位 (Inter 字體)" 
                        />
                        <div className="p-3 bg-gray-100 rounded font-code text-sm">
                          <code>console.log('Fira Code 字體測試');</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 狀態總結 */}
                  <div className="text-center pt-4 border-t">
                    <p className="text-success font-medium">
                      ✅ Phase 1.6 環境設定完成
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      準備進入 Phase 2: 核心 UI 元件開發
                    </p>
                  </div>
                </div>
              )}

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

              {/* Phase 2.1 & 2.2 表單與進度指示器整合展示 */}
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
                  <div className="transition-all duration-500 ease-in-out mb-8">
                    <InputForm
                      onSubmit={handleAnalysisSubmit}
                      onReset={handleFormReset}
                      isSubmitting={isAnalyzing}
                      estimatedTime={60}
                    />
                  </div>
                )}

                {/* Phase 2.2 ProgressIndicator 展示 */}
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
                        showCancelButton: true,
                        showSubtasks: progressState.status === 'completed',
                        timeEstimatorVariant: progressState.status === 'running' ? 'detailed' : 'compact'
                      }}
                    />
                  </div>
                )}

                {/* 測試控制區域 (開發模式) */}
                {isDevelopment() && progressState && (
                  <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-4">🧪 進度測試控制</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button 
                        onClick={() => setProgressState(prev => prev ? {...prev, status: 'running'} : null)}
                        className="btn bg-blue-600 text-white hover:bg-blue-700 text-sm px-3 py-1"
                      >
                        設為運行中
                      </button>
                      <button 
                        onClick={() => setProgressState(prev => prev ? {...prev, status: 'completed'} : null)}
                        className="btn bg-green-600 text-white hover:bg-green-700 text-sm px-3 py-1"
                      >
                        設為完成
                      </button>
                      <button 
                        onClick={() => setProgressState(prev => prev ? {...prev, status: 'error'} : null)}
                        className="btn bg-red-600 text-white hover:bg-red-700 text-sm px-3 py-1"
                      >
                        模擬錯誤
                      </button>
                      <button 
                        onClick={handleFormReset}
                        className="btn bg-gray-600 text-white hover:bg-gray-700 text-sm px-3 py-1"
                      >
                        重置全部
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <div>當前狀態: <span className="font-mono">{progressState.status}</span></div>
                      <div>整體進度: <span className="font-mono">{progressState.overallProgress.toFixed(1)}%</span></div>
                      <div>當前階段: <span className="font-mono">{progressState.currentStage}</span></div>
                      <div>任務 ID: <span className="font-mono">{progressState.jobId}</span></div>
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
                  </div>
                </div>
              )}
            </div>
          </main>
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
