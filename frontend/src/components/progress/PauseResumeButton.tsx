import { useState } from 'react';
import type { ProgressStatus } from '../../types/progress';

export interface PauseResumeButtonProps {
  /** 當前進度狀態 */
  status: ProgressStatus;
  /** 是否可以暫停 */
  canPause: boolean;
  /** 是否可以恢復 */
  canResume: boolean;
  /** 暫停操作回調函數 */
  onPause?: () => Promise<void> | void;
  /** 恢復操作回調函數 */
  onResume?: () => Promise<void> | void;
  /** 是否顯示確認對話框 */
  showConfirmDialog?: boolean;
  /** 自定義樣式類名 */
  className?: string;
  /** 按鈕尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 按鈕樣式變體 */
  variant?: 'outline' | 'solid' | 'ghost';
  /** 是否啟用觸控優化 */
  touchOptimized?: boolean;
  /** 是否啟用動畫效果 */
  animated?: boolean;
  /** 自定義暫停確認訊息 */
  pauseConfirmMessage?: string;
  /** 自定義恢復確認訊息 */
  resumeConfirmMessage?: string;
}

export function PauseResumeButton({
  status,
  canPause,
  canResume,
  onPause,
  onResume,
  showConfirmDialog = false,
  className = '',
  size = 'md',
  variant = 'outline',
  touchOptimized = true,
  animated = true,
  pauseConfirmMessage = '分析將暫停，您可以隨時恢復。已收集的數據會保留。',
  resumeConfirmMessage = '是否要恢復分析？將從暫停的位置繼續。'
}: PauseResumeButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'pause' | 'resume' | null>(null);

  // 按鈕尺寸樣式（觸控優化）
  const sizeClasses = {
    sm: touchOptimized ? 'px-4 py-2 text-sm min-h-[44px]' : 'px-3 py-1.5 text-sm',
    md: touchOptimized ? 'px-5 py-3 text-sm min-h-[48px]' : 'px-4 py-2 text-sm',
    lg: touchOptimized ? 'px-6 py-4 text-base min-h-[52px]' : 'px-6 py-3 text-base'
  };

  // 按鈕變體樣式
  const getVariantClasses = (isActive: boolean, disabled: boolean) => {
    if (disabled) {
      return 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed';
    }

    const baseClasses = animated ? 'transition-all duration-200 hover:scale-105 active:scale-95' : 'transition-colors duration-200';
    
    if (isActive) {
      // 暫停狀態 (黃色系)
      switch (variant) {
        case 'solid':
          return `${baseClasses} bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 hover:border-yellow-700`;
        case 'ghost':
          return `${baseClasses} text-yellow-600 hover:bg-yellow-50 border-transparent hover:border-yellow-200`;
        case 'outline':
        default:
          return `${baseClasses} text-yellow-600 border-yellow-300 hover:bg-yellow-50 hover:border-yellow-400`;
      }
    } else {
      // 運行狀態 (綠色系)
      switch (variant) {
        case 'solid':
          return `${baseClasses} bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700`;
        case 'ghost':
          return `${baseClasses} text-green-600 hover:bg-green-50 border-transparent hover:border-green-200`;
        case 'outline':
        default:
          return `${baseClasses} text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400`;
      }
    }
  };

  // 處理操作
  const handleAction = async (action: 'pause' | 'resume') => {
    if (showConfirmDialog && !showConfirm) {
      setPendingAction(action);
      setShowConfirm(true);
      return;
    }

    try {
      setIsProcessing(true);
      
      if (action === 'pause' && onPause) {
        await onPause();
      } else if (action === 'resume' && onResume) {
        await onResume();
      }
      
      // 觸控回饋 (如果支持)
      if (touchOptimized && 'vibrate' in navigator) {
        navigator.vibrate?.(50); // 輕微振動回饋
      }
      
    } catch (error) {
      console.error(`${action === 'pause' ? '暫停' : '恢復'}操作失敗:`, error);
      
      // 錯誤觸控回饋
      if (touchOptimized && 'vibrate' in navigator) {
        navigator.vibrate?.([100, 50, 100]); // 錯誤振動模式
      }
    } finally {
      setIsProcessing(false);
      setShowConfirm(false);
      setPendingAction(null);
    }
  };

  // 獲取按鈕狀態
  const isPaused = status === 'paused';
  const isRunning = status === 'running';
  
  // 判斷是否禁用按鈕
  const isDisabled = isProcessing || 
                    status === 'completed' || 
                    status === 'error' || 
                    status === 'cancelled' ||
                    status === 'idle' ||
                    (!canPause && !isPaused) ||
                    (!canResume && isPaused);

  // 獲取按鈕文字
  const getButtonText = () => {
    if (isProcessing) {
      return isPaused ? '恢復中...' : '暫停中...';
    }
    if (status === 'completed') return '已完成';
    if (status === 'error') return '已停止';
    if (status === 'cancelled') return '已取消';
    if (status === 'idle') return '未開始';
    
    return isPaused ? '恢復分析' : '暫停分析';
  };

  // 獲取按鈕圖示
  const getButtonIcon = () => {
    if (isProcessing) {
      return (
        <div className={`border-2 border-current border-t-transparent rounded-full animate-spin ${
          size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
        }`} />
      );
    }

    const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    
    if (isPaused) {
      // 恢復圖示 (播放)
      return (
        <svg 
          className={`${iconSize} ${animated ? 'transition-transform duration-200' : ''}`}
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      );
    } else {
      // 暫停圖示
      return (
        <svg 
          className={`${iconSize} ${animated ? 'transition-transform duration-200' : ''}`}
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
      );
    }
  };

  // 獲取當前操作
  const currentAction = isPaused ? 'resume' : 'pause';

  return (
    <>
      {/* 暫停/恢復按鈕 */}
      <button
        onClick={() => handleAction(currentAction)}
        disabled={isDisabled}
        className={`
          inline-flex items-center space-x-2 font-medium rounded-lg border 
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${isPaused ? 'focus:ring-green-500' : 'focus:ring-yellow-500'}
          ${sizeClasses[size]}
          ${getVariantClasses(isPaused, isDisabled)}
          ${touchOptimized ? 'touch-manipulation select-none' : ''}
          ${className}
        `}
        aria-label={getButtonText()}
        style={touchOptimized ? { 
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation'
        } : undefined}
      >
        <span className={animated && !isProcessing ? 'transition-transform duration-200 group-hover:scale-110' : ''}>
          {getButtonIcon()}
        </span>
        <span>{getButtonText()}</span>
        
        {/* 狀態指示燈 */}
        <div className={`
          w-2 h-2 rounded-full transition-all duration-300
          ${isPaused ? 'bg-yellow-400' : 
            isRunning ? 'bg-green-400 animate-pulse' : 
            'bg-neutral-300'}
        `} />
      </button>

      {/* 確認對話框 */}
      {showConfirm && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${animated ? 'animate-fade-in-scale' : ''}`}>
          <div className={`bg-white rounded-lg shadow-xl max-w-md mx-4 p-6 ${animated ? 'animate-slide-in-up' : ''}`}>
            {/* 標題 */}
            <div className="flex items-center mb-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                pendingAction === 'pause' ? 'bg-yellow-100' : 'bg-green-100'
              }`}>
                {pendingAction === 'pause' ? (
                  <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
              <h3 className="ml-4 text-lg font-semibold text-gray-900">
                {pendingAction === 'pause' ? '確認暫停' : '確認恢復'}
              </h3>
            </div>

            {/* 訊息內容 */}
            <p className="text-gray-700 mb-6">
              {pendingAction === 'pause' ? pauseConfirmMessage : resumeConfirmMessage}
            </p>

            {/* 按鈕群組 */}
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setPendingAction(null);
                }}
                className={`px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-300 rounded-lg hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 ${
                  animated ? 'transition-all duration-200 hover:scale-105' : ''
                }`}
                disabled={isProcessing}
              >
                取消
              </button>
              <button
                onClick={() => handleAction(pendingAction!)}
                disabled={isProcessing}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  pendingAction === 'pause' 
                    ? 'bg-yellow-600 border-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                    : 'bg-green-600 border-green-600 hover:bg-green-700 focus:ring-green-500'
                } ${animated ? 'transition-all duration-200 hover:scale-105' : ''}`}
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{pendingAction === 'pause' ? '暫停中...' : '恢復中...'}</span>
                  </div>
                ) : (
                  <>
                    {pendingAction === 'pause' ? '確定暫停' : '確定恢復'}
                  </>
                )}
              </button>
            </div>

            {/* 提示信息 */}
            <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-primary-700">
                  {pendingAction === 'pause' 
                    ? '暫停後可以隨時恢復，不會影響已收集的數據。'
                    : '恢復後將從上次停止的位置繼續分析。'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}