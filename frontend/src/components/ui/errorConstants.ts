// 錯誤類型分類
export const ErrorCategory = {
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  API: 'api',
  VALIDATION: 'validation',
  SYSTEM: 'system',
  WEBSOCKET: 'websocket',
  RATE_LIMIT: 'rate_limit'
} as const;

export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory];

// 錯誤嚴重程度
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];