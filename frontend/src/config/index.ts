// SEO Analyzer 配置管理系統
// 提供型別安全的環境變數存取和驗證

// 環境變數型別定義
interface AppConfig {
  // 基本應用配置
  app: {
    title: string
    description: string
    version: string
    environment: 'development' | 'production' | 'staging' | 'local'
  }
  
  // API 配置
  api: {
    baseUrl: string
    timeout: number
    retryAttempts: number
    retryDelay: number
    maxFileSize: number
  }
  
  // 功能開關
  features: {
    debug: boolean
    apiMock: boolean
    analytics: boolean
    errorReporting: boolean
    performanceMonitoring: boolean
    hotReload: boolean
  }
  
  // 開發工具
  devTools: {
    reactDevtools: boolean
    reduxDevtools: boolean
    consoleLogs: boolean
    apiTestingTools: boolean
  }
  
  // UI 配置
  ui: {
    defaultTheme: 'light' | 'dark' | 'system'
    enableDarkMode: boolean
    animationEnabled: boolean
    showDebugInfo: boolean
  }
  
  // 快取配置
  cache: {
    ttl: number
    enableServiceWorker: boolean
    enableOfflineMode: boolean
  }
  
  // 安全配置
  security: {
    enableCSP: boolean
    allowedOrigins: string[]
  }
  
  // 日誌配置
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    enableRequestLogging: boolean
    enableErrorStackTrace: boolean
  }
  
  // 第三方服務
  services?: {
    googleAnalytics?: string
    sentry?: string
  }
}

// 環境變數讀取工具
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key]
  if (value === undefined && defaultValue === undefined) {
    console.warn(`Environment variable ${key} is not defined`)
    return ''
  }
  return value || defaultValue || ''
}

const getBooleanEnv = (key: string, defaultValue: boolean = false): boolean => {
  const value = getEnvVar(key)
  if (value === '') return defaultValue
  return value === 'true' || value === '1'
}

