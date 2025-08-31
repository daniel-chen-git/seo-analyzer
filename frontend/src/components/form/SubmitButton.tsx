import React, { useCallback } from 'react';

type SubmitButtonStatus = 'idle' | 'loading' | 'success' | 'error';

interface SubmitButtonProps {
  onSubmit: () => void;
  onReset: () => void;
  status: SubmitButtonStatus;
  isFormValid: boolean;
  estimatedTime?: number; // 預估時間（秒）
  progress?: number; // 進度百分比 0-100
  disabled?: boolean;
  className?: string;
}

interface StatusConfig {
  text: string;
  icon: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const statusConfigs: Record<SubmitButtonStatus, StatusConfig> = {
  idle: {
    text: '開始分析',
    icon: '🔍',
    bgColor: 'bg-blue-600 hover:bg-blue-700',
    textColor: 'text-white',
    borderColor: 'border-blue-600'
  },
  loading: {
    text: '分析中...',
    icon: '🔄',
    bgColor: 'bg-blue-500',
    textColor: 'text-white',
    borderColor: 'border-blue-500'
  },
  success: {
    text: '分析完成',
    icon: '✅',
    bgColor: 'bg-green-600',
    textColor: 'text-white',
    borderColor: 'border-green-600'
  },
  error: {
    text: '重新分析',
    icon: '🔁',
    bgColor: 'bg-red-600 hover:bg-red-700',
    textColor: 'text-white',
    borderColor: 'border-red-600'
  }
};

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  onSubmit,
  onReset,
  status,
  isFormValid,
  estimatedTime = 60,
  progress = 0,
  disabled = false,
  className = ''
}) => {
  const config = statusConfigs[status];
  const isLoading = status === 'loading';
  const canSubmit = (status === 'idle' || status === 'error') && isFormValid && !disabled;
  const canReset = status !== 'loading';

  const handleSubmit = useCallback(() => {
    if (canSubmit) {
      onSubmit();
    }
  }, [canSubmit, onSubmit]);

  const handleReset = useCallback(() => {
    if (canReset) {
      onReset();
    }
  }, [canReset, onReset]);

  // 格式化時間顯示
  const formatTime = useCallback((seconds: number) => {
    if (seconds < 60) {
      return `${seconds} 秒`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} 分 ${remainingSeconds} 秒`;
  }, []);

  const containerClasses = [
    'w-full space-y-4',
    className
  ].filter(Boolean).join(' ');

  const submitButtonClasses = [
    'w-full px-6 py-4 rounded-lg font-medium text-base transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
    'flex items-center justify-center gap-2',
    
    canSubmit 
      ? `${config.bgColor} ${config.textColor} ${config.borderColor} border-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5`
      : 'bg-neutral-300 text-neutral-500 border-2 border-neutral-300 cursor-not-allowed',
      
    isLoading && 'cursor-wait'
  ].filter(Boolean).join(' ');

  const resetButtonClasses = [
    'px-4 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700',
    'hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
    !canReset && 'opacity-50 cursor-not-allowed'
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* 主要提交按鈕 */}
      <div className="relative">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={submitButtonClasses}
        >
          {/* 圖示 */}
          <span className={`text-xl ${isLoading ? 'animate-spin' : ''}`}>
            {config.icon}
          </span>
          
          {/* 按鈕文字 */}
          <span>{config.text}</span>
          
          {/* 載入時的進度顯示 */}
          {isLoading && progress > 0 && (
            <span className="ml-2 text-sm opacity-75">
              {progress}%
            </span>
          )}
        </button>

        {/* 進度條 */}
        {isLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-200 rounded-b-lg overflow-hidden">
            <div 
              className="h-full bg-white/30 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* 按鈕組 - 重置與時間顯示 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleReset}
          disabled={!canReset}
          className={resetButtonClasses}
        >
          重置表單
        </button>

        {/* 時間資訊 */}
        <div className="text-sm text-neutral-500">
          {status === 'loading' ? (
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              <span>預估剩餘: {formatTime(Math.max(estimatedTime - Math.floor(progress * estimatedTime / 100), 0))}</span>
            </div>
          ) : status === 'idle' && isFormValid ? (
            <div className="flex items-center gap-1">
              <span>⏰</span>
              <span>預估時間: {formatTime(estimatedTime)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* 狀態說明 */}
      <div className="text-center">
        {status === 'loading' && (
          <p className="text-xs text-blue-600">
            💡 分析將依序進行：SERP → 爬蟲 → AI 生成
          </p>
        )}
        
        {status === 'idle' && !isFormValid && (
          <p className="text-xs text-orange-600">
            ⚠️ 請完成必填欄位後再提交
          </p>
        )}
        
        {status === 'error' && (
          <p className="text-xs text-red-600">
            ❌ 分析過程發生錯誤，請檢查輸入內容後重試
          </p>
        )}
        
        {status === 'success' && (
          <p className="text-xs text-green-600">
            🎉 分析報告已完成，請查看結果
          </p>
        )}
      </div>
    </div>
  );
};