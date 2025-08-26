import { useMemo } from 'react';
import type { ErrorEntry } from '../../types/errorTypes';
import { ErrorCategory, ErrorSeverity } from './errorConstants';
import { ERROR_MESSAGES } from './errorMessageUtils';

// 用戶友善錯誤訊息配置
interface UserFriendlyError {
  title: string;
  message: string;
  suggestion: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  icon: string;
  color: {
    bg: string;
    border: string;
    text: string;
    icon: string;
  };
}

// 預設錯誤訊息
const DEFAULT_ERROR: UserFriendlyError = {
  title: '未知錯誤',
  message: '發生了意外錯誤，請重試。',
  suggestion: '如果問題持續存在，請聯繫技術支援。',
  category: ErrorCategory.SYSTEM,
  severity: ErrorSeverity.MEDIUM,
  icon: '❗',
  color: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    icon: 'text-gray-600'
  }
};

export interface ErrorMessageProps {
  /** 錯誤資訊 */
  error?: Error | ErrorEntry | string | null;
  /** 錯誤代碼 */
  errorCode?: string;
  /** 自定義錯誤訊息 */
  customMessage?: string;
  /** 是否顯示建議 */
  showSuggestion?: boolean;
  /** 是否顯示圖示 */
  showIcon?: boolean;
  /** 是否顯示詳細資訊 */
  showDetails?: boolean;
  /** 是否可關閉 */
  dismissible?: boolean;
  /** 關閉回調 */
  onDismiss?: () => void;
  /** 自定義樣式類名 */
  className?: string;
  /** 顯示模式 */
  variant?: 'inline' | 'toast' | 'modal';
  /** 是否啟用動畫 */
  animated?: boolean;
}

export function ErrorMessage({
  error,
  errorCode,
  customMessage,
  showSuggestion = true,
  showIcon = true,
  showDetails = false,
  dismissible = true,
  onDismiss,
  className = '',
  variant = 'inline',
  animated = true
}: ErrorMessageProps) {
  // 解析錯誤訊息
  const userFriendlyError = useMemo((): UserFriendlyError => {
    // 優先使用錯誤代碼
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      return ERROR_MESSAGES[errorCode];
    }

    // 解析 Error 物件
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('network') || message.includes('fetch')) {
        return ERROR_MESSAGES['NETWORK_ERROR'];
      }
      if (message.includes('timeout')) {
        return ERROR_MESSAGES['CONNECTION_TIMEOUT'];
      }
      if (message.includes('401')) {
        return ERROR_MESSAGES['API_ERROR_401'];
      }
      if (message.includes('403')) {
        return ERROR_MESSAGES['API_ERROR_403'];
      }
      if (message.includes('404')) {
        return ERROR_MESSAGES['API_ERROR_404'];
      }
      if (message.includes('429')) {
        return ERROR_MESSAGES['API_ERROR_429'];
      }
      if (message.includes('500')) {
        return ERROR_MESSAGES['API_ERROR_500'];
      }
    }

    // 解析 ErrorEntry 物件
    if (error && typeof error === 'object' && 'type' in error) {
      const errorEntry = error as ErrorEntry;
      if (ERROR_MESSAGES[errorEntry.type]) {
        return ERROR_MESSAGES[errorEntry.type];
      }
    }

    // 解析字串錯誤
    if (typeof error === 'string' && ERROR_MESSAGES[error]) {
      return ERROR_MESSAGES[error];
    }

    return DEFAULT_ERROR;
  }, [error, errorCode]);

  // 獲取變體樣式
  const getVariantStyles = () => {
    switch (variant) {
      case 'toast':
        return 'fixed top-4 right-4 max-w-sm z-50 shadow-lg';
      case 'modal':
        return 'fixed inset-0 z-50 flex items-center justify-center p-4';
      default:
        return 'w-full';
    }
  };

  // 獲取嚴重程度指示器
  const getSeverityIndicator = () => {
    switch (userFriendlyError.severity) {
      case ErrorSeverity.CRITICAL:
        return <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />;
      case ErrorSeverity.HIGH:
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      case ErrorSeverity.MEDIUM:
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-blue-500 rounded-full" />;
    }
  };

  return (
    <div className={`${getVariantStyles()} ${className}`}>
      {variant === 'modal' && (
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onDismiss} />
      )}
      
      <div className={`
        relative rounded-lg border-2 p-4 
        ${userFriendlyError.color.bg} 
        ${userFriendlyError.color.border}
        ${animated ? 'animate-fade-in-scale gpu-accelerated' : ''}
        ${variant === 'modal' ? 'relative bg-white max-w-md mx-auto' : ''}
      `}>
        {/* 頭部區域 */}
        <div className="flex items-start space-x-3">
          {showIcon && (
            <div className={`flex-shrink-0 text-xl ${animated ? 'animate-bounce' : ''}`}>
              {userFriendlyError.icon}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {/* 標題與嚴重程度 */}
            <div className="flex items-center space-x-2 mb-1">
              {getSeverityIndicator()}
              <h3 className={`font-semibold text-sm ${userFriendlyError.color.text}`}>
                {userFriendlyError.title}
              </h3>
            </div>

            {/* 主要錯誤訊息 */}
            <p className={`text-sm ${userFriendlyError.color.text} mb-2`}>
              {customMessage || userFriendlyError.message}
            </p>

            {/* 建議 */}
            {showSuggestion && (
              <p className="text-xs text-gray-600 mb-3">
                💡 {userFriendlyError.suggestion}
              </p>
            )}

            {/* 詳細資訊 */}
            {showDetails && error && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 mb-2">
                  顯示技術詳情
                </summary>
                <div className="bg-gray-100 rounded p-2 text-xs font-mono overflow-auto max-h-24">
                  {error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}
                </div>
              </details>
            )}

            {/* 元資訊 */}
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>類別: {userFriendlyError.category}</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* 關閉按鈕 */}
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className={`flex-shrink-0 p-1 rounded-full hover:bg-gray-200 transition-colors ${animated ? 'hover:scale-110' : ''}`}
              aria-label="關閉錯誤訊息"
            >
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}