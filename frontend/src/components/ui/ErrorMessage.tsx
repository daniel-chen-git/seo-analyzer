import { useMemo } from 'react';
import type { ErrorEntry } from '../../types/errorTypes';

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

// 錯誤訊息映射表
const ERROR_MESSAGES: Record<string, UserFriendlyError> = {
  // 網絡錯誤
  'NETWORK_ERROR': {
    title: '網路連接問題',
    message: '無法連接到伺服器，請檢查您的網路連接。',
    suggestion: '請檢查網路連接並重試，或稍後再試。',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    icon: '🌐',
    color: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600'
    }
  },
  'CONNECTION_TIMEOUT': {
    title: '連接超時',
    message: '伺服器響應時間過長，連接已超時。',
    suggestion: '請稍後重試，或檢查網路連接是否穩定。',
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    icon: '⏰',
    color: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600'
    }
  },
  // API 錯誤
  'API_ERROR_400': {
    title: '請求格式錯誤',
    message: '您提交的資料格式不正確。',
    suggestion: '請檢查輸入的資料是否完整且格式正確。',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    icon: '📝',
    color: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      icon: 'text-orange-600'
    }
  },
  'API_ERROR_401': {
    title: '身份驗證失敗',
    message: '您的登入狀態已過期或無效。',
    suggestion: '請重新登入或聯繫管理員。',
    category: ErrorCategory.API,
    severity: ErrorSeverity.HIGH,
    icon: '🔐',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600'
    }
  },
  'API_ERROR_403': {
    title: '權限不足',
    message: '您沒有權限執行此操作。',
    suggestion: '請聯繫管理員獲取相應權限。',
    category: ErrorCategory.API,
    severity: ErrorSeverity.HIGH,
    icon: '🚫',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600'
    }
  },
  'API_ERROR_404': {
    title: '資源不存在',
    message: '請求的資源不存在或已被刪除。',
    suggestion: '請檢查請求的資源是否正確，或聯繫技術支援。',
    category: ErrorCategory.API,
    severity: ErrorSeverity.MEDIUM,
    icon: '🔍',
    color: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-800',
      icon: 'text-gray-600'
    }
  },
  'API_ERROR_429': {
    title: '請求過於頻繁',
    message: '您的請求次數過多，已達到限制。',
    suggestion: '請稍候片刻再嘗試，或升級您的服務方案。',
    category: ErrorCategory.RATE_LIMIT,
    severity: ErrorSeverity.MEDIUM,
    icon: '🚦',
    color: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600'
    }
  },
  'API_ERROR_500': {
    title: '伺服器內部錯誤',
    message: '伺服器遇到了意外問題，無法完成請求。',
    suggestion: '請稍後重試，如問題持續存在請聯繫技術支援。',
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    icon: '⚠️',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600'
    }
  },
  // WebSocket 錯誤
  'WEBSOCKET_CONNECTION_FAILED': {
    title: '即時連接失敗',
    message: '無法建立即時通訊連接，已切換到輪詢模式。',
    suggestion: '系統已自動切換到備用模式，功能不受影響。',
    category: ErrorCategory.WEBSOCKET,
    severity: ErrorSeverity.LOW,
    icon: '🔄',
    color: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600'
    }
  },
  'WEBSOCKET_DISCONNECTED': {
    title: '連接已中斷',
    message: '即時連接已中斷，正在嘗試重新連接。',
    suggestion: '系統正在自動重連，請稍候。',
    category: ErrorCategory.WEBSOCKET,
    severity: ErrorSeverity.MEDIUM,
    icon: '🔌',
    color: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600'
    }
  },
  // 分析相關錯誤
  'ANALYSIS_FAILED': {
    title: 'SEO 分析失敗',
    message: '分析過程中遇到錯誤，無法完成。',
    suggestion: '請檢查輸入的網址是否正確，並重新嘗試分析。',
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    icon: '🔍',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600'
    }
  },
  'CRAWLING_BLOCKED': {
    title: '網站拒絕爬取',
    message: '目標網站拒絕了我們的訪問請求。',
    suggestion: '某些網站會阻擋自動化訪問，請嘗試其他網站或聯繫技術支援。',
    category: ErrorCategory.API,
    severity: ErrorSeverity.MEDIUM,
    icon: '🚪',
    color: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      icon: 'text-orange-600'
    }
  }
};

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

// 錯誤訊息工具函數
export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('network')) return 'NETWORK_ERROR';
    if (message.includes('timeout')) return 'CONNECTION_TIMEOUT';
    if (message.includes('401')) return 'API_ERROR_401';
    if (message.includes('403')) return 'API_ERROR_403';
    if (message.includes('404')) return 'API_ERROR_404';
    if (message.includes('429')) return 'API_ERROR_429';
    if (message.includes('500')) return 'API_ERROR_500';
  }
  
  if (typeof error === 'string' && ERROR_MESSAGES[error]) {
    return error;
  }

  return undefined;
}

// 判斷錯誤是否可重試
export function isRetryableError(errorCode?: string): boolean {
  const retryableErrors = [
    'NETWORK_ERROR',
    'CONNECTION_TIMEOUT', 
    'API_ERROR_500',
    'WEBSOCKET_CONNECTION_FAILED',
    'WEBSOCKET_DISCONNECTED'
  ];
  
  return errorCode ? retryableErrors.includes(errorCode) : false;
}

// 獲取建議的重試延遲時間
export function getRetryDelay(errorCode?: string): number {
  switch (errorCode) {
    case 'API_ERROR_429':
      return 60000; // 1分鐘
    case 'NETWORK_ERROR':
    case 'CONNECTION_TIMEOUT':
      return 5000; // 5秒
    case 'API_ERROR_500':
      return 10000; // 10秒
    default:
      return 3000; // 3秒
  }
}