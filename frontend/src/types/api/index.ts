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

export interface AnalysisMetadata {
  keyword: string
  audience: string
  serp_summary: SerpSummary
  analysis_timestamp: string
}

export interface AnalyzeResponse {
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
export interface ErrorDetail {
  code: string
  message: string
  field?: string
  details?: Record<string, any>
  timestamp: string
}

export interface ErrorResponse {
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