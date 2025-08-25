import { useState, useEffect, useCallback } from 'react'
import type { ProgressState } from '@/types/ui'
import type { JobStatusResponse } from '@/types/api'
import { analysisApi } from '@/utils/api'

export const useJobProgress = (jobId: string | null, autoPolling = true) => {
  const [progress, setProgress] = useState<ProgressState>({
    progress: 0,
    status: 'idle',
    message: '',
  })
  const [jobResult, setJobResult] = useState<JobStatusResponse | null>(null)

  const updateProgress = useCallback(async () => {
    if (!jobId) return null

    try {
      const jobStatus = await analysisApi.getJobStatus(jobId)
      
      // 更新進度狀態
      setProgress({
        progress: jobStatus.progress.percentage,
        status: jobStatus.status === 'completed' ? 'completed' 
               : jobStatus.status === 'failed' ? 'error'
               : jobStatus.status === 'processing' ? 'analyzing'
               : 'idle',
        message: jobStatus.progress.message,
      })

      setJobResult(jobStatus)
      return jobStatus
    } catch {
      setProgress(prev => ({
        ...prev,
        status: 'error',
        message: '無法取得任務進度',
      }))
      return null
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId || !autoPolling) return

    // 立即更新一次
    updateProgress()

    // 設定輪詢間隔
    const interval = setInterval(async () => {
      const status = await updateProgress()
      
      // 如果任務完成或失敗，停止輪詢
      if (status && (status.status === 'completed' || status.status === 'failed')) {
        clearInterval(interval)
      }
    }, 2000) // 每2秒更新一次

    return () => clearInterval(interval)
  }, [jobId, autoPolling, updateProgress])

  return { progress, jobResult, updateProgress, setProgress }
}

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue] as const
}

// 表單驗證 Hook
export const useFormValidation = <T extends Record<string, unknown>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, (value: unknown) => string | null>>
) => {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})

  const setValue = useCallback((field: keyof T, value: unknown) => {
    setValues(prev => ({ ...prev, [field]: value }))
    
    // 驗證該欄位
    const rule = validationRules[field]
    if (rule) {
      const error = rule(value)
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }, [validationRules])

  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }, [])

  const validateAll = useCallback(() => {
    const newErrors: Partial<Record<keyof T, string>> = {}
    let isValid = true

    Object.keys(validationRules).forEach((field) => {
      const rule = validationRules[field as keyof T]
      if (rule) {
        const error = rule(values[field as keyof T])
        if (error) {
          newErrors[field as keyof T] = error
          isValid = false
        }
      }
    })

    setErrors(newErrors)
    return isValid
  }, [values, validationRules])

  const resetForm = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    resetForm,
    isValid: Object.keys(errors).length === 0
  }
}