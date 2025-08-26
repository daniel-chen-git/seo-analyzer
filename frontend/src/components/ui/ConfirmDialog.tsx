import { useEffect, useRef } from 'react';

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



