import React from 'react'
import { isDevelopment } from '@/config'
import { InputForm } from '@/components/form'
import { ProgressIndicator } from '@/components/progress'
import ReactMarkdown from 'react-markdown'
import type { AnalyzeRequest, AnalyzeResponse } from '@/types/api'
import type { ProgressState } from '@/types/progress'

interface MainContentProps {
  // 表單相關
  showForm: boolean
  onFormSubmit: (data: AnalyzeRequest) => Promise<void>
  onFormReset: () => void
  isSubmitting: boolean
  analysisStatus: 'idle' | 'starting' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled'

  // 進度相關
  progressState: ProgressState | null
  onAnalysisCancel: () => void

  // 結果相關
  analysisResult: AnalyzeResponse | null
  analysisRequest: AnalyzeRequest | null

  // 控制相關
  onShowForm: () => void

  // 開發模式相關
  developmentControls?: React.ReactNode
}

/**
 * 主內容區域組件
 * 整合表單、進度顯示和結果展示功能
 */
const MainContent: React.FC<MainContentProps> = ({
  showForm,
  onFormSubmit,
  onFormReset,
  isSubmitting,
  analysisStatus,
  progressState,
  onAnalysisCancel,
  analysisResult,
  analysisRequest,
  onShowForm,
  developmentControls
}) => {
  // 型別輔助函數
  const getResultData = (result: AnalyzeResponse | null) => result as {
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

  // 文件下載處理
  const handleDownloadReport = () => {
    const dataStr = JSON.stringify(analysisResult, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `seo-analysis-${analysisRequest?.keyword || 'report'}-${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  return (
    <div className="main-content-container">
      {/* SEO 分析標題區域 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          🔍 SEO 關鍵字分析
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          輸入您的關鍵字和目標受眾，獲得專業的 SEO 分析報告
        </p>

        {/* 控制按鈕區域 */}
        {!showForm && !progressState ? (
          <button 
            onClick={onShowForm}
            className="btn-primary text-lg px-8 py-3"
          >
            開始分析
          </button>
        ) : null}
      </div>

      {/* 分析表單區域 */}
      {showForm && !progressState && (
        <div className="form-section mb-8">
          <div className="card max-w-4xl mx-auto">
            <div className="card-header text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                設定分析參數
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                請填寫下方資訊以開始 SEO 分析
              </p>
            </div>
            
            <InputForm
              onSubmit={onFormSubmit}
              onReset={onFormReset}
              isSubmitting={isSubmitting}
              analysisStatus={analysisStatus}
              className="max-w-none" 
            />
          </div>
        </div>
      )}

      {/* 進度顯示區域 */}
      {progressState && (
        <div className="progress-section mb-8">
          <div className="card max-w-5xl mx-auto">
            <ProgressIndicator
              progressState={progressState}
              onCancel={onAnalysisCancel}
              layout={progressState.status === 'completed' ? 'detailed' : 'default'}
              displayOptions={{
                showProgressBar: true,
                showStageIndicator: true,
                showTimeEstimator: true,
                showSubtasks: progressState.status === 'completed',
                timeEstimatorVariant: progressState.status === 'running' ? 'detailed' : 'compact'
              }}
            />
          </div>
        </div>
      )}

      {/* 分析結果區域 */}
      {analysisResult && analysisStatus === 'completed' && (
        <div className="results-section">
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
                    <span className="ml-2">{analysisRequest?.keyword || 'N/A'}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="font-medium">目標受眾：</span>
                    <span className="ml-2">{analysisRequest?.audience || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* SERP 競爭分析 */}
              {getResultData(analysisResult)?.data?.serp_summary && (
                <div id="competitive-analysis" className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3">🔍 SERP 競爭分析</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {getResultData(analysisResult).data?.serp_summary?.total_results}
                      </div>
                      <div className="text-sm text-gray-600">總搜尋結果</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {getResultData(analysisResult).data?.serp_summary?.successful_scrapes}
                      </div>
                      <div className="text-sm text-gray-600">成功爬取</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {getResultData(analysisResult).data?.serp_summary?.avg_word_count}
                      </div>
                      <div className="text-sm text-gray-600">平均字數</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {getResultData(analysisResult).data?.serp_summary?.avg_paragraphs}
                      </div>
                      <div className="text-sm text-gray-600">平均段落</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 分析報告 */}
              {getResultData(analysisResult)?.data?.analysis_report && (
                <div id="content-suggestions" className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3">✍️ 分析報告</h3>
                  <div className="bg-white p-6 rounded-lg border prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700">
                    <ReactMarkdown>
                      {getResultData(analysisResult).data?.analysis_report}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* 處理統計 */}
              {getResultData(analysisResult)?.data?.metadata && (
                <div id="serp-insights" className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3">⏱️ 處理統計</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">總處理時間：</span>
                        <span className="ml-2">{getResultData(analysisResult)?.processing_time?.toFixed(2) || 'N/A'} 秒</span>
                      </div>
                      <div>
                        <span className="font-medium">Token 使用量：</span>
                        <span className="ml-2">{getResultData(analysisResult)?.data?.metadata?.token_usage || 'N/A'}</span>
                      </div>
                      {getResultData(analysisResult)?.data?.metadata?.phase_timings && (
                        <>
                          <div>
                            <span className="font-medium">SERP 擷取：</span>
                            <span className="ml-2">{getResultData(analysisResult).data?.metadata?.phase_timings?.serp_duration?.toFixed(2) || 'N/A'} 秒</span>
                          </div>
                          <div>
                            <span className="font-medium">網頁爬取：</span>
                            <span className="ml-2">{getResultData(analysisResult).data?.metadata?.phase_timings?.scraping_duration?.toFixed(2) || 'N/A'} 秒</span>
                          </div>
                          <div>
                            <span className="font-medium">AI 分析：</span>
                            <span className="ml-2">{getResultData(analysisResult).data?.metadata?.phase_timings?.ai_duration?.toFixed(2) || 'N/A'} 秒</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 操作按鈕 */}
              <div className="flex justify-center gap-4 pt-4 border-t">
                <button
                  onClick={handleDownloadReport}
                  className="btn-primary"
                >
                  📥 下載報告
                </button>
                <button
                  onClick={onFormReset}
                  className="btn bg-secondary text-white hover:bg-secondary/90"
                >
                  🔄 開始新分析
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 開發模式控制面板 */}
      {isDevelopment() && developmentControls && (
        <div className="development-controls mt-8">
          {developmentControls}
        </div>
      )}
    </div>
  )
}

export default MainContent