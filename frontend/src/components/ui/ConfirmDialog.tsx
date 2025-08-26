import { useEffect, useRef, useState, useCallback } from 'react';

// 對話框類型
export type DialogType = 'info' | 'warning' | 'error' | 'success' | 'question';

// 對話框配置
export interface ConfirmDialogProps {
  /** 是否顯示對話框 */
  isOpen: boolean;
  /** 對話框類型 */
  type?: DialogType;
  /** 對話框標題 */
  title: string;
  /** 對話框內容 */
  message: string;
  /** 確認按鈕文字 */
  confirmText?: string;
  /** 取消按鈕文字 */
  cancelText?: string;
  /** 是否顯示取消按鈕 */
  showCancel?: boolean;
  /** 確認按鈕樣式 */
  confirmVariant?: 'primary' | 'danger' | 'warning' | 'success';
  /** 確認回調 */
  onConfirm: () => void;
  /** 取消回調 */
  onCancel: () => void;
  /** 是否點擊遮罩關閉 */
  closeOnOverlayClick?: boolean;
  /** 是否按 ESC 關閉 */
  closeOnEscape?: boolean;
  /** 是否啟用動畫 */
  animated?: boolean;
  /** 自定義樣式 */
  className?: string;
  /** 額外內容 */
  children?: React.ReactNode;
}

