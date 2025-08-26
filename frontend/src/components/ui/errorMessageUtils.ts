import { ErrorCategory, ErrorSeverity } from './errorConstants';

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
export const ERROR_MESSAGES: Record<string, UserFriendlyError> = {
  // 網絡錯誤
  'NETWORK_ERROR': {
    title: '網路連接問題',
    message: '無法連接到伺服器，請檢查您的網路連接。',
    suggestion: '請檢查網路連接並重試，或稍後再試。',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    icon: '🌐',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: 'text-red-500'
    }
  },

  'CONNECTION_TIMEOUT': {
    title: '連接超時',
    message: '請求超時，伺服器響應時間過長。',
    suggestion: '請稍後再試，或檢查網路連接速度。',
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    icon: '⏱️',
    color: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      icon: 'text-yellow-500'
    }
  },

  // API 錯誤
  'API_ERROR_400': {
    title: '請求錯誤',
    message: '您的請求包含無效數據。',
    suggestion: '請檢查輸入內容並重試。',
    category: ErrorCategory.API,
    severity: ErrorSeverity.MEDIUM,
    icon: '❌',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: 'text-red-500'
    }
  },

  'API_ERROR_401': {
    title: '未授權',
    message: '您的登入已過期或無效。',
    suggestion: '請重新登入後再試。',
    category: ErrorCategory.API,
    severity: ErrorSeverity.HIGH,
    icon: '🔒',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: 'text-red-500'
    }
  },

  'API_ERROR_403': {
    title: '權限不足',
    message: '您沒有執行此操作的權限。',
    suggestion: '請聯繫管理員獲取必要權限。',
    category: ErrorCategory.API,
    severity: ErrorSeverity.HIGH,
    icon: '🚫',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: 'text-red-500'
    }
  },

  'API_ERROR_404': {
    title: '資源不存在',
    message: '請求的資源未找到。',
    suggestion: '請檢查請求地址是否正確。',
    category: ErrorCategory.API,
    severity: ErrorSeverity.MEDIUM,
    icon: '🔍',
    color: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      icon: 'text-yellow-500'
    }
  },

  'API_ERROR_429': {
    title: '請求過於頻繁',
    message: '您的請求速度過快，請稍後再試。',
    suggestion: '請等待一分鐘後再重試。',
    category: ErrorCategory.RATE_LIMIT,
    severity: ErrorSeverity.MEDIUM,
    icon: '⚡',
    color: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      icon: 'text-yellow-500'
    }
  },

  'API_ERROR_500': {
    title: '伺服器錯誤',
    message: '伺服器發生內部錯誤。',
    suggestion: '請稍後再試，如問題持續請聯繫技術支援。',
    category: ErrorCategory.API,
    severity: ErrorSeverity.HIGH,
    icon: '🔧',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: 'text-red-500'
    }
  },

  // WebSocket 錯誤
  'WEBSOCKET_CONNECTION_FAILED': {
    title: 'WebSocket 連接失敗',
    message: '無法建立即時通訊連接。',
    suggestion: '請刷新頁面重試，或檢查網路連接。',
    category: ErrorCategory.WEBSOCKET,
    severity: ErrorSeverity.MEDIUM,
    icon: '🔌',
    color: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      icon: 'text-yellow-500'
    }
  },

  'WEBSOCKET_DISCONNECTED': {
    title: 'WebSocket 連接中斷',
    message: '即時通訊連接已中斷。',
    suggestion: '正在嘗試重新連接，請稍候。',
    category: ErrorCategory.WEBSOCKET,
    severity: ErrorSeverity.LOW,
    icon: '📡',
    color: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: 'text-blue-500'
    }
  },

  // 驗證錯誤
  'VALIDATION_REQUIRED': {
    title: '必填欄位',
    message: '請填寫所有必要的欄位。',
    suggestion: '檢查表單中標示為必填的欄位。',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    icon: '📝',
    color: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      icon: 'text-yellow-500'
    }
  },

  'VALIDATION_FORMAT': {
    title: '格式錯誤',
    message: '輸入格式不正確。',
    suggestion: '請按照提示的格式重新輸入。',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    icon: '⚠️',
    color: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      icon: 'text-yellow-500'
    }
  },

  // 系統錯誤
  'SYSTEM_ERROR': {
    title: '系統錯誤',
    message: '系統發生未知錯誤。',
    suggestion: '請重試，如問題持續請聯繫技術支援。',
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.CRITICAL,
    icon: '💻',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: 'text-red-500'
    }
  },

  // 預設錯誤
  'UNKNOWN_ERROR': {
    title: '未知錯誤',
    message: '發生了未知的錯誤。',
    suggestion: '請重試，如問題持續請聯繫技術支援。',
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    icon: '❓',
    color: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      icon: 'text-gray-500'
    }
  }
};

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