// === 請求模型 ===
export interface AnalyzeOptions {
  generate_draft: boolean
  include_faq: boolean
  include_table: boolean
}

export interface AnalyzeRequest {
  keyword: string
  audience: string
  options: AnalyzeOptions
}

// === 非同步任務模型 ===
export interface JobCreateResponse {
  status: string
  job_id: string
  message: string
  status_url: string
}

export interface JobProgress {
  current_step: number
  total_steps: number
  message: string
  percentage: number
}

export interface JobStatusResponse {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: JobProgress
  result?: AnalyzeResponse | null
  error?: string | null
  created_at: string
  updated_at?: string
}

// === SERP 和分析結果模型 ===
export interface SerpSummary {
  total_results: number
  successful_scrapes: number
  avg_word_count: number
  avg_paragraphs: number
}

/**
 * @deprecated 將於 Phase 3 移除，請使用新的扁平結構 AnalyzeResponse
 * 舊版巢狀結構的分析元資料介面，保留用於向後相容
 */
export interface AnalysisMetadata {
  keyword: string
  audience: string
  serp_summary: SerpSummary
  analysis_timestamp: string
}

/**
 * SEO 分析成功回應介面 - 雙欄位扁平結構設計
 * 
 * 與後端 Pydantic AnalyzeResponse 模型保持完全同步
 * 
 * 雙欄位設計說明：
 * - status: API 契約欄位，固定為 'success'，用於前端 response.status === 'success' 判斷
 * - success: 業務狀態欄位，boolean 值，反映實際處理結果，支援細粒度狀態管理
 * 
 * 使用場景：
 * - status: 'success', success: true  → 完全成功
 * - status: 'success', success: false → API 成功但業務處理失敗
 */
export interface AnalyzeResponse {
  // API 契約欄位：維護前端相容性
  status: 'success'
  
  // 核心業務資料（扁平結構）
  analysis_report: string    // Markdown 格式的 SEO 分析報告
  token_usage: number       // AI Token 使用量
  processing_time: number   // 處理時間（秒）
  success: boolean          // 業務處理成功標誌，反映實際處理結果
  cached_at: string         // 快取時間戳（ISO 8601 格式）
  keyword: string           // 原始關鍵字
}

/**
 * @deprecated 將於 Phase 3 移除，請使用新的 AnalyzeResponse
 * 舊版巢狀結構的分析回應介面，保留用於向後相容和漸進式遷移
 */
export interface LegacyAnalyzeResponse {
  status: 'success'
  data: {
    analysis_report: string
    metadata: AnalysisMetadata
  }
  message?: string
}

// === 健康檢查模型 ===
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  services: {
    serp_api: string
    azure_openai: string
    redis: string
  }
}

// === 錯誤處理模型 ===
/**
 * @deprecated 將於 Phase 3 移除，請使用新的簡化 ErrorResponse
 * 舊版複雜巢狀結構的錯誤詳細資訊介面
 */
export interface ErrorDetail {
  code: string
  message: string
  field?: string
  details?: Record<string, unknown>
  timestamp: string
}

/**
 * 錯誤回應介面 - 雙欄位設計，與 AnalyzeResponse 保持一致性
 * 
 * 與後端 ErrorResponse 模型完全同步
 * 
 * 雙欄位一致性：
 * - status: API 契約欄位，固定為 'error'，用於前端 response.status === 'error' 判斷
 * - success: 業務狀態欄位，固定為 false，與成功回應保持欄位一致性
 */
export interface ErrorResponse {
  // API 契約欄位：標識錯誤回應
  status: 'error'
  
  // 業務狀態欄位：與成功回應保持一致性
  success: false
  
  // 錯誤資訊（簡化結構）
  error_message: string     // 錯誤描述訊息（繁體中文）
  error_code?: string       // 錯誤代碼，用於程式化處理
}

/**
 * @deprecated 將於 Phase 3 移除，請使用新的簡化 ErrorResponse
 * 舊版複雜巢狀結構的錯誤回應介面
 */
export interface LegacyErrorResponse {
  status: 'error'
  error: ErrorDetail
}

