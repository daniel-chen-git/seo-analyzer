// 重試策略
export type RetryStrategy = 'immediate' | 'exponential' | 'fixed' | 'custom';

// 重試配置
export interface RetryConfig {
  maxRetries: number;
  strategy: RetryStrategy;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
}

// 重試狀態
export interface RetryState {
  attempt: number;
  nextRetryIn: number;
  isRetrying: boolean;
  canRetry: boolean;
  lastAttemptAt?: Date;
  totalElapsed: number;
}