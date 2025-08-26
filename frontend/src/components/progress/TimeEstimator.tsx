import { useMemo } from 'react';
import { useTimeEstimation } from '../../hooks/progress/useTimeEstimation';
import type { ProgressState } from '../../types/progress';

export interface TimeEstimatorProps {
  /** 當前進度狀態 */
  progressState: ProgressState;
  /** 是否顯示詳細資訊 */
  showDetails?: boolean;
  /** 是否顯示效率係數 */
  showEfficiency?: boolean;
  /** 自定義樣式類名 */
  className?: string;
  /** 顯示模式 */
  variant?: 'compact' | 'detailed' | 'minimal';
  /** 是否啟用增強動畫 */
  animated?: boolean;
  /** 是否顯示即時更新 */
  liveUpdate?: boolean;
}

export function TimeEstimator({
  progressState,
  showDetails = false,
  showEfficiency = false,
  className = '',
  variant = 'detailed',
  animated = true,
  liveUpdate = true
}: TimeEstimatorProps) {
  const { calculateTimeEstimation } = useTimeEstimation();
  
  // 計算時間估算結果
  const timeEstimation = useMemo(() => {
    return calculateTimeEstimation(progressState);
  }, [calculateTimeEstimation, progressState]);

  // 獲取效率係數的顯示樣式
  const getEfficiencyStyles = (efficiency: number) => {
    if (efficiency > 1.2) {
      return {
        text: 'text-red-600',
        bg: 'bg-red-100',
        label: '較慢'
      };
    } else if (efficiency > 0.8) {
      return {
        text: 'text-green-600', 
        bg: 'bg-green-100',
        label: '正常'
      };
    } else {
      return {
        text: 'text-blue-600',
        bg: 'bg-blue-100', 
        label: '較快'
      };
    }
  };

  const efficiencyStyles = getEfficiencyStyles(timeEstimation.efficiencyFactor);

  // 渲染緊湊模式
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="text-sm text-gray-600">
          剩餘：
          <span className="font-mono font-semibold text-blue-600 ml-1">
            {timeEstimation.formattedRemainingTime}
          </span>
        </div>
        {showEfficiency && (
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${efficiencyStyles.bg} ${efficiencyStyles.text}`}>
            {efficiencyStyles.label}
          </div>
        )}
      </div>
    );
  }

  // 渲染最小模式
  if (variant === 'minimal') {
    return (
      <div className={`text-center ${className}`}>
        <div className="text-2xl font-mono font-bold text-blue-600">
          {timeEstimation.formattedRemainingTime}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          預估剩餘時間
        </div>
      </div>
    );
  }

  // 渲染詳細模式（預設）
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* 主要時間顯示 */}
      <div className="text-center mb-4">
        <div className={`text-3xl font-mono font-bold mb-1 transition-all duration-500 ${
          progressState.status === 'paused' ? 'text-yellow-600 paused-pulse' :
          progressState.status === 'running' ? 'text-blue-600' :
          progressState.status === 'completed' ? 'text-green-600' :
          progressState.status === 'error' ? 'text-red-600' :
          'text-gray-600'
        } ${animated && liveUpdate && progressState.status === 'running' ? 'counter-roll' : ''} ${progressState.status === 'completed' && animated ? 'celebration-bounce' : ''}`}>
          {timeEstimation.formattedRemainingTime}
        </div>
        <div className="text-sm text-gray-600">
          {progressState.status === 'paused' ? '暫停中' : 
           progressState.status === 'completed' ? '分析完成' :
           '預估剩餘時間'}
        </div>
      </div>

      {/* 進度百分比 */}
      <div className="text-center mb-4">
        <div className={`text-lg font-semibold transition-all duration-300 ${
          progressState.status === 'paused' ? 'text-yellow-700' :
          progressState.status === 'running' ? 'text-gray-800' :
          progressState.status === 'completed' ? 'text-green-700' :
          'text-gray-800'
        } ${animated && liveUpdate && progressState.status === 'running' ? 'count-animation' : ''}`}>
          {timeEstimation.overallProgress.toFixed(1)}%
        </div>
        <div className="text-xs text-gray-500">
          整體完成度
        </div>
      </div>

      {/* 效率指示器 */}
      {showEfficiency && (
        <div className="flex items-center justify-center mb-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${efficiencyStyles.bg} ${efficiencyStyles.text}`}>
            <span className="mr-2">執行效率：{efficiencyStyles.label}</span>
            <span className="font-mono">
              ({(timeEstimation.efficiencyFactor * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
      )}

      {/* 詳細資訊 */}
      {showDetails && (
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">預估總時間：</span>
            <span className="font-mono font-medium">
              {timeEstimation.formattedTotalTime}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">開始時間：</span>
            <span className="font-medium">
              {progressState.timing.startTime.toLocaleTimeString('zh-TW', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>

          {/* 預計完成時間 */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              {progressState.status === 'paused' ? '暫停時間：' : '預計完成：'}
            </span>
            <span className={`font-medium ${
              progressState.status === 'paused' ? 'text-yellow-600' :
              progressState.status === 'completed' ? 'text-green-600' :
              'text-blue-600'
            }`}>
              {progressState.status === 'paused' ? 
                new Date().toLocaleTimeString('zh-TW', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }) :
                new Date(
                  Date.now() + timeEstimation.estimatedRemainingTime * 1000
                ).toLocaleTimeString('zh-TW', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })
              }
            </span>
          </div>

          {/* 暫停狀態提示 */}
          {progressState.status === 'paused' && (
            <div className={`mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 ${animated ? 'paused-pulse animate-fade-in-scale' : ''}`}>
              <div className="flex items-center">
                <div className="w-3 h-3 mr-2">⏸️</div>
                <span>分析已暫停，您可以選擇恢復或取消分析</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 狀態指示 */}
      <div className="mt-4 text-center">
        <div className={`
          inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-300
          ${progressState.status === 'starting' ? 'bg-blue-50 text-blue-700' :
            progressState.status === 'running' ? 'bg-blue-100 text-blue-700' :
            progressState.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
            progressState.status === 'completed' ? 'bg-green-100 text-green-700' :
            progressState.status === 'error' ? 'bg-red-100 text-red-700' :
            progressState.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
            'bg-gray-100 text-gray-700'}
          ${animated ? 'gpu-accelerated' : ''}
        `}>
          {/* 狀態指示點 */}
          {progressState.status === 'starting' && (
            <div className={`w-2 h-2 bg-blue-500 rounded-full mr-2 ${animated ? 'animate-pulse' : ''}`} />
          )}
          {progressState.status === 'running' && (
            <div className={`w-2 h-2 bg-blue-500 rounded-full mr-2 ${animated ? 'enhanced-bounce' : 'animate-pulse'}`} />
          )}
          {progressState.status === 'paused' && (
            <div className={`w-2 h-2 bg-yellow-500 rounded-full mr-2 ${animated ? 'paused-pulse' : 'animate-pulse'}`} />
          )}
          {progressState.status === 'completed' && (
            <div className={`w-2 h-2 bg-green-500 rounded-full mr-2 ${animated ? 'celebration-bounce' : ''}`} />
          )}
          {progressState.status === 'error' && (
            <div className={`w-2 h-2 bg-red-500 rounded-full mr-2 ${animated ? 'shake' : ''}`} />
          )}
          {progressState.status === 'cancelled' && (
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
          )}
          {getStatusText(progressState.status)}
        </div>
      </div>
    </div>
  );
}

// 狀態文字映射
function getStatusText(status: string): string {
  switch (status) {
    case 'starting':
      return '正在啟動分析...';
    case 'running':
      return '分析進行中...';
    case 'paused':
      return '分析已暫停';
    case 'completed':
      return '分析已完成';
    case 'error':
      return '分析發生錯誤';
    case 'cancelled':
      return '分析已取消';
    case 'idle':
    default:
      return '準備開始';
  }
}