// 對話框樣式配置
const DIALOG_STYLES = {
  info: {
    icon: 'ℹ️',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  warning: {
    icon: '⚠️',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  error: {
    icon: '❌',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  success: {
    icon: '✅',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  question: {
    icon: '❓',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  }
};

// 按鈕樣式配置
const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white'
};

export function ConfirmDialog({
  isOpen,
  type = 'question',
  title,
  message,
  confirmText = '確認',
  cancelText = '取消',
  showCancel = true,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  animated = true,
  className = '',
  children
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // 樣式配置
  const styles = DIALOG_STYLES[type];
  const confirmButtonStyles = BUTTON_VARIANTS[confirmVariant];

  // ESC 鍵關閉
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onCancel]);

  // 焦點管理
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // 阻止背景滾動
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        bg-black bg-opacity-50 backdrop-blur-sm
        ${animated ? 'animate-fade-in-scale' : ''}
      `}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div
        ref={dialogRef}
        className={`
          relative w-full max-w-md mx-auto bg-white rounded-lg shadow-xl
          ${animated ? 'animate-slide-in-up' : ''}
          ${className}
        `}
      >
        {/* 頭部圖示區域 */}
        <div className={`p-6 pb-4 ${styles.bgColor} ${styles.borderColor} border-b`}>
          <div className="flex items-center space-x-3">
            <div className={`text-2xl ${styles.color}`}>
              {styles.icon}
            </div>
            <div className="flex-1">
              <h3 
                id="dialog-title"
                className={`text-lg font-semibold ${styles.color}`}
              >
                {title}
              </h3>
            </div>
          </div>
        </div>

        {/* 內容區域 */}
        <div className="p-6">
          <p 
            id="dialog-description"
            className="text-gray-700 mb-4 leading-relaxed"
          >
            {message}
          </p>

          {/* 額外內容 */}
          {children && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
              {children}
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-3">
            {showCancel && (
              <button
                type="button"
                onClick={onCancel}
                className={`
                  px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 
                  rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 
                  focus:ring-gray-300 focus:ring-offset-2
                  transition-all duration-200
                  ${animated ? 'hover:scale-105 active:scale-95' : ''}
                `}
              >
                {cancelText}
              </button>
            )}
            
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={onConfirm}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg
                focus:outline-none focus:ring-2 focus:ring-offset-2
                transition-all duration-200
                ${confirmButtonStyles}
                ${confirmVariant === 'primary' ? 'focus:ring-blue-300' :
                  confirmVariant === 'danger' ? 'focus:ring-red-300' :
                  confirmVariant === 'warning' ? 'focus:ring-yellow-300' :
                  'focus:ring-green-300'}
                ${animated ? 'hover:scale-105 active:scale-95' : ''}
              `}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 預定義對話框配置
export const DIALOG_PRESETS = {
  // 錯誤處理相關
  retryAnalysis: {
    type: 'warning' as DialogType,
    title: '重新分析確認',
    message: '是否要重新開始 SEO 分析？當前進度將會丟失。',
    confirmText: '重新開始',
    confirmVariant: 'warning' as const
  },
  
  cancelAnalysis: {
    type: 'warning' as DialogType,
    title: '取消分析確認',
    message: '確定要取消當前的 SEO 分析嗎？已收集的數據將會保留。',
    confirmText: '取消分析',
    cancelText: '繼續分析',
    confirmVariant: 'danger' as const
  },

  pauseAnalysis: {
    type: 'info' as DialogType,
    title: '暫停分析',
    message: '分析將暫停，您可以隨時恢復。已收集的數據會保留。',
    confirmText: '確定暫停',
    cancelText: '繼續分析',
    confirmVariant: 'warning' as const
  },
  
  resumeAnalysis: {
    type: 'info' as DialogType,
    title: '恢復分析',
    message: '是否要恢復分析？將從暫停的位置繼續執行。',
    confirmText: '恢復分析',
    cancelText: '保持暫停',
    confirmVariant: 'success' as const
  },

  deleteAnalysis: {
    type: 'error' as DialogType,
    title: '刪除分析結果',
    message: '確定要刪除此分析結果嗎？此操作無法撤銷。',
    confirmText: '刪除',
    confirmVariant: 'danger' as const
  },

  networkError: {
    type: 'error' as DialogType,
    title: '網路連接錯誤',
    message: '無法連接到伺服器。請檢查您的網路連接並重試。',
    confirmText: '重試',
    cancelText: '稍後再試',
    confirmVariant: 'primary' as const
  },

  sessionExpired: {
    type: 'warning' as DialogType,
    title: '會話已過期',
    message: '您的登入會話已過期，需要重新登入才能繼續使用。',
    confirmText: '重新登入',
    confirmVariant: 'warning' as const,
    showCancel: false
  },

  unsavedChanges: {
    type: 'warning' as DialogType,
    title: '未保存的更改',
    message: '您有未保存的更改。離開此頁面將會丟失這些更改。',
    confirmText: '離開',
    cancelText: '留在此頁',
    confirmVariant: 'danger' as const
  },

  dataLoss: {
    type: 'error' as DialogType,
    title: '數據丟失風險',
    message: '此操作可能導致數據丟失。請確認您已備份重要數據。',
    confirmText: '我已備份',
    confirmVariant: 'danger' as const
  },

  startAnalysis: {
    type: 'info' as DialogType,
    title: '開始 SEO 分析',
    message: '即將開始分析您的關鍵字。分析過程可能需要幾分鐘時間，請確保網路連接穩定。',
    confirmText: '開始分析',
    cancelText: '稍後再分析',
    confirmVariant: 'success' as const
  }
};

// 對話框管理 Hook
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    config: Partial<ConfirmDialogProps>;
    resolve: (confirmed: boolean) => void;
  } | null>(null);

  const openDialog = useCallback((config: Partial<ConfirmDialogProps>): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        config,
        resolve
      });
    });
  }, []);

  const closeDialog = useCallback((confirmed: boolean) => {
    if (dialog) {
      dialog.resolve(confirmed);
      setDialog(null);
    }
  }, [dialog]);

  const confirmDialog = useCallback(() => {
    closeDialog(true);
  }, [closeDialog]);

  const cancelDialog = useCallback(() => {
    closeDialog(false);
  }, [closeDialog]);

  // 便利方法
  const confirm = useCallback(async (
    title: string,
    message: string,
    options?: Partial<ConfirmDialogProps>
  ): Promise<boolean> => {
    return openDialog({
      title,
      message,
      ...options
    });
  }, [openDialog]);

  const alert = useCallback(async (
    title: string,
    message: string,
    type: DialogType = 'info'
  ): Promise<boolean> => {
    return openDialog({
      title,
      message,
      type,
      showCancel: false,
      confirmText: '確定'
    });
  }, [openDialog]);

  const DialogComponent = dialog ? (
    <ConfirmDialog
      isOpen={dialog.isOpen}
      title={dialog.config.title || ''}
      message={dialog.config.message || ''}
      onConfirm={confirmDialog}
      onCancel={cancelDialog}
      {...dialog.config}
    />
  ) : null;

  return {
    openDialog,
    confirm,
    alert,
    DialogComponent
  };
}

// 預設對話框工具函數
export function createErrorDialog(
  error: Error | string,
  options?: Partial<ConfirmDialogProps>
): Partial<ConfirmDialogProps> {
  const message = error instanceof Error ? error.message : error;
  
  return {
    type: 'error',
    title: '發生錯誤',
    message,
    confirmText: '確定',
    showCancel: false,
    confirmVariant: 'danger',
    ...options
  };
}

export function createWarningDialog(
  title: string,
  message: string,
  options?: Partial<ConfirmDialogProps>
): Partial<ConfirmDialogProps> {
  return {
    type: 'warning',
    title,
    message,
    confirmText: '繼續',
    cancelText: '取消',
    confirmVariant: 'warning',
    ...options
  };
}