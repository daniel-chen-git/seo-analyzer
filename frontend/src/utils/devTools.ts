// 簡化版開發工具，避免複雜的型別問題
import { config, isDevelopment, isDebugMode } from '@/config'

// 簡化的效能監控
export class SimplePerformanceMonitor {
  private metrics: Array<{ name: string; duration: number; timestamp: number }> = []

  recordMetric(name: string, duration: number): void {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now()
    })

    // 限制記錄數量
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-50)
    }

    if (isDebugMode()) {
      console.log(`📊 Performance: ${name} = ${duration}ms`)
    }
  }

  getMetrics(): typeof this.metrics {
    return [...this.metrics]
  }

  clearMetrics(): void {
    this.metrics = []
  }
}

// 簡化的錯誤收集
export class SimpleErrorCollector {
  private errors: Array<{
    message: string
    timestamp: number
    type: string
    severity: string
  }> = []

  reportError(message: string, type: string = 'error', severity: string = 'medium'): void {
    const error = {
      message,
      type,
      severity,
      timestamp: Date.now()
    }

    this.errors.push(error)

    // 限制記錄數量
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-25)
    }

    console.error(`Error reported: ${type}`, message)

    if (isDebugMode()) {
      console.error('🚨 Error reported:', error)
    }
  }

  getErrors(): typeof this.errors {
    return [...this.errors]
  }

  clearErrors(): void {
    this.errors = []
  }
}

// 開發工具管理器
export class DevToolsManager {
  public performance = new SimplePerformanceMonitor()
  public errorCollector = new SimpleErrorCollector()
  private initialized = false

  init(): void {
    if (this.initialized || !isDevelopment()) {
      return
    }

    this.initialized = true
    this.setupGlobalErrorHandling()
    this.exposeToWindow()
    
    console.log('🔧 Development tools initialized')
  }

  private setupGlobalErrorHandling(): void {
    // JavaScript 錯誤
    window.addEventListener('error', (event) => {
      this.errorCollector.reportError(
        event.message,
        'javascript_error',
        'high'
      )
    })

    // Promise 拒絕
    window.addEventListener('unhandledrejection', (event) => {
      this.errorCollector.reportError(
        event.reason?.message || String(event.reason),
        'unhandled_rejection',
        'high'
      )
    })
  }

  private exposeToWindow(): void {
    if (isDevelopment()) {
      ;(window as any).devTools = this
      ;(window as any).config = config
    }
  }

  // 測試功能
  runTests(): void {
    if (!isDevelopment()) {
      return
    }

    console.log('🧪 Running development tests...')

    // 測試日誌
    console.debug('Test debug message')
    console.info('Test info message', { test: true })
    console.warn('Test warning message')
    console.error('Test error message', 'Test error')

    // 測試錯誤收集
    this.errorCollector.reportError('Test error', 'test', 'low')

    // 測試效能記錄
    this.performance.recordMetric('Test Metric', 123)

    console.log('✅ Development tests completed')
  }

  // 獲取開發資訊
  getDevInfo(): {
    config: typeof config
    metrics: ReturnType<SimplePerformanceMonitor['getMetrics']>
    errors: ReturnType<SimpleErrorCollector['getErrors']>
    environment: {
      isDevelopment: boolean
      isDebugMode: boolean
      userAgent: string
      viewport: { width: number; height: number }
      online: boolean
    }
  } {
    return {
      config,
      metrics: this.performance.getMetrics(),
      errors: this.errorCollector.getErrors(),
      environment: {
        isDevelopment: isDevelopment(),
        isDebugMode: isDebugMode(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        online: navigator.onLine
      }
    }
  }
}

// 全域實例
export const devTools = new DevToolsManager()

// 自動初始化
if (isDevelopment()) {
  devTools.init()
}

// 預設導出
export default devTools