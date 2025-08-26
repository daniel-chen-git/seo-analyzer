import { useState, useCallback } from 'react'
import { analysisApi, healthApi } from '@/utils/api'
import type { 
  AnalyzeRequest, 
  AnalyzeResponse, 
  JobCreateResponse, 
  JobStatusResponse,
  HealthCheckResponse,
  ApiError 
} from '@/types/api'
import type { LoadingState } from '@/types/ui'

// 導出企業級 API Hooks
export { useApiClient } from './useApiClient'
export type { 
  ApiClientConfig, 
  RetryConfig, 
  TimeoutConfig, 
  InterceptorConfig,
  ApiClientState
} from './useApiClient'

export { useErrorHandling } from './useErrorHandling'
export type { 
  ErrorClassification,
  ErrorHandlingResult,
  ErrorStatistics,
  ErrorHandlingConfig
} from './useErrorHandling'

// 同步分析 Hook (不推薦使用，因為會很慢)
export const useSyncAnalysis = () => {
  const [state, setState] = useState<LoadingState & { data: AnalyzeResponse | null }>({
    isLoading: false,
    error: null,
    data: null,
  })

  const analyze = useCallback(async (request: AnalyzeRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const data = await analysisApi.analyze(request)
      setState(prev => ({ ...prev, data, isLoading: false }))
      return data
    } catch (error) {
      const apiError = error as ApiError
      setState(prev => ({ ...prev, error: apiError.message, isLoading: false }))
      throw error
    }
  }, [])

  return { ...state, analyze }
}

// 非同步分析 Hook (推薦使用)
export const useAsyncAnalysis = () => {
  const [state, setState] = useState<LoadingState & { job: JobCreateResponse | null }>({
    isLoading: false,
    error: null,
    job: null,
  })

  const createAnalysis = useCallback(async (request: AnalyzeRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const job = await analysisApi.createAsyncAnalysis(request)
      setState(prev => ({ ...prev, job, isLoading: false }))
      return job
    } catch (error) {
      const apiError = error as ApiError
      setState(prev => ({ ...prev, error: apiError.message, isLoading: false }))
      throw error
    }
  }, [])

  return { ...state, createAnalysis }
}

// 任務狀態查詢 Hook
export const useJobStatus = () => {
  const [state, setState] = useState<LoadingState & { status: JobStatusResponse | null }>({
    isLoading: false,
    error: null,
    status: null,
  })

  const getJobStatus = useCallback(async (jobId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const status = await analysisApi.getJobStatus(jobId)
      setState(prev => ({ ...prev, status, isLoading: false }))
      return status
    } catch (error) {
      const apiError = error as ApiError
      setState(prev => ({ ...prev, error: apiError.message, isLoading: false }))
      throw error
    }
  }, [])

  const resetStatus = useCallback(() => {
    setState({ isLoading: false, error: null, status: null })
  }, [])

  return { ...state, getJobStatus, resetStatus }
}

// 健康檢查 Hook
export const useHealth = () => {
  const [state, setState] = useState<LoadingState & { health: HealthCheckResponse | null }>({
    isLoading: false,
    error: null,
    health: null,
  })

  const checkHealth = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const health = await healthApi.check()
      setState(prev => ({ ...prev, health, isLoading: false }))
      return health
    } catch (error) {
      const apiError = error as ApiError
      setState(prev => ({ ...prev, error: apiError.message, isLoading: false }))
      throw error
    }
  }, [])

  return { ...state, checkHealth }
}