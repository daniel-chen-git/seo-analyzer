import type { ProgressState, StageType } from '../../types/progress';
import { STAGE_CONFIGS } from '../../types/progress/stageTypes';
import type { StageInfo } from '../../types/progress/stageTypes';

export interface StageIndicatorProps {
  /** 當前進度狀態 */
  progressState: ProgressState;
  /** 是否顯示子任務詳情 */
  showSubtasks?: boolean;
  /** 自定義樣式類名 */
  className?: string;
  /** 顯示模式 */
  mode?: 'horizontal' | 'vertical';
}

export function StageIndicator({
  progressState,
  showSubtasks = false,
  className = '',
  mode = 'horizontal'
}: StageIndicatorProps) {
  const stages: StageType[] = ['serp', 'crawler', 'ai'];
  const stageNumbers = { serp: 1, crawler: 2, ai: 3 } as const;

  // 獲取階段樣式
  const getStageStyles = (stageInfo: StageInfo, isActive: boolean) => {
    const baseStyles = 'transition-all duration-300';
    
    if (stageInfo.status === 'completed') {
      return {
        container: `${baseStyles} bg-green-50 border-green-200`,
        icon: 'text-green-600 bg-green-100',
        title: 'text-green-800',
        description: 'text-green-600',
        progress: 'bg-green-500'
      };
    }
    
    if (stageInfo.status === 'running' && isActive) {
      return {
        container: `${baseStyles} bg-blue-50 border-blue-200 shadow-md`,
        icon: 'text-blue-600 bg-blue-100 animate-pulse',
        title: 'text-blue-800',
        description: 'text-blue-600',
        progress: 'bg-blue-500'
      };
    }
    
    if (stageInfo.status === 'error') {
      return {
        container: `${baseStyles} bg-red-50 border-red-200`,
        icon: 'text-red-600 bg-red-100',
        title: 'text-red-800',
        description: 'text-red-600',
        progress: 'bg-red-500'
      };
    }
    
    // pending or idle
    return {
      container: `${baseStyles} bg-gray-50 border-gray-200`,
      icon: 'text-gray-500 bg-gray-100',
      title: 'text-gray-700',
      description: 'text-gray-500',
      progress: 'bg-gray-300'
    };
  };

  // 渲染單個階段
  const renderStage = (stageKey: StageType, index: number) => {
    const stageConfig = STAGE_CONFIGS[stageKey];
    const stageInfo = progressState.stages[stageKey];
    const stageNumber = stageNumbers[stageKey];
    const isActive = progressState.currentStage === stageNumber;
    const styles = getStageStyles(stageInfo, isActive);

    return (
      <div
        key={stageKey}
        className={`
          relative rounded-lg border-2 p-4
          ${styles.container}
          ${mode === 'horizontal' ? 'flex-1' : 'w-full mb-4'}
        `}
      >
        {/* 階段圖示與編號 */}
        <div className="flex items-center mb-3">
          <div className={`
            flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold
            ${styles.icon}
          `}>
            {stageInfo.status === 'completed' ? '✓' : 
             stageInfo.status === 'running' ? stageConfig.icon :
             stageNumber}
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className={`font-semibold text-sm ${styles.title}`}>
              {stageConfig.name}
            </h3>
            <p className={`text-xs ${styles.description}`}>
              {stageConfig.description}
            </p>
          </div>
        </div>

        {/* 階段進度條 */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-medium ${styles.title}`}>
              進度
            </span>
            <span className={`text-xs ${styles.description}`}>
              {stageInfo.progress.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${styles.progress}`}
              style={{ width: `${stageInfo.progress}%` }}
            />
          </div>
        </div>

        {/* 子任務詳情 */}
        {showSubtasks && stageInfo.subtasks.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className={`text-xs font-medium ${styles.title} mb-2`}>
              子任務：
            </div>
            {stageInfo.subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center text-xs">
                <div className={`
                  w-2 h-2 rounded-full mr-2 flex-shrink-0
                  ${subtask.status === 'completed' ? 'bg-green-500' :
                    subtask.status === 'running' ? 'bg-blue-500 animate-pulse' :
                    subtask.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}
                `} />
                <span className={`flex-1 ${styles.description}`}>
                  {subtask.name}
                </span>
                {subtask.progress !== undefined && (
                  <span className={`ml-2 ${styles.description}`}>
                    {subtask.progress}%
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 連接線 (水平模式) */}
        {mode === 'horizontal' && index < stages.length - 1 && (
          <div className="absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-300 transform -translate-y-1/2 z-10" />
        )}

        {/* 錯誤訊息 */}
        {stageInfo.status === 'error' && stageInfo.errorMessage && (
          <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
            錯誤：{stageInfo.errorMessage}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`
      ${mode === 'horizontal' 
        ? 'flex items-start space-x-8 relative' 
        : 'flex flex-col space-y-4'}
      ${className}
    `}>
      {stages.map((stage, index) => renderStage(stage, index))}
    </div>
  );
}