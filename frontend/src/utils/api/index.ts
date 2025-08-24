import axios from 'axios'
import type { AxiosResponse, AxiosError } from 'axios'
import type { ErrorResponse, ApiError } from '@/types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 秒超時
})

// 請求攔截器 - 可以在此添加認證 token
apiClient.interceptors.request.use(
  (config) => {
    // 可以在此添加認證邏輯
    // config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// 回應攔截器 - 統一錯誤處理
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ErrorResponse>) => {
    let apiError: ApiError

    if (error.response?.data?.status === 'error' && error.response.data.error) {
      // Backend 標準錯誤格式
      const backendError = error.response.data.error
      apiError = {
        message: backendError.message,
        code: backendError.code,
        details: backendError.details,
      }
    } else if (error.response) {
      // HTTP 錯誤
      apiError = {
        message: `HTTP ${error.response.status}: ${error.response.statusText}`,
        code: `HTTP_${error.response.status}`,
        details: error.response.data,
      }
    } else if (error.request) {
      // 網路錯誤
      apiError = {
        message: '無法連接到伺服器，請檢查網路連線',
        code: 'NETWORK_ERROR',
        details: { timeout: error.code === 'ECONNABORTED' },
      }
    } else {
      // 其他錯誤
      apiError = {
        message: error.message || '發生未知錯誤',
        code: 'UNKNOWN_ERROR',
        details: error,
      }
    }

    return Promise.reject(apiError)
  }
)

export * from './endpoints'