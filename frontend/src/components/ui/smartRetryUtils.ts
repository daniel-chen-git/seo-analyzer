import type { RetryConfig, RetryStrategy } from './smartRetryTypes';

// 預設配置
export const DEFAULT_CONFIGS: Record<string, RetryConfig> = {
  'NETWORK_ERROR': {
    maxRetries: 3,
    strategy: 'exponential',
    baseDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true
  },
  'CONNECTION_TIMEOUT': {
    maxRetries: 5,
    strategy: 'exponential',
    baseDelay: 1000,
    maxDelay: 15000,
    backoffFactor: 1.5,
    jitter: true
  },
  'API_ERROR_500': {
    maxRetries: 3,
    strategy: 'exponential',
    baseDelay: 3000,
    maxDelay: 60000,
    backoffFactor: 2,
    jitter: false
  },
  'API_ERROR_429': {
    maxRetries: 8,
    strategy: 'exponential',
    baseDelay: 5000,
    maxDelay: 300000,
    backoffFactor: 2,
    jitter: false
  },
  'WEBSOCKET_CONNECTION_FAILED': {
    maxRetries: 10,
    strategy: 'exponential',
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 1.8,
    jitter: true
  },
  'WEBSOCKET_DISCONNECTED': {
    maxRetries: 5,
    strategy: 'fixed',
    baseDelay: 2000,
    maxDelay: 10000,
    backoffFactor: 1,
    jitter: false
  }
};

// 重試配置工具函數
export function createRetryConfig(
  errorCode: string,
  overrides: Partial<RetryConfig> = {}
): RetryConfig {
  return {
    ...DEFAULT_CONFIGS[errorCode] || DEFAULT_CONFIGS['NETWORK_ERROR'],
    ...overrides
  };
}

// 計算重試延遲工具函數
export function calculateRetryDelay(
  attempt: number,
  strategy: RetryStrategy,
  baseDelay: number,
  backoffFactor: number,
  maxDelay: number,
  jitter: boolean = false
): number {
  let delay: number;
  
  switch (strategy) {
    case 'immediate':
      delay = 0;
      break;
    case 'exponential':
      delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
      break;
    case 'fixed':
      delay = baseDelay;
      break;
    default:
      delay = baseDelay;
  }

  if (jitter) {
    delay = delay + Math.random() * delay * 0.1;
  }

  return Math.min(delay, maxDelay);
}