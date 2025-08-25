import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { FieldValidationState } from '../../types/form';

interface AudienceTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  validationState?: FieldValidationState;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  minRows?: number;
  maxRows?: number;
  className?: string;
}

export const AudienceTextArea: React.FC<AudienceTextAreaProps> = ({
  value,
  onChange,
  onBlur,
  onFocus,
  validationState,
  disabled = false,
  placeholder = '描述您的目標受眾...',
  maxLength = 200,
  minRows = 3,
  maxRows = 8,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const characterCount = value.length;
  const isValid = validationState?.status === 'valid';
  const isInvalid = validationState?.status === 'invalid';
  const isValidating = validationState?.status === 'validating';
  const hasError = validationState?.errors && validationState.errors.length > 0;
  const errorMessage = hasError ? validationState.errors[0] : '';

  // 自動調整高度
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 重置高度以計算正確的 scrollHeight
    textarea.style.height = 'auto';
    
    // 計算行數
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const currentRows = Math.ceil(textarea.scrollHeight / lineHeight);
    
    // 限制在 minRows 和 maxRows 之間
    const targetRows = Math.min(Math.max(currentRows, minRows), maxRows);
    textarea.style.height = `${targetRows * lineHeight}px`;
  }, [minRows, maxRows]);

  // 當內容改變時調整高度
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // 限制最大長度
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  }, [onChange, maxLength]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  // 計算進度百分比
  const progressPercent = (characterCount / maxLength) * 100;
  const isNearLimit = progressPercent > 80;

  // 動態樣式類名
  const textareaClasses = [
    'w-full px-4 py-3 border rounded-lg transition-all duration-200 text-base',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    'placeholder:text-gray-400 resize-none overflow-hidden',
    
    // 狀態樣式
    isFocused && !hasError && 'ring-2 ring-blue-500 border-blue-500',
    isValid && !isFocused && 'border-green-500 bg-green-50',
    isInvalid && 'border-red-500 bg-red-50',
    disabled && 'bg-gray-100 cursor-not-allowed opacity-60',
    
    // 響應式字體
    'sm:text-sm',
    
    className
  ].filter(Boolean).join(' ');

  const containerClasses = [
    'relative',
    'w-full'
  ].join(' ');

  return (
    <div className={containerClasses}>
      {/* 標籤與圖示 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">👥</span>
        <label className="text-sm font-medium text-gray-700">
          目標受眾描述
        </label>
        {isValidating && (
          <span className="text-xs text-blue-500 animate-pulse">
            驗證中...
          </span>
        )}
      </div>

      {/* 文字區域 */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={textareaClasses}
          maxLength={maxLength}
          rows={minRows}
          aria-invalid={hasError}
          aria-describedby={hasError ? 'audience-error' : undefined}
        />
      </div>

      {/* 進度條與字元計數 */}
      <div className="mt-2">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className={`${isNearLimit ? 'text-orange-500' : 'text-gray-500'}`}>
            {characterCount}/{maxLength} 字元
          </span>
          <span className="text-gray-400">
            {maxLength - characterCount > 0 
              ? `還可輸入 ${maxLength - characterCount} 字元` 
              : '已達字元上限'
            }
          </span>
        </div>
        
        {/* 進度條 */}
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isNearLimit 
                ? progressPercent >= 100 
                  ? 'bg-red-500' 
                  : 'bg-orange-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* 狀態訊息 */}
      <div className="mt-2 min-h-[1.25rem]">
        {hasError ? (
          <p id="audience-error" className="text-sm text-red-600 flex items-center gap-1">
            <span>❌</span>
            {errorMessage}
          </p>
        ) : isValid && value ? (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <span>✅</span>
            受眾描述格式正確
          </p>
        ) : (
          <div className="text-sm text-gray-500">
            <div className="flex items-start gap-1">
              <span>💡</span>
              <span>
                {characterCount === 0 
                  ? '請詳細描述您的目標受眾，有助於產生更精準的內容' 
                  : '詳細描述有助於產生更符合需求的分析報告'
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};