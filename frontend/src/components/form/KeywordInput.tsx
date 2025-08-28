import React, { useCallback, useState } from 'react';
import type { FieldValidationState } from '../../types/form';

interface KeywordInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  validationState?: FieldValidationState;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export const KeywordInput: React.FC<KeywordInputProps> = ({
  value,
  onChange,
  onBlur,
  onFocus,
  validationState,
  disabled = false,
  placeholder = '請輸入要分析的關鍵字',
  maxLength = 50,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const characterCount = value.length;
  const isValid = validationState?.status === 'valid';
  const isInvalid = validationState?.status === 'invalid';
  const isValidating = validationState?.status === 'validating';
  const hasError = validationState?.errors && validationState.errors.length > 0;
  const errorMessage = hasError ? validationState.errors[0] : '';

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

  // 動態樣式類名
  const inputClasses = [
    'w-full px-4 py-3 pr-20 border rounded-lg transition-all duration-200 text-base',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    'placeholder:text-gray-400',
    
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
        <span className="text-lg">🔍</span>
        <label className="text-sm font-medium text-gray-700">
          關鍵字
        </label>
        {isValidating && (
          <span className="text-xs text-blue-500 animate-pulse">
            驗證中...
          </span>
        )}
      </div>

      {/* 輸入欄位 */}
      <div className="space-y-1">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
          maxLength={maxLength}
          autoComplete="off"
          aria-invalid={hasError}
          aria-describedby={hasError ? 'keyword-error' : undefined}
        />
        
        {/* 字元計數器 - 移到輸入框下方 */}
        <div className="flex justify-end">
          <span className={`text-xs ${characterCount > maxLength * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
            {characterCount}/{maxLength}
          </span>
        </div>
      </div>

      {/* 狀態訊息 */}
      <div className="mt-1 min-h-[1.25rem]">
        {hasError ? (
          <p id="keyword-error" className="text-sm text-red-600 flex items-center gap-1">
            <span>❌</span>
            {errorMessage}
          </p>
        ) : isValid && value ? (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <span>✅</span>
            關鍵字格式正確
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            {characterCount === 0 
              ? '請輸入 1-50 字元的關鍵字' 
              : `還可輸入 ${maxLength - characterCount} 字元`
            }
          </p>
        )}
      </div>
    </div>
  );
};