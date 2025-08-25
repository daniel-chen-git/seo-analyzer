import type { ProgressStatus } from '../../types/progress';

export interface ProgressBarProps {
  /** 進度百分比 (0-100) */
  progress: number;
  /** 當前狀態 */
  status: ProgressStatus;
  /** 是否顯示百分比文字 */
  showPercentage?: boolean;
  /** 自定義樣式類名 */
  className?: string;
  /** 是否啟用動畫 */
  animated?: boolean;
  /** 進度條高度 */
  height?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  progress,
  status,
  showPercentage = true,
  className = '',
  animated = true,
  height = 'md'
}: ProgressBarProps) {
  // 確保進度在有效範圍內
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  
  // 高度樣式映射
  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  // 狀態樣式映射
  const getStatusStyles = (status: ProgressStatus) => {
    switch (status) {
      case 'running':
        return {
          container: 'bg-blue-100',
          bar: 'bg-gradient-to-r from-blue-500 to-blue-600',
          text: 'text-blue-700'
        };
      case 'completed':
        return {
          container: 'bg-green-100',
          bar: 'bg-gradient-to-r from-green-500 to-green-600',
          text: 'text-green-700'
        };
      case 'error':
        return {
          container: 'bg-red-100',
          bar: 'bg-gradient-to-r from-red-500 to-red-600',
          text: 'text-red-700'
        };
      case 'cancelled':
        return {
          container: 'bg-gray-100',
          bar: 'bg-gradient-to-r from-gray-400 to-gray-500',
          text: 'text-gray-600'
        };
      case 'idle':
      default:
        return {
          container: 'bg-gray-100',
          bar: 'bg-gradient-to-r from-gray-300 to-gray-400',
          text: 'text-gray-600'
        };
    }
  };
  
  const statusStyles = getStatusStyles(status);
  
  // 動畫樣式
  const animationClass = animated ? 'transition-all duration-300 ease-out' : '';
  
  // 進度條額外動畫效果 (running 狀態下的流動效果)
  const flowingAnimation = status === 'running' && animated
    ? 'relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-pulse'
    : '';

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 進度條容器 */}
      <div 
        className={`
          w-full rounded-full overflow-hidden
          ${statusStyles.container}
          ${heightClasses[height]}
          ${animationClass}
        `}
        role="progressbar"
        aria-valuenow={normalizedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`進度: ${normalizedProgress.toFixed(1)}%`}
      >
        {/* 進度條 */}
        <div
          className={`
            ${heightClasses[height]}
            rounded-full
            ${statusStyles.bar}
            ${animationClass}
            ${flowingAnimation}
          `}
          style={{
            width: `${normalizedProgress}%`,
            transition: animated ? 'width 0.3s ease-out' : 'none'
          }}
        />
      </div>
      
      {/* 百分比文字 */}
      {showPercentage && (
        <div className={`text-sm font-medium text-center ${statusStyles.text}`}>
          {normalizedProgress.toFixed(1)}%
        </div>
      )}
      
      {/* 狀態指示文字 */}
      {status !== 'idle' && (
        <div className={`text-xs text-center ${statusStyles.text} opacity-75`}>
          {getStatusText(status)}
        </div>
      )}
    </div>
  );
}

// 狀態文字映射
function getStatusText(status: ProgressStatus): string {
  switch (status) {
    case 'running':
      return '分析進行中...';
    case 'completed':
      return '分析完成';
    case 'error':
      return '分析發生錯誤';
    case 'cancelled':
      return '分析已取消';
    case 'idle':
    default:
      return '準備開始';
  }
}