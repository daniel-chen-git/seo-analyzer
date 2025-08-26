import { useMemo, useState, useCallback, useRef } from 'react';
import { CancelButton } from './CancelButton';
import { PauseResumeButton } from './PauseResumeButton';
import { useConfirmDialog, DIALOG_PRESETS } from '../ui/ConfirmDialog';
import type { ProgressState } from '../../types/progress';

// 控制按鈕狀態管理
export interface ControlState {
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  isLoading: boolean;
}

// 控制操作回饋
export interface ControlFeedback {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
  action?: string;
}

export interface ControlPanelProps {
  /** 當前進度狀態 */
  progressState: ProgressState;
  /** 開始分析回調 */
  onStart?: () => Promise<void> | void;
  /** 暫停分析回調 */
  onPause?: () => Promise<void> | void;
  /** 恢復分析回調 */
  onResume?: () => Promise<void> | void;
  /** 取消分析回調 */
  onCancel: () => Promise<void> | void;
  /** 重試分析回調 */
  onRetry?: () => Promise<void> | void;
  /** 操作回饋回調 */
  onFeedback?: (feedback: ControlFeedback) => void;
  /** 顯示配置 */
  displayOptions?: {
    /** 是否顯示開始按鈕 */
    showStartButton?: boolean;
    /** 是否顯示暫停/恢復按鈕 */
    showPauseResumeButton?: boolean;
    /** 是否顯示取消按鈕 */
    showCancelButton?: boolean;
    /** 是否顯示重試按鈕 */
    showRetryButton?: boolean;
    /** 是否啟用確認對話框 */
    enableConfirmDialogs?: boolean;
    /** 按鈕排列方向 */
    orientation?: 'horizontal' | 'vertical';
    /** 按鈕間距 */
    spacing?: 'tight' | 'normal' | 'loose';
  };
  /** 按鈕尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 按鈕樣式變體 */
  variant?: 'outline' | 'solid' | 'ghost';
  /** 佈局模式 */
  layout?: 'compact' | 'default' | 'expanded';
  /** 是否啟用觸控優化 */
  touchOptimized?: boolean;
  /** 觸控回饋類型 */
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'none';
  /** 是否啟用動畫效果 */
  animated?: boolean;
  /** 自定義樣式類名 */
  className?: string;
}

const defaultDisplayOptions = {
  showStartButton: true,
  showPauseResumeButton: true,
  showCancelButton: true,
  showRetryButton: true,
  enableConfirmDialogs: true,
  orientation: 'horizontal' as const,
  spacing: 'normal' as const
};

