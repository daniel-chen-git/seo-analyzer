import { useState, useEffect, useCallback } from 'react';
import { getErrorCode, getRetryDelay } from './errorMessageUtils';

// 錯誤恢復選項介面
export interface ErrorRecoveryOptions {
  canRetry: boolean;
  retryDelay?: number;
  maxRetries?: number;
  recoverySteps: string[];
  contactSupport?: boolean;
  alternativeActions?: Array<{
    label: string;
    action: () => void | Promise<void>;
    icon?: string;
  }>;
}

// 錯誤恢復建議配置
const RECOVERY_SUGGESTIONS: Record<string, ErrorRecoveryOptions> = {
  'NETWORK_ERROR': {
    canRetry: true,
    retryDelay: 5000,
    maxRetries: 3,
    contactSupport: false,
    recoverySteps: [
      '檢查您的網路連接是否正常',
      '確認防火牆沒有阻擋連接',
      '嘗試重新整理頁面',
      '如果使用VPN，請嘗試關閉後重試'
    ],
    alternativeActions: [
      { label: '檢測網路', action: () => { window.open('https://www.google.com', '_blank'); }, icon: '🌐' },
      { label: '重新整理', action: () => window.location.reload(), icon: '🔄' }
    ]
  },
  'CONNECTION_TIMEOUT': {
    canRetry: true,
    retryDelay: 10000,
    maxRetries: 2,
    contactSupport: false,
    recoverySteps: [
      '等待網路連接穩定',
      '嘗試關閉其他佔用頻寬的應用程式',
      '檢查網路速度是否正常',
      '稍後再嘗試執行操作'
    ],
    alternativeActions: [
      { label: '測試網速', action: () => { window.open('https://fast.com', '_blank'); }, icon: '⚡' }
    ]
  },
  'API_ERROR_401': {
    canRetry: false,
    contactSupport: true,
    recoverySteps: [
      '請重新登入您的帳戶',
      '清除瀏覽器快取和 Cookie',
      '確認帳戶權限是否正常',
      '聯繫管理員重置權限'
    ],
    alternativeActions: [
      { label: '重新登入', action: () => { window.location.href = '/login'; }, icon: '🔐' },
      { label: '清除快取', action: () => window.location.reload(), icon: '🧹' }
    ]
  },
  'API_ERROR_403': {
    canRetry: false,
    contactSupport: true,
    recoverySteps: [
      '確認您有執行此操作的權限',
      '聯繫管理員申請相應權限',
      '檢查帳戶狀態是否正常',
      '確認服務方案是否支援此功能'
    ]
  },
  'API_ERROR_404': {
    canRetry: false,
    contactSupport: false,
    recoverySteps: [
      '檢查輸入的網址是否正確',
      '確認資源是否仍然存在',
      '嘗試搜尋相關資源',
      '回到首頁重新開始'
    ],
    alternativeActions: [
      { label: '回到首頁', action: () => { window.location.href = '/'; }, icon: '🏠' }
    ]
  },
  'API_ERROR_429': {
    canRetry: true,
    retryDelay: 60000,
    maxRetries: 1,
    contactSupport: false,
    recoverySteps: [
      '請稍候片刻再嘗試',
      '考慮升級您的服務方案',
      '分散請求時間避免集中操作',
      '聯繫客服了解限制詳情'
    ]
  },
  'API_ERROR_500': {
    canRetry: true,
    retryDelay: 10000,
    maxRetries: 2,
    contactSupport: true,
    recoverySteps: [
      '伺服器遇到臨時問題',
      '請稍後重新嘗試',
      '如果問題持續，請聯繫技術支援',
      '可嘗試使用其他功能'
    ]
  },
  'WEBSOCKET_CONNECTION_FAILED': {
    canRetry: true,
    retryDelay: 5000,
    maxRetries: 3,
    contactSupport: false,
    recoverySteps: [
      '系統已自動切換到輪詢模式',
      '即時功能可能受到影響',
      '檢查網路連接穩定性',
      '功能將持續正常運作'
    ]
  },
  'ANALYSIS_FAILED': {
    canRetry: true,
    retryDelay: 5000,
    maxRetries: 2,
    contactSupport: true,
    recoverySteps: [
      '檢查輸入的網址格式是否正確',
      '確認目標網站可以正常訪問',
      '嘗試分析其他網站',
      '聯繫技術支援獲取協助'
    ],
    alternativeActions: [
      { label: '檢查網址', action: () => {}, icon: '🔗' },
      { label: '嘗試範例', action: () => {}, icon: '📝' }
    ]
  },
  'CRAWLING_BLOCKED': {
    canRetry: false,
    contactSupport: true,
    recoverySteps: [
      '目標網站阻擋了自動化訪問',
      '嘗試分析其他類似網站',
      '聯繫目標網站管理員',
      '考慮手動收集分析資料'
    ]
  }
};

export interface ErrorRecoveryProps {
  /** 錯誤物件或錯誤代碼 */
  error?: Error | string | null;
  /** 錯誤代碼 */
  errorCode?: string;
  /** 重試回調函數 */
  onRetry?: () => void | Promise<void>;
  /** 聯繫客服回調 */
  onContactSupport?: () => void;
  /** 自定義恢復選項 */
  customRecoveryOptions?: Partial<ErrorRecoveryOptions>;
  /** 是否顯示自動重試 */
  showAutoRetry?: boolean;
  /** 是否啟用動畫 */
  animated?: boolean;
  /** 自定義樣式 */
  className?: string;
}

