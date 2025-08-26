import type { ProgressState, StageType } from '../../types/progress';
import { STAGE_CONFIGS, getStageDescription } from '../../types/progress/stageTypes';
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
  /** 是否顯示詳細階段描述 */
  showDetailedDescription?: boolean;
  /** 是否啟用增強動畫 */
  enableEnhancedAnimations?: boolean;
}

export function StageIndicator({
  progressState,
  showSubtasks = false,
  className = '',
  mode = 'horizontal',
  showDetailedDescription = false,
  enableEnhancedAnimations = true
}: StageIndicatorProps) {
  const stages: StageType[] = ['serp', 'crawler', 'ai'];
  const stageNumbers = { serp: 1, crawler: 2, ai: 3 } as const;

  // 獲取階段樣式
  const getStageStyles = (stageInfo: StageInfo, isActive: boolean) => {
    const baseAnimationClass = enableEnhancedAnimations 
      ? 'transition-all duration-500 ease-spring gpu-accelerated' 
      : 'transition-all duration-300 ease-smooth';
    
    // 檢查全域暫停狀態
    const isPaused = progressState.status === 'paused';
    
    if (stageInfo.status === 'completed') {
      const enhancedClass = enableEnhancedAnimations 
        ? 'hover:shadow-lg transform hover:scale-[1.02] success-pop' 
        : '';
      return {
        container: `${baseAnimationClass} bg-green-50 border-green-200 ${enhancedClass}`,
        icon: `text-green-600 bg-green-100 ${enableEnhancedAnimations ? 'celebration-bounce' : ''}`,
        title: 'text-green-800',
        description: 'text-green-600',
        progress: 'bg-green-500 progress-fill-animated',
        pulse: ''
      };
    }
    
    if (stageInfo.status === 'running' && isActive) {
      if (isPaused) {
        // 暫停狀態樣式
        const pausedClass = enableEnhancedAnimations 
          ? 'paused-pulse paused-overlay border-yellow-300'
          : 'animate-pulse border-yellow-300';
        return {
          container: `${baseAnimationClass} bg-yellow-50 ${pausedClass}`,
          icon: `text-yellow-600 bg-yellow-100 ${enableEnhancedAnimations ? 'paused-pulse' : 'animate-pulse'}`,
          title: 'text-yellow-800',
          description: 'text-yellow-600',
          progress: 'bg-yellow-400',
          pulse: ''
        };
      }
      
      // 運行中狀態樣式
      const enhancedAnimations = enableEnhancedAnimations 
        ? 'breathing-glow gradient-shift float'
        : 'animate-pulse shadow-md';
      const iconAnimation = enableEnhancedAnimations 
        ? 'enhanced-bounce pulse-glow' 
        : 'animate-pulse';
      return {
        container: `${baseAnimationClass} bg-blue-50 border-blue-200 ${enhancedAnimations}`,
        icon: `text-blue-600 bg-blue-100 ${iconAnimation}`,
        title: 'text-blue-800',
        description: 'text-blue-600',
        progress: `bg-blue-500 ${enableEnhancedAnimations ? 'progress-flow' : ''}`,
        pulse: enableEnhancedAnimations ? 'wave' : ''
      };
    }
    
    if (stageInfo.status === 'error') {
      const errorAnimation = enableEnhancedAnimations ? 'shake' : '';
      return {
        container: `${baseAnimationClass} bg-red-50 border-red-200 ${errorAnimation}`,
        icon: 'text-red-600 bg-red-100',
        title: 'text-red-800',
        description: 'text-red-600',
        progress: 'bg-red-500',
        pulse: ''
      };
    }
    
    // pending or idle
    return {
      container: `${baseAnimationClass} bg-gray-50 border-gray-200`,
      icon: 'text-gray-500 bg-gray-100',
      title: 'text-gray-700',
      description: 'text-gray-500',
      progress: 'bg-gray-300',
      pulse: ''
    };
  };

  // 渲染單個階段
  const renderStage = (stageKey: StageType, index: number) => {
    const stageConfig = STAGE_CONFIGS[stageKey];
    const stageInfo = progressState.stages[stageKey];
    const stageNumber = stageNumbers[stageKey];
    const isActive = progressState.currentStage === stageNumber;
    const styles = getStageStyles(stageInfo, isActive);
    
    // 獲取詳細階段描述
    const stageDescription = showDetailedDescription 
      ? getStageDescription(stageKey, stageInfo, progressState.status)
      : null;

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
            flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold relative
            ${styles.icon}
          `}>
            {stageInfo.status === 'completed' ? '✓' : 
             stageInfo.status === 'running' ? 
               (progressState.status === 'paused' ? '⏸️' : stageConfig.icon) :
             stageNumber}
            
            {/* 暫停狀態指示 */}
            {progressState.status === 'paused' && stageInfo.status === 'running' && isActive && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center text-xs">
                ⏸
              </div>
            )}
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className={`font-semibold text-sm ${styles.title}`}>
              {showDetailedDescription && stageDescription ? stageDescription.title : stageConfig.name}
            </h3>
            <p className={`text-xs ${styles.description}`}>
              {showDetailedDescription && stageDescription ? 
                stageDescription.subtitle : stageConfig.description}
            </p>
            {/* 詳細描述 */}
            {showDetailedDescription && stageDescription && stageDescription.detail && (
              <p className={`text-xs mt-1 ${styles.description} font-medium`}>
                {stageDescription.detail}
              </p>
            )}
            {/* 進度文字 */}
            {showDetailedDescription && stageDescription && stageDescription.progressText && (
              <p className={`text-xs mt-1 ${styles.title} font-semibold`}>
                {stageDescription.progressText}
              </p>
            )}
          </div>
        </div>

        {/* 階段進度條 */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-medium ${styles.title}`}>
              進度
            </span>
            <span className={`text-xs ${styles.description} ${enableEnhancedAnimations && stageInfo.status === 'running' ? 'counter-roll' : ''}`}>
              {stageInfo.progress.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${styles.progress} ${styles.pulse}`}
              style={{ 
                width: `${stageInfo.progress}%`,
                transition: enableEnhancedAnimations ? 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'width 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* 子任務詳情 */}
        {showSubtasks && stageInfo.subtasks.length > 0 && (
          <div className={`mt-3 space-y-1 ${enableEnhancedAnimations ? 'stage-expand animate-fade-in-scale' : 'animate-in fade-in-slide-up'}`}>
            <div className={`text-xs font-medium ${styles.title} mb-2`}>
              子任務：
            </div>
            {stageInfo.subtasks.map((subtask, index) => (
              <div 
                key={subtask.id} 
                className={`flex items-center text-xs ${enableEnhancedAnimations ? 'animate-slide-in-up' : ''}`}
                style={{
                  animationDelay: enableEnhancedAnimations ? `${index * 0.1}s` : undefined
                }}
              >
                <div className={`
                  w-2 h-2 rounded-full mr-2 flex-shrink-0 transition-all duration-300
                  ${subtask.status === 'completed' ? `bg-green-500 ${enableEnhancedAnimations ? 'success-pop' : ''}` :
                    subtask.status === 'running' ? `bg-blue-500 ${enableEnhancedAnimations ? 'enhanced-bounce' : 'animate-pulse'}` :
                    subtask.status === 'error' ? 'bg-red-500 shake' : 'bg-gray-300'}
                `} />
                <span className={`flex-1 ${styles.description} ${subtask.status === 'running' && enableEnhancedAnimations ? 'typing' : ''}`}>
                  {subtask.name}
                </span>
                {subtask.progress !== undefined && (
                  <span className={`ml-2 ${styles.description} ${enableEnhancedAnimations && subtask.status === 'running' ? 'count-animation' : ''}`}>
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

        {/* 暫停狀態訊息 */}
        {progressState.status === 'paused' && stageInfo.status === 'running' && isActive && (
          <div className={`mt-2 p-2 bg-yellow-100 border border-yellow-200 rounded text-xs text-yellow-700 ${enableEnhancedAnimations ? 'paused-pulse animate-fade-in-scale' : 'fade-in-slide-up'}`}>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2 flex-shrink-0">
                <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <span>分析已暫停，您可以選擇恢復或取消分析</span>
            </div>
          </div>
        )}

        {/* 錯誤訊息 */}
        {stageInfo.status === 'error' && stageInfo.errorMessage && (
          <div className={`mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700 ${enableEnhancedAnimations ? 'animate-fade-in-scale shake' : 'fade-in-slide-up'}`}>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2 flex-shrink-0">
                <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <span>錯誤：{stageInfo.errorMessage}</span>
            </div>
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
      ${enableEnhancedAnimations ? 'gpu-accelerated' : ''}
    `}>
      {stages.map((stage, index) => renderStage(stage, index))}
    </div>
  );
}