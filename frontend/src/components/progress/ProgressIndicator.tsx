import { useMemo } from 'react';
import { ProgressBar } from './ProgressBar';
import { StageIndicator } from './StageIndicator';
import { TimeEstimator } from './TimeEstimator';
import { CancelButton } from './CancelButton';
import type { ProgressState } from '../../types/progress';

export interface ProgressIndicatorProps {
  /** 當前進度狀態 */
  progressState: ProgressState;
  /** 取消操作回調函數 */
  onCancel: () => Promise<void> | void;
  /** 顯示配置 */
  displayOptions?: {
    /** 是否顯示整體進度條 */
    showProgressBar?: boolean;
    /** 是否顯示階段指示器 */
    showStageIndicator?: boolean;
    /** 是否顯示時間估算器 */
    showTimeEstimator?: boolean;
    /** 是否顯示取消按鈕 */
    showCancelButton?: boolean;
    /** 是否顯示子任務詳情 */
    showSubtasks?: boolean;
    /** 階段指示器模式 */
    stageIndicatorMode?: 'horizontal' | 'vertical';
    /** 時間估算器變體 */
    timeEstimatorVariant?: 'compact' | 'detailed' | 'minimal';
  };
  /** 佈局配置 */
  layout?: 'default' | 'compact' | 'detailed';
  /** 自定義樣式類名 */
  className?: string;
  /** 是否啟用動畫 */
  animated?: boolean;
}

const defaultDisplayOptions = {
  showProgressBar: true,
  showStageIndicator: true,
  showTimeEstimator: true,
  showCancelButton: true,
  showSubtasks: false,
  stageIndicatorMode: 'horizontal' as const,
  timeEstimatorVariant: 'detailed' as const
};