export function ErrorRecovery({
  error,
  errorCode,
  onRetry,
  onContactSupport,
  customRecoveryOptions,
  showAutoRetry = true,
  animated = true,
  className = ''
}: ErrorRecoveryProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRetryCountdown, setAutoRetryCountdown] = useState(0);
  const [showSteps, setShowSteps] = useState(false);

  // 獲取錯誤代碼
  const resolvedErrorCode = errorCode || getErrorCode(error);
  
  // 獲取恢復選項
  const recoveryOptions: ErrorRecoveryOptions = {
    ...RECOVERY_SUGGESTIONS[resolvedErrorCode || ''] || {
      canRetry: false,
      recoverySteps: ['請重新嘗試或聯繫技術支援'],
      contactSupport: true
    },
    ...customRecoveryOptions
  };

  // 自動重試倒數計時
  useEffect(() => {
    if (showAutoRetry && recoveryOptions.canRetry && retryCount === 0 && autoRetryCountdown === 0) {
      const delay = recoveryOptions.retryDelay || getRetryDelay(resolvedErrorCode);
      setAutoRetryCountdown(Math.ceil(delay / 1000));
      
      const timer = setInterval(() => {
        setAutoRetryCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoRetry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showAutoRetry, recoveryOptions.canRetry, recoveryOptions.retryDelay, retryCount, resolvedErrorCode, autoRetryCountdown, handleAutoRetry]);

  // 處理手動重試
  const handleManualRetry = useCallback(async () => {
    if (!recoveryOptions.canRetry || isRetrying) return;
    
    const maxRetries = recoveryOptions.maxRetries || 3;
    if (retryCount >= maxRetries) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      if (onRetry) {
        await onRetry();
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  }, [recoveryOptions.canRetry, recoveryOptions.maxRetries, isRetrying, retryCount, onRetry]);

  // 處理自動重試
  const handleAutoRetry = useCallback(async () => {
    if (!recoveryOptions.canRetry) return;
    
    setRetryCount(1);
    await handleManualRetry();
  }, [recoveryOptions.canRetry, handleManualRetry]);

  // 停止自動重試
  const stopAutoRetry = () => {
    setAutoRetryCountdown(0);
  };

  // 執行替代動作
  const executeAlternativeAction = async (action: () => void | Promise<void>) => {
    try {
      await action();
    } catch (error) {
      console.error('Alternative action failed:', error);
    }
  };

  const maxRetries = recoveryOptions.maxRetries || 3;
  const canRetry = recoveryOptions.canRetry && retryCount < maxRetries;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className} ${animated ? 'animate-fade-in-scale' : ''}`}>
      {/* 標題 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center">
          🛠️ 錯誤恢復建議
        </h3>
        <button
          onClick={() => setShowSteps(!showSteps)}
          className={`text-sm text-blue-600 hover:text-blue-800 transition-colors ${animated ? 'hover:scale-105' : ''}`}
        >
          {showSteps ? '隱藏步驟' : '顯示步驟'}
        </button>
      </div>

      {/* 自動重試倒數 */}
      {autoRetryCountdown > 0 && (
        <div className={`mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg ${animated ? 'animate-pulse' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm text-blue-800">
                將在 {autoRetryCountdown} 秒後自動重試
              </span>
            </div>
            <button
              onClick={stopAutoRetry}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              取消自動重試
            </button>
          </div>
        </div>
      )}

      {/* 重試狀態 */}
      {retryCount > 0 && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-600">
            已重試 {retryCount}/{maxRetries} 次
            {isRetrying && <span className="ml-2 text-blue-600">重試中...</span>}
          </div>
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {canRetry && (
          <button
            onClick={handleManualRetry}
            disabled={isRetrying}
            className={`
              flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              ${animated ? 'hover:scale-105 active:scale-95' : ''}
            `}
          >
            {isRetrying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>重試中...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>立即重試</span>
              </>
            )}
          </button>
        )}

        {recoveryOptions.contactSupport && onContactSupport && (
          <button
            onClick={onContactSupport}
            className={`
              flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg
              hover:bg-orange-700 transition-all duration-200
              ${animated ? 'hover:scale-105 active:scale-95' : ''}
            `}
          >
            <span>📞</span>
            <span>聯繫客服</span>
          </button>
        )}
      </div>

      {/* 替代動作 */}
      {recoveryOptions.alternativeActions && recoveryOptions.alternativeActions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">快速解決方案：</h4>
          <div className="flex flex-wrap gap-2">
            {recoveryOptions.alternativeActions.map((action, index) => (
              <button
                key={index}
                onClick={() => executeAlternativeAction(action.action)}
                className={`
                  flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 text-gray-700
                  rounded-md hover:bg-gray-200 transition-colors
                  ${animated ? 'hover:scale-105' : ''}
                `}
              >
                {action.icon && <span>{action.icon}</span>}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 恢復步驟 */}
      {showSteps && (
        <div className={`border-t border-gray-200 pt-4 ${animated ? 'animate-slide-in-up' : ''}`}>
          <h4 className="text-sm font-medium text-gray-700 mb-3">建議的恢復步驟：</h4>
          <ol className="space-y-2">
            {recoveryOptions.recoverySteps.map((step, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 提示訊息 */}
      {!canRetry && retryCount >= maxRetries && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            ⚠️ 已達到最大重試次數。如果問題持續存在，請聯繫技術支援。
          </p>
        </div>
      )}
    </div>
  );
}

