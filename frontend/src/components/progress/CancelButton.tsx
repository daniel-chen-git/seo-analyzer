import { useState } from 'react';
import type { ProgressStatus } from '../../types/progress';

export interface CancelButtonProps {
  /** 當前進度狀態 */
  status: ProgressStatus;
  /** 是否可以取消 */
  canCancel: boolean;
  /** 取消操作回調函數 */
  onCancel: () => Promise<void> | void;
  /** 是否顯示確認對話框 */
  showConfirmDialog?: boolean;
  /** 自定義樣式類名 */
  className?: string;
  /** 按鈕尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 按鈕樣式變體 */
  variant?: 'outline' | 'solid' | 'ghost';
  /** 自定義確認訊息 */
  confirmMessage?: string;
}

export function CancelButton({
  status,
  canCancel,
  onCancel,
  showConfirmDialog = true,
  className = '',
  size = 'md',
  variant = 'outline',
  confirmMessage = '確定要取消當前分析嗎？取消後將無法恢復進度。'
}: CancelButtonProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 按鈕尺寸樣式
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  // 按鈕變體樣式
  const getVariantClasses = (variant: string, disabled: boolean) => {
    if (disabled) {
      return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';
    }

    switch (variant) {
      case 'solid':
        return 'bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700';
      case 'ghost':
        return 'text-red-600 hover:bg-red-50 border-transparent hover:border-red-200';
      case 'outline':
      default:
        return 'text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400';
    }
  };

  // 處理取消操作
  const handleCancel = async () => {
    if (showConfirmDialog && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setIsCancelling(true);
      await onCancel();
    } catch (error) {
      console.error('取消操作失敗:', error);
    } finally {
      setIsCancelling(false);
      setShowConfirm(false);
    }
  };

  // 判斷是否禁用按鈕
  const isDisabled = !canCancel || 
                    status === 'completed' || 
                    status === 'error' || 
                    status === 'cancelled' ||
                    isCancelling;

  // 獲取按鈕文字
  const getButtonText = () => {
    if (isCancelling) return '取消中...';
    if (status === 'cancelled') return '已取消';
    if (status === 'completed') return '已完成';
    if (status === 'error') return '已停止';
    return '取消分析';
  };

  // 獲取按鈕圖示
  const getButtonIcon = () => {
    if (isCancelling) {
      return (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      );
    }
    return (
      <svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M6 18L18 6M6 6l12 12" 
        />
      </svg>
    );
  };

  return (
    <>
      {/* 取消按鈕 */}
      <button
        onClick={handleCancel}
        disabled={isDisabled}
        className={`
          inline-flex items-center space-x-2 font-medium rounded-lg border 
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
          ${sizeClasses[size]}
          ${getVariantClasses(variant, isDisabled)}
          ${className}
        `}
        aria-label={getButtonText()}
      >
        {getButtonIcon()}
        <span>{getButtonText()}</span>
      </button>

      {/* 確認對話框 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6">
            {/* 標題 */}
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg 
                  className="w-6 h-6 text-red-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <h3 className="ml-4 text-lg font-semibold text-gray-900">
                確認取消
              </h3>
            </div>

            {/* 訊息內容 */}
            <p className="text-gray-700 mb-6">
              {confirmMessage}
            </p>

            {/* 按鈕群組 */}
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={isCancelling}
              >
                繼續分析
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>取消中...</span>
                  </div>
                ) : (
                  '確定取消'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}