// === API 通用型別 ===
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

// === 類型守衛和適配器函數 ===
/**
 * 類型守衛：檢測是否為新的扁平結構 AnalyzeResponse
 * 
 * 功能作用：
 * - 區分新舊 API 回應格式
 * - 支援漸進式遷移策略
 * - 避免運行時錯誤
 * 
 * @param response 待檢測的回應物件
 * @returns 是否為新的扁平結構回應
 */
export function isNewAnalyzeResponse(response: unknown): response is AnalyzeResponse {
  return response !== null && 
         typeof response === 'object' &&
         typeof (response as Record<string, unknown>).analysis_report === 'string' &&
         typeof (response as Record<string, unknown>).token_usage === 'number' &&
         typeof (response as Record<string, unknown>).success === 'boolean' &&
         !(response as Record<string, unknown>).data // 確認沒有舊的巢狀 data 屬性
}

/**
 * 類型守衛：檢測是否為舊的巢狀結構 LegacyAnalyzeResponse
 * 
 * 功能作用：
 * - 識別舊版 API 回應格式
 * - 確保向後相容性處理
 * 
 * @param response 待檢測的回應物件
 * @returns 是否為舊的巢狀結構回應
 */
export function isLegacyAnalyzeResponse(response: unknown): response is LegacyAnalyzeResponse {
  if (response === null || typeof response !== 'object') {
    return false
  }
  
  const obj = response as Record<string, unknown>
  return obj.status === 'success' &&
         !!obj.data &&
         typeof obj.data === 'object' &&
         typeof (obj.data as Record<string, unknown>).analysis_report === 'string' &&
         !!(obj.data as Record<string, unknown>).metadata
}

/**
 * 回應格式適配器：將舊格式轉換為新格式
 * 
 * 功能作用：
 * - 統一前端處理邏輯，不需要區分新舊格式
 * - 將巢狀結構扁平化：data.analysis_report → analysis_report
 * - 將元資料欄位提取：data.metadata.token_usage → token_usage
 * - 補充雙欄位：自動添加 success 欄位和完整的 status 欄位
 * 
 * @param response 任意格式的回應物件
 * @returns 統一的新格式 AnalyzeResponse
 */
export function adaptAnalyzeResponse(response: unknown): AnalyzeResponse {
  // 如果已經是新格式，直接返回
  if (isNewAnalyzeResponse(response)) {
    return response
  }
  
  // 如果是舊格式，進行轉換
  if (isLegacyAnalyzeResponse(response)) {
    return {
      // API 契約欄位：保持 status
      status: 'success' as const,
      
      // 扁平化核心資料：從 data.analysis_report 提取到頂層
      analysis_report: response.data.analysis_report,
      
      // 從 metadata 提取欄位：data.metadata → token_usage（假設存在）
      token_usage: ((response.data.metadata as unknown) as Record<string, unknown>)?.token_usage as number || 0,
      keyword: response.data.metadata?.keyword || '',
      
      // 補充新欄位：為舊格式回應添加缺失的欄位
      processing_time: 0, // 舊格式沒有此欄位，使用預設值
      success: true, // 舊格式假設成功，因為 status 為 'success'
      cached_at: response.data.metadata?.analysis_timestamp || new Date().toISOString()
    }
  }
  
  // 未知格式，返回安全的預設值
  console.warn('未知的回應格式，使用預設值', response)
  return {
    status: 'success' as const,
    analysis_report: '',
    token_usage: 0,
    processing_time: 0,
    success: false, // 未知格式標記為失敗
    cached_at: new Date().toISOString(),
    keyword: ''
  }
}

/**
 * 聯合類型：所有可能的 API 回應格式
 * 
 * 功能作用：
 * - 支援新舊格式並存的過渡期
 * - 提供完整的類型安全
 */
export type ApiAnalyzeResponse = AnalyzeResponse | ErrorResponse
export type AnyAnalyzeResponse = AnalyzeResponse | LegacyAnalyzeResponse | ErrorResponse | LegacyErrorResponse