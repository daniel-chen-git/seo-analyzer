import { apiClient } from './index'
import type { 
  AnalyzeRequest, 
  AnalyzeResponse, 
  JobCreateResponse, 
  JobStatusResponse,
  HealthCheckResponse 
} from '@/types/api'

export const analysisApi = {
  // 同步分析 (原有端點，但通常會很慢)
  analyze: async (data: AnalyzeRequest): Promise<AnalyzeResponse> => {
    const response = await apiClient.post<AnalyzeResponse>('/api/analyze', data)
    return response.data
  },

  // 非同步分析 - 建立任務
  createAsyncAnalysis: async (data: AnalyzeRequest): Promise<JobCreateResponse> => {
    const response = await apiClient.post<JobCreateResponse>('/api/analyze-async', data)
    return response.data
  },

  // 查詢任務狀態和結果
  getJobStatus: async (jobId: string): Promise<JobStatusResponse> => {
    const response = await apiClient.get<JobStatusResponse>(`/api/status/${jobId}`)
    return response.data
  }
}

export const healthApi = {
  check: async (): Promise<HealthCheckResponse> => {
    const response = await apiClient.get<HealthCheckResponse>('/api/health')
    return response.data
  }
}

export const versionApi = {
  getVersion: async (): Promise<{ version: string; build_date: string; environment: string }> => {
    const response = await apiClient.get('/api/version')
    return response.data
  }
}