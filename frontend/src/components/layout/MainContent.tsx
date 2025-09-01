import React from 'react'
import { isDevelopment } from '@/config'
import { InputForm } from '@/components/form'
import { ProgressIndicator } from '@/components/progress'
import ReactMarkdown from 'react-markdown'
import type { AnalyzeRequest, AnalyzeResponse } from '@/types/api'
import { adaptAnalyzeResponse } from '@/types/api'
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
  /**
   * 資料存取適配器：處理新舊格式並提供統一的扁平資料存取
   * 
   * 功能作用：
   * - 自動適配新舊 API 回應格式，確保向後相容性
   * - 提供統一的扁平資料存取介面，無需區分巢狀或扁平結構
   * - 使用 adaptAnalyzeResponse 將舊格式轉換為新格式
   * 
   * 遷移說明：
   * - 舊版存取：result.data.analysis_report 
   * - 新版存取：result.analysis_report
   * 
   * @param result 原始的分析結果（可能是新舊任一格式）
   * @returns 統一的扁平結構資料，保證可存取新版欄位
   */
  const getResultData = (result: AnalyzeResponse | null): AnalyzeResponse | null => {
    if (!result) return null
    
    // 使用適配器確保所有資料都轉換為新的扁平格式
    return adaptAnalyzeResponse(result)
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

              {/* SERP 競爭分析 - 注意：暫時隱藏，因新的扁平結構不包含 serp_summary */}
              {/* 
              TODO: Phase 3 整合測試時，根據後端實際回應決定是否恢復此區塊
              新的扁平結構專注於核心分析結果，SERP 統計資料可能需要額外的 API 端點
              */}

              {/* 分析報告 - 已遷移到扁平結構存取 */}
              {getResultData(analysisResult)?.analysis_report && (
                <div id="content-suggestions" className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3">✍️ 分析報告</h3>
                  <div className="bg-white p-6 rounded-lg border prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700">
                    <ReactMarkdown>
                      {/* 扁平存取：直接從頂層獲取 analysis_report，不再需要 data.analysis_report */}
                      {getResultData(analysisResult)?.analysis_report}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* 處理統計 - 已遷移到扁平結構存取 */}
              {getResultData(analysisResult) && (
                <div id="serp-insights" className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3">⏱️ 處理統計</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">總處理時間：</span>
                        {/* 扁平存取：直接從頂層獲取 processing_time */}
                        <span className="ml-2">{getResultData(analysisResult)?.processing_time?.toFixed(2) || 'N/A'} 秒</span>
                      </div>
                      <div>
                        <span className="font-medium">Token 使用量：</span>
                        {/* 扁平存取：直接從頂層獲取 token_usage，不再需要 data.metadata.token_usage */}
                        <span className="ml-2">{getResultData(analysisResult)?.token_usage || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">業務狀態：</span>
                        {/* 雙欄位設計：顯示 success 欄位，反映實際處理結果 */}
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          getResultData(analysisResult)?.success 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getResultData(analysisResult)?.success ? '完全成功' : '部分成功'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">快取時間：</span>
                        {/* 扁平存取：直接從頂層獲取 cached_at */}
                        <span className="ml-2">
                          {getResultData(analysisResult)?.cached_at 
                            ? new Date(getResultData(analysisResult)!.cached_at).toLocaleString()
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">分析關鍵字：</span>
                        {/* 扁平存取：直接從頂層獲取 keyword */}
                        <span className="ml-2">{getResultData(analysisResult)?.keyword || analysisRequest?.keyword || 'N/A'}</span>
                      </div>
                      {/* 
                      注意：phase_timings 在新的扁平結構中不再提供
                      如需詳細計時資訊，可考慮在 Phase 3 時向後端請求額外的統計端點
                      */}
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