export function ProgressIndicator({
  progressState,
  onCancel,
  displayOptions = {},
  layout = 'default',
  className = '',
  animated = true
}: ProgressIndicatorProps) {
  // 合併顯示配置
  const options = useMemo(() => ({
    ...defaultDisplayOptions,
    ...displayOptions
  }), [displayOptions]);

  // 根據佈局調整顯示配置
  const layoutConfig = useMemo(() => {
    switch (layout) {
      case 'compact':
        return {
          ...options,
          showProgressBar: true,
          showStageIndicator: false,
          timeEstimatorVariant: 'compact' as const,
          stageIndicatorMode: 'horizontal' as const
        };
      case 'detailed':
        return {
          ...options,
          showSubtasks: true,
          timeEstimatorVariant: 'detailed' as const,
          stageIndicatorMode: 'vertical' as const
        };
      default:
        return options;
    }
  }, [layout, options]);

  // 計算容器樣式
  const getContainerClasses = () => {
    const baseClasses = 'bg-white rounded-lg border border-gray-200 p-6 space-y-6';
    const animationClasses = animated ? 'transition-all duration-300 ease-out' : '';
    
    switch (layout) {
      case 'compact':
        return `${baseClasses} p-4 space-y-4 ${animationClasses}`;
      case 'detailed':
        return `${baseClasses} p-8 space-y-8 ${animationClasses}`;
      default:
        return `${baseClasses} ${animationClasses}`;
    }
  };

  // 渲染標題區域
  const renderHeader = () => {
    if (layout === 'compact') return null;

    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          SEO 分析進度
        </h2>
        <p className="text-sm text-gray-600">
          正在為您分析關鍵字並生成 SEO 優化建議...
        </p>
      </div>
    );
  };

  // 渲染進度概覽區域
  const renderProgressOverview = () => {
    if (!layoutConfig.showProgressBar && !layoutConfig.showTimeEstimator) {
      return null;
    }

    if (layout === 'compact') {
      return (
        <div className="flex items-center justify-between space-x-4">
          {layoutConfig.showProgressBar && (
            <div className="flex-1">
              <ProgressBar
                progress={progressState.overallProgress}
                status={progressState.status}
                showPercentage={true}
                height="sm"
                animated={animated}
              />
            </div>
          )}
          {layoutConfig.showTimeEstimator && (
            <TimeEstimator
              progressState={progressState}
              variant={layoutConfig.timeEstimatorVariant}
              showEfficiency={false}
            />
          )}
        </div>
      );
    }

    return (
      <div className={`
        ${layout === 'detailed' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}
      `}>
        {layoutConfig.showProgressBar && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              整體進度
            </h3>
            <ProgressBar
              progress={progressState.overallProgress}
              status={progressState.status}
              showPercentage={true}
              animated={animated}
            />
          </div>
        )}
        {layoutConfig.showTimeEstimator && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              時間預估
            </h3>
            <TimeEstimator
              progressState={progressState}
              variant={layoutConfig.timeEstimatorVariant}
              showDetails={layout === 'detailed'}
              showEfficiency={layout === 'detailed'}
            />
          </div>
        )}
      </div>
    );
  };

  // 渲染階段指示器
  const renderStageIndicator = () => {
    if (!layoutConfig.showStageIndicator) return null;

    return (
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          分析階段
        </h3>
        <StageIndicator
          progressState={progressState}
          showSubtasks={layoutConfig.showSubtasks}
          mode={layoutConfig.stageIndicatorMode}
        />
      </div>
    );
  };

  // 渲染操作區域
  const renderActions = () => {
    if (!layoutConfig.showCancelButton) return null;

    return (
      <div className={`
        flex 
        ${layout === 'compact' ? 'justify-end' : 'justify-center pt-4 border-t border-gray-200'}
      `}>
        <CancelButton
          status={progressState.status}
          canCancel={progressState.canCancel}
          onCancel={onCancel}
          size={layout === 'compact' ? 'sm' : 'md'}
          variant="outline"
        />
      </div>
    );
  };

  // 根據狀態添加特殊樣式
  const getStatusClasses = () => {
    switch (progressState.status) {
      case 'starting':
      case 'running':
        return 'ring-2 ring-blue-500/20 shadow-lg';
      case 'paused':
        return 'ring-2 ring-yellow-500/20 shadow-lg';
      case 'completed':
        return 'ring-2 ring-green-500/20 shadow-lg';
      case 'error':
        return 'ring-2 ring-red-500/20 shadow-lg';
      case 'cancelled':
        return 'ring-2 ring-gray-400/20';
      default:
        return '';
    }
  };

  return (
    <div 
      className={`
        ${getContainerClasses()}
        ${getStatusClasses()}
        ${className}
      `}
      role="status" 
      aria-live="polite"
      aria-label="SEO 分析進度指示器"
    >
      {renderHeader()}
      {renderProgressOverview()}
      {renderStageIndicator()}
      {renderActions()}

      {/* 狀態完成時的特殊提示 */}
      {progressState.status === 'completed' && (
        <div className={`
          bg-green-50 border border-green-200 rounded-lg p-4 text-center
          ${animated ? 'animate-in fade-in slide-in-from-bottom-2 duration-500' : ''}
        `}>
          <div className="flex items-center justify-center mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h4 className="font-medium text-green-800 mb-1">分析完成！</h4>
          <p className="text-sm text-green-700">
            SEO 分析報告已經準備完成，您可以查看詳細結果。
          </p>
        </div>
      )}

      {/* 錯誤狀態的特殊提示 */}
      {progressState.status === 'error' && (
        <div className={`
          bg-red-50 border border-red-200 rounded-lg p-4 text-center
          ${animated ? 'animate-in fade-in slide-in-from-bottom-2 duration-500' : ''}
        `}>
          <div className="flex items-center justify-center mb-2">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h4 className="font-medium text-red-800 mb-1">分析失敗</h4>
          <p className="text-sm text-red-700">
            分析過程中發生錯誤，請重試或聯繫客服協助。
          </p>
        </div>
      )}

      {/* 暫停狀態的特殊提示 */}
      {progressState.status === 'paused' && (
        <div className={`
          bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center
          ${animated ? 'animate-in fade-in slide-in-from-bottom-2 duration-500' : ''}
        `}>
          <div className="flex items-center justify-center mb-2">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h4 className="font-medium text-yellow-800 mb-1">分析已暫停</h4>
          <p className="text-sm text-yellow-700">
            分析已暫停，您可以選擇恢復分析或取消分析。
          </p>
        </div>
      )}
    </div>
  );
}