export function ControlPanel({
  progressState,
  onStart,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onFeedback,
  displayOptions = {},
  size = 'md',
  variant = 'outline',
  layout = 'default',
  touchOptimized = true,
  hapticFeedback = 'light',
  animated = true,
  className = ''
}: ControlPanelProps) {
  const { openDialog, DialogComponent } = useConfirmDialog();
  
  // 合併顯示配置
  const options = useMemo(() => ({
    ...defaultDisplayOptions,
    ...displayOptions
  }), [displayOptions]);

  // 觸控回饋函數
  const triggerHapticFeedback = useCallback((type: 'success' | 'warning' | 'error' | 'impact' = 'impact') => {
    if (!touchOptimized || hapticFeedback === 'none' || typeof navigator === 'undefined' || !navigator.vibrate) {
      return;
    }

    const patterns = {
      success: [50, 30, 50],           // 成功 - 短促雙響
      warning: [100, 50, 100, 50, 100], // 警告 - 三短響
      error: [200, 100, 200],          // 錯誤 - 長短長響 
      impact: hapticFeedback === 'light' ? [25] :
              hapticFeedback === 'medium' ? [50] :
              hapticFeedback === 'heavy' ? [75] : [25]
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch (error) {
      // 靜默處理振動 API 錯誤
      console.debug('Haptic feedback not supported:', error);
    }
  }, [touchOptimized, hapticFeedback]);

  // 長按手勢處理 Hook
  const useLongPress = useCallback((
    callback: () => void, 
    options: { 
      duration?: number; 
      enabled?: boolean;
      onLongPressStart?: () => void;
      onLongPressEnd?: () => void;
    } = {}
  ) => {
    const { duration = 800, enabled = true, onLongPressStart, onLongPressEnd } = options;
    const [isLongPressing, setIsLongPressing] = useState(false);
    const timeout = useRef<NodeJS.Timeout>();
    const startTime = useRef<number>(0);

    const startLongPress = useCallback((event: React.TouchEvent | React.MouseEvent) => {
      if (!enabled || !touchOptimized) return;
      
      event.preventDefault();
      setIsLongPressing(true);
      startTime.current = Date.now();
      onLongPressStart?.();
      
      // 初始觸控回饋
      triggerHapticFeedback('impact');
      
      timeout.current = setTimeout(() => {
        // 長按完成回饋
        triggerHapticFeedback('warning');
        callback();
        setIsLongPressing(false);
        onLongPressEnd?.();
      }, duration);
    }, [callback, duration, enabled, onLongPressStart, onLongPressEnd]);

    const stopLongPress = useCallback((event?: React.TouchEvent | React.MouseEvent) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      
      const pressDuration = Date.now() - startTime.current;
      if (isLongPressing && pressDuration < duration) {
        // 短按回饋
        triggerHapticFeedback('impact');
      }
      
      setIsLongPressing(false);
      onLongPressEnd?.();
    }, [isLongPressing, duration, onLongPressEnd]);

    return {
      isLongPressing,
      longPressHandlers: {
        onTouchStart: startLongPress,
        onTouchEnd: stopLongPress,
        onTouchCancel: stopLongPress,
        onMouseDown: startLongPress,
        onMouseUp: stopLongPress,
        onMouseLeave: stopLongPress,
        onContextMenu: (e: React.MouseEvent) => e.preventDefault() // 防止右鍵菜單
      }
    };
  }, [touchOptimized, triggerHapticFeedback]);

  // 計算控制狀態
  const controlState = useMemo((): ControlState => {
    return {
      canStart: progressState.status === 'idle',
      canPause: progressState.status === 'running' && progressState.canCancel,
      canResume: progressState.status === 'paused' && progressState.canCancel,
      canCancel: progressState.canCancel && 
                 ['running', 'paused', 'starting'].includes(progressState.status),
      isLoading: ['starting', 'running'].includes(progressState.status)
    };
  }, [progressState.status, progressState.canCancel]);

  // 處理開始操作
  const handleStart = async () => {
    if (!onStart || !controlState.canStart) return;

    if (options.enableConfirmDialogs) {
      const confirmed = await openDialog({
        ...DIALOG_PRESETS.startAnalysis,
        onConfirm: async () => {
          try {
            triggerHapticFeedback('impact');
            await onStart();
            triggerHapticFeedback('success');
            onFeedback?.({
              type: 'success',
              message: '分析已開始',
              duration: 3000
            });
          } catch (error) {
            triggerHapticFeedback('error');
            onFeedback?.({
              type: 'error',
              message: `開始失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
              duration: 5000
            });
          }
        }
      });
      return confirmed;
    }

    try {
      triggerHapticFeedback('impact');
      await onStart();
      triggerHapticFeedback('success');
      onFeedback?.({
        type: 'success',
        message: '分析已開始',
        duration: 3000
      });
    } catch (error) {
      triggerHapticFeedback('error');
      onFeedback?.({
        type: 'error',
        message: `開始失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        duration: 5000
      });
    }
  };

  // 處理暫停操作
  const handlePause = async () => {
    if (!onPause || !controlState.canPause) return;

    if (options.enableConfirmDialogs) {
      const confirmed = await openDialog({
        ...DIALOG_PRESETS.pauseAnalysis,
        onConfirm: async () => {
          try {
            triggerHapticFeedback('warning');
            await onPause();
            triggerHapticFeedback('success');
            onFeedback?.({
              type: 'info',
              message: '分析已暫停',
              duration: 3000
            });
          } catch (error) {
            triggerHapticFeedback('error');
            onFeedback?.({
              type: 'error',
              message: `暫停失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
              duration: 5000
            });
          }
        }
      });
      return confirmed;
    }

    try {
      triggerHapticFeedback('warning');
      await onPause();
      triggerHapticFeedback('success');
      onFeedback?.({
        type: 'info',
        message: '分析已暫停',
        duration: 3000
      });
    } catch (error) {
      triggerHapticFeedback('error');
      onFeedback?.({
        type: 'error',
        message: `暫停失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        duration: 5000
      });
    }
  };

  // 處理恢復操作
  const handleResume = async () => {
    if (!onResume || !controlState.canResume) return;

    if (options.enableConfirmDialogs) {
      const confirmed = await openDialog({
        ...DIALOG_PRESETS.resumeAnalysis,
        onConfirm: async () => {
          try {
            triggerHapticFeedback('impact');
            await onResume();
            triggerHapticFeedback('success');
            onFeedback?.({
              type: 'success',
              message: '分析已恢復',
              duration: 3000
            });
          } catch (error) {
            onFeedback?.({
              type: 'error',
              message: `恢復失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
              duration: 5000
            });
          }
        }
      });
      return confirmed;
    }

    try {
      triggerHapticFeedback('impact');
      await onResume();
      triggerHapticFeedback('success');
      onFeedback?.({
        type: 'success',
        message: '分析已恢復',
        duration: 3000
      });
    } catch (error) {
      triggerHapticFeedback('error');
      onFeedback?.({
        type: 'error',
        message: `恢復失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        duration: 5000
      });
    }
  };

  // 處理取消操作
  const handleCancel = async () => {
    if (!controlState.canCancel) return;

    if (options.enableConfirmDialogs) {
      const confirmed = await openDialog({
        ...DIALOG_PRESETS.cancelAnalysis,
        onConfirm: async () => {
          try {
            await onCancel();
            onFeedback?.({
              type: 'info',
              message: '分析已取消',
              duration: 3000
            });
          } catch (error) {
            onFeedback?.({
              type: 'error',
              message: `取消失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
              duration: 5000
            });
          }
        }
      });
      return confirmed;
    }

    try {
      await onCancel();
      onFeedback?.({
        type: 'info',
        message: '分析已取消',
        duration: 3000
      });
    } catch (error) {
      onFeedback?.({
        type: 'error',
        message: `取消失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        duration: 5000
      });
    }
  };

  // 處理重試操作
  const handleRetry = async () => {
    if (!onRetry) return;

    if (options.enableConfirmDialogs) {
      const confirmed = await openDialog({
        ...DIALOG_PRESETS.retryAnalysis,
        onConfirm: async () => {
          try {
            triggerHapticFeedback('impact');
            await onRetry();
            triggerHapticFeedback('success');
            onFeedback?.({
              type: 'success',
              message: '重新開始分析',
              duration: 3000
            });
          } catch (error) {
            onFeedback?.({
              type: 'error',
              message: `重試失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
              duration: 5000
            });
          }
        }
      });
      return confirmed;
    }

    try {
      triggerHapticFeedback('impact');
      await onRetry();
      triggerHapticFeedback('success');
      onFeedback?.({
        type: 'success',
        message: '重新開始分析',
        duration: 3000
      });
    } catch (error) {
      triggerHapticFeedback('error');
      onFeedback?.({
        type: 'error',
        message: `重試失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        duration: 5000
      });
    }
  };

  // 獲取間距樣式
  const getSpacingClasses = () => {
    const isVertical = options.orientation === 'vertical';
    const spacingMap = {
      tight: isVertical ? 'space-y-2' : 'space-x-2',
      normal: isVertical ? 'space-y-3' : 'space-x-3', 
      loose: isVertical ? 'space-y-4' : 'space-x-4'
    };
    return spacingMap[options.spacing];
  };

  // 獲取佈局樣式
  const getLayoutClasses = () => {
    const isVertical = options.orientation === 'vertical';
    const baseClasses = `flex ${isVertical ? 'flex-col' : 'flex-row'} ${getSpacingClasses()}`;
    
    switch (layout) {
      case 'compact':
        return `${baseClasses} ${isVertical ? 'items-stretch' : 'items-center justify-center'}`;
      case 'expanded':
        return `${baseClasses} ${isVertical ? 'items-stretch' : 'items-center justify-between'}`;
      default:
        return `${baseClasses} ${isVertical ? 'items-center' : 'items-center justify-center'}`;
    }
  };

  // 獲取按鈕狀態指示器
  const getStatusIndicator = (isProcessing: boolean) => {
    if (!animated || !isProcessing) return null;

    return (
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse">
        <div className="w-2 h-2 bg-white rounded-full absolute top-0.5 left-0.5 animate-ping opacity-75"></div>
      </div>
    );
  };

  // 渲染開始按鈕
  const renderStartButton = () => {
    if (!options.showStartButton || !onStart) return null;

    const isStarting = progressState.status === 'starting';
    
    // 長按快速開始功能（跳過確認對話框）
    const handleQuickStart = useCallback(async () => {
      if (!onStart || !controlState.canStart) return;
      
      onFeedback?.({
        type: 'info',
        message: '快速啟動分析...',
        duration: 2000
      });

      try {
        triggerHapticFeedback('impact');
        await onStart();
        triggerHapticFeedback('success');
        onFeedback?.({
          type: 'success',
          message: '分析已快速開始',
          duration: 3000
        });
      } catch (error) {
        triggerHapticFeedback('error');
        onFeedback?.({
          type: 'error',
          message: `快速啟動失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          duration: 5000
        });
      }
    }, [onStart, controlState.canStart, onFeedback, triggerHapticFeedback]);

    const longPressProps = useLongPress(handleQuickStart, {
      duration: 800,
      enabled: controlState.canStart && touchOptimized,
      onLongPressStart: () => {
        onFeedback?.({
          type: 'info',
          message: '繼續長按快速啟動...',
          duration: 1000
        });
      }
    });

    return (
      <div className="relative">
        <button
          onClick={handleStart}
          disabled={!controlState.canStart}
          {...(controlState.canStart ? longPressProps.longPressHandlers : {})}
          className={`
            relative inline-flex items-center space-x-2 font-medium rounded-lg border 
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
            ${size === 'sm' ? 'px-3 py-1.5 text-sm' : 
              size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'}
            ${touchOptimized ? 'min-h-[44px] touch-manipulation select-none' : ''}
            ${controlState.canStart 
              ? 'bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-lg hover:shadow-xl'
              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}
            ${animated ? 'hover:scale-105 active:scale-95 transform' : ''}
            ${isStarting ? 'animate-pulse' : ''}
            ${longPressProps.isLongPressing ? 'scale-110 ring-2 ring-green-400 ring-opacity-75' : ''}
          `}
          aria-label={touchOptimized ? "開始分析 (長按快速啟動)" : "開始分析"}
          style={{ userSelect: 'none' }}
        >
          {isStarting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          <span>{isStarting ? '開始中...' : '開始分析'}</span>
          
          {/* 長按進度指示器 */}
          {longPressProps.isLongPressing && (
            <div className="absolute inset-0 rounded-lg bg-green-400 opacity-20 animate-pulse"></div>
          )}
        </button>
        {getStatusIndicator(isStarting)}
        
        {/* 長按提示 */}
        {touchOptimized && controlState.canStart && (
          <div className="absolute -bottom-6 left-0 right-0 text-xs text-gray-500 text-center opacity-75">
            長按快速啟動
          </div>
        )}
      </div>
    );
  };

  // 渲染取消按鈕（支援長按強制取消）
  const renderCancelButton = () => {
    // 長按強制取消功能（跳過確認對話框）
    const handleForcedCancel = useCallback(async () => {
      if (!controlState.canCancel) return;
      
      onFeedback?.({
        type: 'warning',
        message: '強制取消分析...',
        duration: 2000
      });

      try {
        triggerHapticFeedback('warning');
        await onCancel();
        triggerHapticFeedback('success');
        onFeedback?.({
          type: 'info',
          message: '分析已強制取消',
          duration: 3000
        });
      } catch (error) {
        triggerHapticFeedback('error');
        onFeedback?.({
          type: 'error',
          message: `強制取消失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          duration: 5000
        });
      }
    }, [controlState.canCancel, onCancel, onFeedback, triggerHapticFeedback]);

    const cancelLongPressProps = useLongPress(handleForcedCancel, {
      duration: 1000, // 取消操作長按時間稍長
      enabled: controlState.canCancel && touchOptimized,
      onLongPressStart: () => {
        onFeedback?.({
          type: 'warning',
          message: '繼續長按強制取消...',
          duration: 1200
        });
      }
    });

    return (
      <div className="relative">
        <button
          onClick={handleCancel}
          disabled={!controlState.canCancel}
          {...(controlState.canCancel ? cancelLongPressProps.longPressHandlers : {})}
          className={`
            relative inline-flex items-center space-x-2 font-medium rounded-lg border 
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
            ${size === 'sm' ? 'px-3 py-1.5 text-sm' : 
              size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'}
            ${touchOptimized ? 'min-h-[44px] touch-manipulation select-none' : ''}
            ${controlState.canCancel
              ? 'text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 shadow-md hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}
            ${animated ? 'hover:scale-105 active:scale-95 transform' : ''}
            ${cancelLongPressProps.isLongPressing ? 'scale-110 ring-2 ring-red-400 ring-opacity-75 bg-red-100' : ''}
          `}
          aria-label={touchOptimized ? "取消分析 (長按強制取消)" : "取消分析"}
          style={{ userSelect: 'none' }}
        >
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
          <span>取消分析</span>
          
          {/* 長按進度指示器 */}
          {cancelLongPressProps.isLongPressing && (
            <div className="absolute inset-0 rounded-lg bg-red-400 opacity-20 animate-pulse"></div>
          )}
        </button>
        
        {/* 長按提示 */}
        {touchOptimized && controlState.canCancel && (
          <div className="absolute -bottom-6 left-0 right-0 text-xs text-gray-500 text-center opacity-75">
            長按強制取消
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`${getLayoutClasses()} ${className}`}
      role="group"
      aria-label="分析控制面板"
    >
      {/* 開始按鈕 */}
      {renderStartButton()}

      {/* 暫停/恢復按鈕 */}
      {options.showPauseResumeButton && (onPause || onResume) && (
        <PauseResumeButton
          status={progressState.status}
          canPause={controlState.canPause}
          canResume={controlState.canResume}
          onPause={handlePause}
          onResume={handleResume}
          showConfirmDialog={false} // 我們使用統一的對話框系統
          size={size}
          variant={variant}
          touchOptimized={touchOptimized}
          animated={animated}
        />
      )}

      {/* 重試按鈕 */}
      {options.showRetryButton && onRetry && progressState.status === 'error' && (
        <div className="relative">
          <button
            onClick={handleRetry}
            className={`
              relative inline-flex items-center space-x-2 font-medium rounded-lg border 
              transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${size === 'sm' ? 'px-3 py-1.5 text-sm' : 
                size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'}
              ${touchOptimized ? 'min-h-[44px] touch-manipulation' : ''}
              text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400 shadow-md hover:shadow-lg
              ${animated ? 'hover:scale-105 active:scale-95 transform' : ''}
            `}
            aria-label="重試分析"
          >
            <svg 
              className={`w-4 h-4 ${animated ? 'transition-transform duration-300 hover:rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>重試</span>
          </button>
          {/* 錯誤指示器 */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-bounce">
            <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
          </div>
        </div>
      )}

      {/* 取消按鈕 */}
      {options.showCancelButton && (
        renderCancelButton()
      )}

      {/* 狀態指示器 (compact 模式下) */}
      {layout === 'compact' && (
        <div className={`
          flex items-center space-x-2 px-2 py-1 rounded-full transition-all duration-300
          ${progressState.status === 'running' ? 'bg-green-50 border border-green-200' :
            progressState.status === 'paused' ? 'bg-yellow-50 border border-yellow-200' :
            progressState.status === 'completed' ? 'bg-blue-50 border border-blue-200' :
            progressState.status === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-gray-50 border border-gray-200'}
          ${animated ? 'hover:scale-105' : ''}
        `}>
          <div className={`
            w-2 h-2 rounded-full transition-all duration-300 relative
            ${progressState.status === 'running' ? 'bg-green-400' :
              progressState.status === 'paused' ? 'bg-yellow-400' :
              progressState.status === 'completed' ? 'bg-blue-400' :
              progressState.status === 'error' ? 'bg-red-400' :
              'bg-gray-300'}
          `}>
            {/* 動畫環 */}
            {(['running', 'starting'].includes(progressState.status)) && (
              <div className="absolute inset-0 w-2 h-2 rounded-full border border-green-400 animate-ping opacity-75"></div>
            )}
            {progressState.status === 'paused' && (
              <div className="absolute inset-0 w-2 h-2 rounded-full border border-yellow-400 animate-pulse opacity-75"></div>
            )}
          </div>
          <span className={`
            text-xs font-medium transition-colors duration-200
            ${progressState.status === 'running' ? 'text-green-700' :
              progressState.status === 'paused' ? 'text-yellow-700' :
              progressState.status === 'completed' ? 'text-blue-700' :
              progressState.status === 'error' ? 'text-red-700' :
              'text-gray-600'}
          `}>
            {progressState.status === 'running' ? '進行中' :
             progressState.status === 'starting' ? '啟動中' :
             progressState.status === 'paused' ? '已暫停' :
             progressState.status === 'completed' ? '已完成' :
             progressState.status === 'error' ? '發生錯誤' :
             progressState.status === 'cancelled' ? '已取消' :
             '待機中'}
          </span>
          {/* 進度百分比 */}
          {progressState.overallProgress > 0 && progressState.status !== 'completed' && (
            <span className="text-xs text-gray-500 ml-1">
              {Math.round(progressState.overallProgress)}%
            </span>
          )}
        </div>
      )}

      {/* 確認對話框 */}
      {DialogComponent}
    </div>
  );
}

// 控制面板工具函數
export function getControlState(progressState: ProgressState): ControlState {
  return {
    canStart: progressState.status === 'idle',
    canPause: progressState.status === 'running' && progressState.canCancel,
    canResume: progressState.status === 'paused' && progressState.canCancel,
    canCancel: progressState.canCancel && 
               ['running', 'paused', 'starting'].includes(progressState.status),
    isLoading: ['starting', 'running'].includes(progressState.status)
  };
}

// 預設控制面板配置
export const CONTROL_PANEL_PRESETS = {
  minimal: {
    displayOptions: {
      showStartButton: false,
      showRetryButton: false,
      orientation: 'horizontal' as const,
      spacing: 'tight' as const
    },
    layout: 'compact' as const,
    size: 'sm' as const
  },
  
  standard: {
    displayOptions: {
      showStartButton: true,
      showPauseResumeButton: true,
      showCancelButton: true,
      showRetryButton: true,
      orientation: 'horizontal' as const,
      spacing: 'normal' as const
    },
    layout: 'default' as const,
    size: 'md' as const
  },
  
  expanded: {
    displayOptions: {
      showStartButton: true,
      showPauseResumeButton: true,
      showCancelButton: true,
      showRetryButton: true,
      orientation: 'vertical' as const,
      spacing: 'loose' as const
    },
    layout: 'expanded' as const,
    size: 'lg' as const
  }
} as const;