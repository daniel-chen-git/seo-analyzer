import React, { useCallback, useState } from 'react';
import type { AnalysisOptions as AnalysisOptionsType } from '../../types/form';

interface AnalysisOptionsProps {
  options: AnalysisOptionsType;
  onChange: (options: AnalysisOptionsType) => void;
  disabled?: boolean;
  className?: string;
}

interface OptionConfig {
  key: keyof AnalysisOptionsType;
  label: string;
  description: string;
  icon: string;
}

const optionConfigs: OptionConfig[] = [
  {
    key: 'generate_draft',
    label: '產生內容草稿',
    description: '根據分析結果自動產生 SEO 優化內容草稿',
    icon: '📝'
  },
  {
    key: 'include_faq',
    label: '包含常見問答',
    description: '加入相關的 FAQ 區塊提升內容豐富度',
    icon: '❓'
  },
  {
    key: 'include_table',
    label: '包含資料表格',
    description: '產生結構化的數據表格和比較圖表',
    icon: '📊'
  }
];

export const AnalysisOptions: React.FC<AnalysisOptionsProps> = ({
  options,
  onChange,
  disabled = false,
  className = ''
}) => {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // 處理單個選項變更
  const handleOptionChange = useCallback((key: keyof AnalysisOptionsType, checked: boolean) => {
    onChange({
      ...options,
      [key]: checked
    });
  }, [options, onChange]);

  // 處理全選/取消全選
  const handleSelectAll = useCallback(() => {
    const allSelected = Object.values(options).every(value => value);
    const newOptions = {
      generate_draft: !allSelected,
      include_faq: !allSelected,
      include_table: !allSelected
    };
    onChange(newOptions);
  }, [options, onChange]);

  // 檢查是否全選
  const isAllSelected = Object.values(options).every(value => value);
  const selectedCount = Object.values(options).filter(value => value).length;

  const containerClasses = [
    'w-full p-4 border border-gray-200 rounded-lg bg-white',
    disabled && 'opacity-60 pointer-events-none',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* 標題與全選按鈕 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          <h3 className="text-sm font-medium text-gray-700">分析選項</h3>
          <span className="text-xs text-gray-500">({selectedCount}/3 已選擇)</span>
        </div>
        
        <button
          type="button"
          onClick={handleSelectAll}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <span>{isAllSelected ? '☑️' : '☐'}</span>
          {isAllSelected ? '取消全選' : '全選'}
        </button>
      </div>

      {/* 選項列表 */}
      <div className="space-y-3">
        {optionConfigs.map((config) => {
          const isChecked = options[config.key];
          const isHovered = hoveredOption === config.key;
          
          return (
            <div key={config.key} className="relative">
              <label
                className={`
                  flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200
                  ${isHovered ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}
                  ${isChecked ? 'bg-blue-50 border border-blue-200' : 'border border-transparent'}
                  ${disabled ? 'cursor-not-allowed' : ''}
                `}
                onMouseEnter={() => setHoveredOption(config.key)}
                onMouseLeave={() => setHoveredOption(null)}
              >
                {/* Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleOptionChange(config.key, e.target.checked)}
                    disabled={disabled}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </div>

                {/* 內容區域 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className={`text-sm font-medium ${isChecked ? 'text-blue-900' : 'text-gray-900'}`}>
                      {config.label}
                    </span>
                  </div>
                  
                  <p className={`text-xs mt-1 ${isChecked ? 'text-blue-700' : 'text-gray-600'}`}>
                    {config.description}
                  </p>
                </div>

                {/* 資訊按鈕 */}
                <div className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => setShowTooltip(config.key)}
                    onMouseLeave={() => setShowTooltip(null)}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    tabIndex={-1}
                  >
                    <span className="text-sm">ℹ️</span>
                  </button>

                  {/* Tooltip */}
                  {showTooltip === config.key && (
                    <div className="absolute right-0 top-8 z-10 w-64 p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg">
                      <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-800 transform rotate-45"></div>
                      {config.description}
                    </div>
                  )}
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {/* 底部說明 */}
      {selectedCount === 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 text-sm">⚠️</span>
            <p className="text-xs text-yellow-800">
              建議至少選擇一個分析選項以獲得完整的 SEO 分析報告
            </p>
          </div>
        </div>
      )}

      {selectedCount === 3 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start gap-2">
            <span className="text-green-600 text-sm">✅</span>
            <p className="text-xs text-green-800">
              已選擇所有分析選項，將為您提供最完整的 SEO 分析報告
            </p>
          </div>
        </div>
      )}
    </div>
  );
};