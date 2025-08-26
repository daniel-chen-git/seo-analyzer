import { useState, useEffect, useCallback, useRef } from 'react';
import { isRetryableError, getErrorCode } from './errorMessageUtils';
import type { RetryConfig, RetryState } from './smartRetryTypes';
import { DEFAULT_CONFIGS } from './smartRetryUtils';

export interface SmartRetryProps {
  /** 錯誤物件或錯誤代碼 */
  error?: Error | string | null;
  /** 錯誤代碼 */
  errorCode?: string;
  /** 重試函數 */
  onRetry: () => void | Promise<void>;
  /** 重試成功回調 */
  onRetrySuccess?: () => void;
  /** 重試失敗回調 */
  onRetryFailure?: (error: Error) => void;
  /** 重試耗盡回調 */
  onRetriesExhausted?: () => void;
  /** 自定義重試配置 */
  config?: Partial<RetryConfig>;
  /** 是否自動開始重試 */
  autoStart?: boolean;
  /** 是否顯示進度 */
  showProgress?: boolean;
  /** 是否顯示詳細資訊 */
  showDetails?: boolean;
  /** 自定義樣式 */
  className?: string;
  /** 是否啟用動畫 */
  animated?: boolean;
}

export function SmartRetry({
  error,
  errorCode,
  onRetry,
  onRetrySuccess,
  onRetryFailure,
  onRetriesExhausted,
  config: customConfig,
  autoStart = true,
  showProgress = true,
  showDetails = false,
  className = '',
  animated = true
}: SmartRetryProps) {
  const [state, setState] = useState<RetryState>({
    attempt: 0,
    nextRetryIn: 0,
    isRetrying: false,
    canRetry: true,
    totalElapsed: 0
  });

  const startTimeRef = useRef<Date | null>(null);
  const countdownRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

  // 獲取錯誤代碼和配置
  const resolvedErrorCode = errorCode || getErrorCode(error);
  const canRetryError = isRetryableError(resolvedErrorCode);
  
  const config: RetryConfig = {
    ...DEFAULT_CONFIGS[resolvedErrorCode || ''] || DEFAULT_CONFIGS['NETWORK_ERROR'],
    ...customConfig
  };

  // 計算下次重試延遲
  const calculateDelay = useCallback((attempt: number): number => {
    let delay: number;
    
    switch (config.strategy) {
      case 'immediate':
        delay = 0;
        break;
      case 'exponential':
        delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );
        break;
      case 'fixed':
        delay = config.baseDelay;
        break;
      default:
        delay = config.baseDelay;
    }

    // 添加抖動以避免雷群效應
    if (config.jitter) {
      delay = delay + Math.random() * delay * 0.1;
    }

    return Math.min(delay, config.maxDelay);
  }, [config]);

  // 開始倒數計時
  const startCountdown = useCallback((delay: number) => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    setState(prev => ({ ...prev, nextRetryIn: Math.ceil(delay / 1000) }));

    countdownRef.current = setInterval(() => {
      setState(prev => {
        const newNextRetryIn = prev.nextRetryIn - 1;
        if (newNextRetryIn <= 0) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
        }
        return {
          ...prev,
          nextRetryIn: Math.max(0, newNextRetryIn),
          totalElapsed: startTimeRef.current 
            ? Date.now() - startTimeRef.current.getTime()
            : prev.totalElapsed
        };
      });
    }, 1000);
  }, []);

  // 執行重試
  const executeRetry = useCallback(async () => {
    if (!state.canRetry || state.isRetrying) return;

    setState(prev => ({
      ...prev,
      isRetrying: true,
      lastAttemptAt: new Date()
    }));

    try {
      await onRetry();
      onRetrySuccess?.();
      
      setState(prev => ({
        ...prev,
        isRetrying: false,
        canRetry: false
      }));
      
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      
    } catch (retryError) {
      const newAttempt = state.attempt + 1;
      const canContinue = newAttempt < config.maxRetries;
      
      if (canContinue) {
        const delay = calculateDelay(newAttempt);
        
        setState(prev => ({
          ...prev,
          attempt: newAttempt,
          isRetrying: false,
          canRetry: true
        }));
        
        startCountdown(delay);
        
        retryTimeoutRef.current = setTimeout(() => {
          if (state.canRetry && !state.isRetrying) {
            executeRetry();
          }
        }, delay);
        
      } else {
        setState(prev => ({
          ...prev,
          attempt: newAttempt,
          isRetrying: false,
          canRetry: false
        }));
        
        onRetriesExhausted?.();
      }
      
      onRetryFailure?.(retryError instanceof Error ? retryError : new Error(String(retryError)));
    }
  }, [state.canRetry, state.isRetrying, state.attempt, config.maxRetries, onRetry, onRetrySuccess, onRetryFailure, onRetriesExhausted, calculateDelay, startCountdown]);

  // 手動重試
  const manualRetry = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    
    setState(prev => ({ ...prev, nextRetryIn: 0 }));
    executeRetry();
  }, [executeRetry]);

  // 停止重試
  const stopRetry = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    
    setState(prev => ({
      ...prev,
      canRetry: false,
      isRetrying: false,
      nextRetryIn: 0
    }));
  }, []);

  // 重置重試狀態
  const resetRetry = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    
    startTimeRef.current = new Date();
    setState({
      attempt: 0,
      nextRetryIn: 0,
      isRetrying: false,
      canRetry: canRetryError,
      totalElapsed: 0
    });
  }, [canRetryError]);

  // 初始化和自動開始
  useEffect(() => {
    if (error && canRetryError && autoStart && state.attempt === 0) {
      startTimeRef.current = new Date();
      const delay = calculateDelay(1);
      
      setState(prev => ({
        ...prev,
        canRetry: true
      }));
      
      startCountdown(delay);
      
      retryTimeoutRef.current = setTimeout(() => {
        executeRetry();
      }, delay);
    }
  }, [error, canRetryError, autoStart, state.attempt, calculateDelay, startCountdown, executeRetry]);

  // 清理定時器
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // 如果錯誤不可重試，不顯示組件
  if (!canRetryError) return null;

  const progress = state.attempt > 0 ? (state.attempt / config.maxRetries) * 100 : 0;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className} ${animated ? 'animate-fade-in-scale' : ''}`}>
      {/* 標題和狀態 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            state.isRetrying ? 'bg-blue-500 animate-pulse' :
            state.canRetry ? 'bg-yellow-500' :
            state.attempt >= config.maxRetries ? 'bg-red-500' :
            'bg-green-500'
          }`} />
          <h3 className="font-semibold text-gray-800">
            智能重試系統
          </h3>
        </div>
        
        <div className="text-sm text-gray-600">
          {state.isRetrying ? '重試中...' :
           state.nextRetryIn > 0 ? `${state.nextRetryIn}秒後重試` :
           state.canRetry ? '準備重試' :
           state.attempt >= config.maxRetries ? '重試已耗盡' :
           '重試成功'}
        </div>
      </div>

      {/* 進度條 */}
      {showProgress && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>重試進度</span>
            <span>{state.attempt}/{config.maxRetries}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                state.attempt >= config.maxRetries ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.max(progress, state.attempt > 0 ? 10 : 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* 倒數計時 */}
      {state.nextRetryIn > 0 && (
        <div className={`mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg ${animated ? 'animate-pulse' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-blue-800">
                下次重試倒數: {state.nextRetryIn} 秒
              </span>
            </div>
            <button
              onClick={manualRetry}
              className={`text-xs text-blue-600 hover:text-blue-800 underline ${animated ? 'hover:scale-105' : ''}`}
            >
              立即重試
            </button>
          </div>
        </div>
      )}

      {/* 重試中狀態 */}
      {state.isRetrying && (
        <div className={`mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg ${animated ? 'animate-pulse' : ''}`}>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-yellow-800">
              正在執行第 {state.attempt + 1} 次重試...
            </span>
          </div>
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {state.canRetry && !state.isRetrying && state.nextRetryIn === 0 && (
          <button
            onClick={manualRetry}
            className={`
              flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 transition-all duration-200
              ${animated ? 'hover:scale-105 active:scale-95' : ''}
            `}
          >
            <span>🔄</span>
            <span>手動重試</span>
          </button>
        )}

        {(state.canRetry || state.nextRetryIn > 0) && (
          <button
            onClick={stopRetry}
            className={`
              flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg
              hover:bg-red-700 transition-all duration-200
              ${animated ? 'hover:scale-105 active:scale-95' : ''}
            `}
          >
            <span>⏹️</span>
            <span>停止重試</span>
          </button>
        )}

        <button
          onClick={resetRetry}
          className={`
            flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg
            hover:bg-gray-700 transition-all duration-200
            ${animated ? 'hover:scale-105 active:scale-95' : ''}
          `}
        >
          <span>🔄</span>
          <span>重置</span>
        </button>
      </div>

      {/* 詳細資訊 */}
      {showDetails && (
        <div className="border-t border-gray-200 pt-4 space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>重試策略:</span>
            <span className="font-medium">{config.strategy}</span>
          </div>
          <div className="flex justify-between">
            <span>基礎延遲:</span>
            <span className="font-medium">{config.baseDelay}ms</span>
          </div>
          {state.lastAttemptAt && (
            <div className="flex justify-between">
              <span>上次嘗試:</span>
              <span className="font-medium">{state.lastAttemptAt.toLocaleTimeString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>總耗時:</span>
            <span className="font-medium">{Math.round(state.totalElapsed / 1000)}秒</span>
          </div>
        </div>
      )}

      {/* 重試耗盡提示 */}
      {state.attempt >= config.maxRetries && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">⚠️</span>
            <p className="text-sm text-red-700">
              已達到最大重試次數 ({config.maxRetries})。請檢查錯誤原因或聯繫技術支援。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