const getNumberEnv = (key: string, defaultValue: number = 0): number => {
  const value = getEnvVar(key)
  if (value === '') return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

// 配置物件建立
const createConfig = (): AppConfig => {
  return {
    app: {
      title: getEnvVar('VITE_APP_TITLE', 'SEO Analyzer'),
      description: getEnvVar('VITE_APP_DESCRIPTION', '專業的 SEO 關鍵字分析工具'),
      version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
      environment: getEnvVar('VITE_APP_ENVIRONMENT', 'development') as AppConfig['app']['environment']
    },
    
    api: {
      baseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8000'),
      timeout: getNumberEnv('VITE_API_TIMEOUT', 70000),
      retryAttempts: getNumberEnv('VITE_API_RETRY_ATTEMPTS', 3),
      retryDelay: getNumberEnv('VITE_API_RETRY_DELAY', 1000),
      maxFileSize: getNumberEnv('VITE_API_MAX_FILE_SIZE', 10485760)
    },
    
    features: {
      debug: getBooleanEnv('VITE_ENABLE_DEBUG', false),
      apiMock: getBooleanEnv('VITE_ENABLE_API_MOCK', false),
      analytics: getBooleanEnv('VITE_ENABLE_ANALYTICS', false),
      errorReporting: getBooleanEnv('VITE_ENABLE_ERROR_REPORTING', false),
      performanceMonitoring: getBooleanEnv('VITE_ENABLE_PERFORMANCE_MONITORING', false),
      hotReload: getBooleanEnv('VITE_ENABLE_HOT_RELOAD', true)
    },
    
    devTools: {
      reactDevtools: getBooleanEnv('VITE_ENABLE_REACT_DEVTOOLS', false),
      reduxDevtools: getBooleanEnv('VITE_ENABLE_REDUX_DEVTOOLS', false),
      consoleLogs: getBooleanEnv('VITE_ENABLE_CONSOLE_LOGS', false),
      apiTestingTools: getBooleanEnv('VITE_ENABLE_API_TESTING_TOOLS', false)
    },
    
    ui: {
      defaultTheme: getEnvVar('VITE_DEFAULT_THEME', 'light') as AppConfig['ui']['defaultTheme'],
      enableDarkMode: getBooleanEnv('VITE_ENABLE_DARK_MODE', true),
      animationEnabled: getBooleanEnv('VITE_ANIMATION_ENABLED', true),
      showDebugInfo: getBooleanEnv('VITE_SHOW_DEBUG_INFO', false)
    },
    
    cache: {
      ttl: getNumberEnv('VITE_CACHE_TTL', 300000),
      enableServiceWorker: getBooleanEnv('VITE_ENABLE_SERVICE_WORKER', false),
      enableOfflineMode: getBooleanEnv('VITE_ENABLE_OFFLINE_MODE', false)
    },
    
    security: {
      enableCSP: getBooleanEnv('VITE_ENABLE_CSP', false),
      allowedOrigins: getEnvVar('VITE_ALLOWED_ORIGINS', 'localhost:3000,localhost:8000').split(',')
    },
    
    logging: {
      level: getEnvVar('VITE_LOG_LEVEL', 'info') as AppConfig['logging']['level'],
      enableRequestLogging: getBooleanEnv('VITE_ENABLE_REQUEST_LOGGING', false),
      enableErrorStackTrace: getBooleanEnv('VITE_ENABLE_ERROR_STACK_TRACE', true)
    },
    
    services: {
      googleAnalytics: getEnvVar('VITE_GA_TRACKING_ID') || undefined,
      sentry: getEnvVar('VITE_SENTRY_DSN') || undefined
    }
  }
}

// 配置驗證函數
const validateConfig = (config: AppConfig): string[] => {
  const errors: string[] = []
  
  // 驗證必要配置
  if (!config.app.title) {
    errors.push('App title is required')
  }
  
  if (!config.api.baseUrl) {
    errors.push('API base URL is required')
  }
  
  // 驗證 API 超時設定
  if (config.api.timeout <= 0) {
    errors.push('API timeout must be greater than 0')
  }
  
  // 驗證重試次數
  if (config.api.retryAttempts < 0) {
    errors.push('API retry attempts must be non-negative')
  }
  
  // 驗證最大檔案大小
  if (config.api.maxFileSize <= 0) {
    errors.push('API max file size must be greater than 0')
  }
  
  // 驗證快取 TTL
  if (config.cache.ttl <= 0) {
    errors.push('Cache TTL must be greater than 0')
  }
  
  // 驗證環境
  const validEnvs = ['development', 'production', 'staging', 'local']
  if (!validEnvs.includes(config.app.environment)) {
    errors.push(`Invalid environment: ${config.app.environment}. Must be one of: ${validEnvs.join(', ')}`)
  }
  
  // 驗證日誌等級
  const validLogLevels = ['debug', 'info', 'warn', 'error']
  if (!validLogLevels.includes(config.logging.level)) {
    errors.push(`Invalid log level: ${config.logging.level}. Must be one of: ${validLogLevels.join(', ')}`)
  }
  
  // 驗證 API 基礎 URL 格式
  try {
    new URL(config.api.baseUrl)
  } catch {
    errors.push('API base URL must be a valid URL')
  }
  
  // 驗證允許的來源域名
  if (config.security.allowedOrigins.length === 0) {
    errors.push('At least one allowed origin must be specified')
  }
  
  return errors
}

// 建立並驗證配置
export const config = createConfig()

// 在開發環境下驗證配置
if (config.features.debug) {
  const errors = validateConfig(config)
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:', errors)
  } else {
    console.log('✅ Configuration validation passed')
  }
  
  // 在 debug 模式下顯示配置
  console.group('🔧 App Configuration')
  console.log('Environment:', config.app.environment)
  console.log('API Base URL:', config.api.baseUrl)
  console.log('Debug Mode:', config.features.debug)
  console.log('Dark Mode:', config.ui.enableDarkMode)
  console.groupEnd()
}

// 工具函數
export const isProduction = () => config.app.environment === 'production'
export const isDevelopment = () => config.app.environment === 'development'
export const isDebugMode = () => config.features.debug
export const isAnalyticsEnabled = () => config.features.analytics
export const isErrorReportingEnabled = () => config.features.errorReporting

// 配置驗證器
export const validateEnvironmentVariables = (): boolean => {
  const errors = validateConfig(config)
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:', errors)
    return false
  }
  return true
}

// 安全的配置更新函數
export const updateConfig = (updates: Partial<AppConfig>) => {
  const updatedConfig = { ...config, ...updates }
  const errors = validateConfig(updatedConfig)
  
  if (errors.length > 0) {
    console.error('❌ Configuration update failed:', errors)
    throw new Error(`Configuration update failed: ${errors.join(', ')}`)
  }
  
  Object.assign(config, updates)
  console.log('✅ Configuration updated successfully')
}

// 配置重置函數
export const resetConfig = () => {
  const newConfig = createConfig()
  Object.assign(config, newConfig)
  console.log('🔄 Configuration reset to defaults')
}

// 獲取完整配置的只讀副本
export const getConfig = (): Readonly<AppConfig> => {
  return Object.freeze({ ...config })
}

// 導出配置類型
export type { AppConfig }
export default config