import { useState, useEffect, useCallback } from 'react';
import { ErrorCategory, ErrorSeverity } from './ErrorMessage';

// Toast 類型
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

// Toast 位置
export type ToastPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// Toast 配置
export interface ToastConfig {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  position?: ToastPosition;
  dismissible?: boolean;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  metadata?: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    timestamp?: Date;
    errorCode?: string;
  };
}

// Toast 狀態
export interface ToastState extends ToastConfig {
  isVisible: boolean;
  isEntering: boolean;
  isExiting: boolean;
  progress: number;
}

// Toast 樣式配置
const TOAST_STYLES = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: '✅',
    accent: 'bg-green-500'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200', 
    text: 'text-red-800',
    icon: '❌',
    accent: 'bg-red-500'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: '⚠️',
    accent: 'bg-yellow-500'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'ℹ️',
    accent: 'bg-blue-500'
  },
  loading: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    icon: '⏳',
    accent: 'bg-gray-500'
  }
};

// 位置樣式
const POSITION_STYLES = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4'
};

// 單個 Toast 組件
export interface ToastItemProps {
  toast: ToastState;
  onDismiss: (id: string) => void;
  onActionClick?: (id: string) => void;
  animated?: boolean;
}

export function ToastItem({ 
  toast, 
  onDismiss, 
  onActionClick,
  animated = true 
}: ToastItemProps) {
  const [progress, setProgress] = useState(100);
  
  const styles = TOAST_STYLES[toast.type];
  
  // 進度條動畫
  useEffect(() => {
    if (toast.duration && toast.duration > 0 && !toast.persistent) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - (100 / (toast.duration! / 100));
          if (newProgress <= 0) {
            clearInterval(interval);
            onDismiss(toast.id);
            return 0;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [toast.duration, toast.persistent, toast.id, onDismiss]);

  // 動畫類名
  const getAnimationClasses = () => {
    if (!animated) return '';
    
    const isTop = toast.position?.includes('top');
    const slideDirection = isTop ? '-translate-y-2' : 'translate-y-2';
    
    let classes = 'transition-all duration-300 ease-out ';
    
    if (toast.isEntering) {
      classes += `opacity-0 ${slideDirection} scale-95`;
    } else if (toast.isExiting) {
      classes += `opacity-0 ${slideDirection} scale-95`;
    } else {
      classes += 'opacity-100 translate-y-0 scale-100';
    }
    
    return classes;
  };

  return (
    <div
      className={`
        relative max-w-sm w-full pointer-events-auto
        ${styles.bg} ${styles.border} ${styles.text}
        border-2 rounded-lg shadow-lg p-4
        ${getAnimationClasses()}
        ${animated ? 'gpu-accelerated' : ''}
      `}
    >
      {/* 頂部進度條 */}
      {!toast.persistent && toast.duration && toast.duration > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg overflow-hidden">
          <div
            className={`h-full ${styles.accent} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 主要內容 */}
      <div className="flex items-start space-x-3">
        {/* 圖示 */}
        <div className="flex-shrink-0 text-lg">
          {toast.type === 'loading' ? (
            <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>{styles.icon}</span>
          )}
        </div>

        {/* 內容區域 */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className={`font-semibold text-sm ${styles.text} mb-1`}>
              {toast.title}
            </h4>
          )}
          
          <p className={`text-sm ${styles.text}`}>
            {toast.message}
          </p>

          {/* 元資訊 */}
          {toast.metadata && (
            <div className="mt-2 flex items-center space-x-2 text-xs opacity-75">
              {toast.metadata.category && (
                <span className="px-2 py-1 bg-white bg-opacity-50 rounded">
                  {toast.metadata.category}
                </span>
              )}
              {toast.metadata.severity && (
                <span className={`px-2 py-1 rounded ${
                  toast.metadata.severity === ErrorSeverity.CRITICAL ? 'bg-red-200' :
                  toast.metadata.severity === ErrorSeverity.HIGH ? 'bg-orange-200' :
                  toast.metadata.severity === ErrorSeverity.MEDIUM ? 'bg-yellow-200' :
                  'bg-blue-200'
                }`}>
                  {toast.metadata.severity}
                </span>
              )}
              {toast.metadata.timestamp && (
                <span>{toast.metadata.timestamp.toLocaleTimeString()}</span>
              )}
            </div>
          )}

          {/* 動作按鈕 */}
          {toast.action && (
            <div className="mt-3">
              <button
                onClick={() => {
                  toast.action!.onClick();
                  onActionClick?.(toast.id);
                }}
                className={`
                  text-sm font-medium underline hover:no-underline
                  ${styles.text} opacity-90 hover:opacity-100
                  transition-opacity duration-200
                  ${animated ? 'hover:scale-105' : ''}
                `}
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>

        {/* 關閉按鈕 */}
        {toast.dismissible !== false && (
          <button
            onClick={() => onDismiss(toast.id)}
            className={`
              flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10
              transition-all duration-200
              ${animated ? 'hover:scale-110' : ''}
            `}
            aria-label="關閉通知"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Toast 容器組件
export interface ToastContainerProps {
  toasts: ToastState[];
  position?: ToastPosition;
  maxToasts?: number;
  onDismiss: (id: string) => void;
  onActionClick?: (id: string) => void;
  animated?: boolean;
  className?: string;
}

export function ToastContainer({
  toasts,
  position = 'top-right',
  maxToasts = 5,
  onDismiss,
  onActionClick,
  animated = true,
  className = ''
}: ToastContainerProps) {
  // 限制顯示的 toast 數量
  const visibleToasts = toasts
    .filter(toast => toast.isVisible)
    .slice(-maxToasts);

  if (visibleToasts.length === 0) return null;

  return (
    <div
      className={`
        fixed z-50 pointer-events-none space-y-2
        ${POSITION_STYLES[position]}
        ${className}
      `}
      aria-live="polite"
      aria-label="通知"
    >
      {visibleToasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onActionClick={onActionClick}
          animated={animated}
        />
      ))}
    </div>
  );
}

// Toast 管理 Hook
export function useToast(defaultPosition: ToastPosition = 'top-right') {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  // 添加 toast
  const addToast = useCallback((config: Omit<ToastConfig, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newToast: ToastState = {
      ...config,
      id,
      position: config.position || defaultPosition,
      duration: config.duration ?? (config.type === 'loading' ? 0 : 5000),
      dismissible: config.dismissible ?? true,
      persistent: config.persistent ?? false,
      isVisible: true,
      isEntering: true,
      isExiting: false,
      progress: 100,
      metadata: {
        timestamp: new Date(),
        ...config.metadata
      }
    };

    setToasts(prev => [...prev, newToast]);

    // 入場動畫
    setTimeout(() => {
      setToasts(prev => 
        prev.map(toast => 
          toast.id === id 
            ? { ...toast, isEntering: false }
            : toast
        )
      );
    }, 50);

    return id;
  }, [defaultPosition]);

  // 移除 toast
  const removeToast = useCallback((id: string) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id 
          ? { ...toast, isExiting: true }
          : toast
      )
    );

    // 出場動畫後完全移除
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 300);
  }, []);

  // 清除所有 toast
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // 更新 toast
  const updateToast = useCallback((id: string, updates: Partial<ToastConfig>) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id 
          ? { ...toast, ...updates }
          : toast
      )
    );
  }, []);

  // 便利方法
  const success = useCallback((message: string, options?: Partial<ToastConfig>) => {
    return addToast({ ...options, type: 'success', message });
  }, [addToast]);

  const error = useCallback((message: string, options?: Partial<ToastConfig>) => {
    return addToast({ ...options, type: 'error', message, duration: 8000 });
  }, [addToast]);

  const warning = useCallback((message: string, options?: Partial<ToastConfig>) => {
    return addToast({ ...options, type: 'warning', message });
  }, [addToast]);

  const info = useCallback((message: string, options?: Partial<ToastConfig>) => {
    return addToast({ ...options, type: 'info', message });
  }, [addToast]);

  const loading = useCallback((message: string, options?: Partial<ToastConfig>) => {
    return addToast({ 
      ...options, 
      type: 'loading', 
      message, 
      persistent: true, 
      dismissible: false 
    });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    updateToast,
    success,
    error,
    warning,
    info,
    loading
  };
}

// Toast 工具函數
export function createErrorToast(
  error: Error | string,
  errorCode?: string,
  options?: Partial<ToastConfig>
): Omit<ToastConfig, 'id'> {
  const message = error instanceof Error ? error.message : error;
  
  return {
    type: 'error',
    title: '發生錯誤',
    message,
    duration: 8000,
    metadata: {
      errorCode,
      category: errorCode ? ErrorCategory.SYSTEM : undefined,
      severity: ErrorSeverity.HIGH,
      timestamp: new Date()
    },
    ...options
  };
}

export function createSuccessToast(
  message: string,
  options?: Partial<ToastConfig>
): Omit<ToastConfig, 'id'> {
  return {
    type: 'success',
    title: '操作成功',
    message,
    duration: 3000,
    ...options
  };
}

export function createWarningToast(
  message: string,
  options?: Partial<ToastConfig>
): Omit<ToastConfig, 'id'> {
  return {
    type: 'warning',
    title: '注意',
    message,
    duration: 5000,
    ...options
  };
}