export interface ErrorRecoveryOptions {
  /** 是否啟用自動重試 */
  enableAutoRetry: boolean;
  /** 最大重試次數 */
  maxRetries: number;
  /** 重試間隔（毫秒） */
  retryDelay: number;
  /** 是否顯示重新整理選項 */
  showRefresh: boolean;
  /** 是否顯示回到首頁選項 */
  showGoHome: boolean;
  /** 是否顯示聯繫支援選項 */
  showContactSupport: boolean;
  /** 是否顯示錯誤詳情 */
  showErrorDetails: boolean;
  /** 自定義恢復動作 */
  customActions: Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }>;
  /** 恢復建議文字 */
  suggestions: string[];
  /** 預期修復時間 */
  estimatedRecoveryTime?: string;
}

export function getRecoveryOptions(errorCode?: string): ErrorRecoveryOptions {
  // 基於錯誤代碼返回適當的恢復選項
  switch (errorCode) {
    case 'NETWORK_ERROR':
      return {
        enableAutoRetry: true,
        maxRetries: 3,
        retryDelay: 5000,
        showRefresh: true,
        showGoHome: false,
        showContactSupport: false,
        showErrorDetails: false,
        customActions: [],
        suggestions: [
          '檢查網路連接',
          '嘗試重新整理頁面',
          '稍後再試'
        ],
        estimatedRecoveryTime: '幾分鐘內'
      };
    
    case 'API_ERROR_500':
      return {
        enableAutoRetry: true,
        maxRetries: 2,
        retryDelay: 10000,
        showRefresh: true,
        showGoHome: false,
        showContactSupport: true,
        showErrorDetails: true,
        customActions: [],
        suggestions: [
          '伺服器暫時無法響應',
          '我們正在處理這個問題',
          '請稍後再試'
        ],
        estimatedRecoveryTime: '10-15 分鐘'
      };

    case 'API_ERROR_401':
      return {
        enableAutoRetry: false,
        maxRetries: 0,
        retryDelay: 0,
        showRefresh: false,
        showGoHome: true,
        showContactSupport: false,
        showErrorDetails: false,
        customActions: [
          {
            label: '重新登入',
            action: () => window.location.href = '/login',
            primary: true
          }
        ],
        suggestions: [
          '您的登入已過期',
          '請重新登入以繼續使用'
        ]
      };

    default:
      return {
        enableAutoRetry: false,
        maxRetries: 1,
        retryDelay: 3000,
        showRefresh: true,
        showGoHome: true,
        showContactSupport: true,
        showErrorDetails: true,
        customActions: [],
        suggestions: [
          '發生未知錯誤',
          '請嘗試重新整理頁面',
          '如問題持續請聯繫支援'
        ]
      };
  }
}

export function shouldShowRecovery(error: unknown): boolean {
  // 判斷是否應該顯示錯誤恢復組件
  if (!error) return false;
  
  // 對於某些錯誤類型，不顯示恢復選項
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('abort') || message.includes('cancel')) {
      return false;
    }
  }
  
  return true;
}