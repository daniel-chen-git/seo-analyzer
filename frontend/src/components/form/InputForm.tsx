import React, { useCallback, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeywordInput } from './KeywordInput';
import { AudienceTextArea } from './AudienceTextArea';
import { AnalysisOptions } from './AnalysisOptions';
import { SubmitButton } from './SubmitButton';
import { useFormValidation } from '../../hooks/form';
import type { AnalyzeFormData, AnalysisOptions as AnalysisOptionsType } from '../../types/form';
import { analyzeFormSchema } from '../../types/form';

interface InputFormProps {
  onSubmit: (data: AnalyzeFormData) => Promise<void>;
  onReset?: () => void;
  initialValues?: Partial<AnalyzeFormData>;
  isSubmitting?: boolean;
  analysisStatus?: 'idle' | 'starting' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled';
  className?: string;
}

export const InputForm: React.FC<InputFormProps> = ({
  onSubmit,
  onReset,
  initialValues,
  isSubmitting = false,
  analysisStatus = 'idle',
  className = ''
}) => {
  // React Hook Form 設置
  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<AnalyzeFormData>({
    resolver: zodResolver(analyzeFormSchema),
    defaultValues: {
      keyword: initialValues?.keyword || '',
      audience: initialValues?.audience || '',
      options: {
        generate_draft: initialValues?.options?.generate_draft ?? true,
        include_faq: initialValues?.options?.include_faq ?? false,
        include_table: initialValues?.options?.include_table ?? true
      }
    },
    mode: 'onChange'
  });

  // 監聽表單值變化
  const formValues = watch();
  const keyword = watch('keyword');
  const audience = watch('audience');
  const options = watch('options');

  // 自定義驗證 Hook
  const {
    validateField,
    handleFieldBlur,
    getFieldState,
    resetValidation
  } = useFormValidation(analyzeFormSchema);

  // 提交狀態
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // 更新提交狀態，基於分析狀態
  useEffect(() => {
    switch (analysisStatus) {
      case 'starting':
      case 'running':
        setSubmitStatus('loading');
        break;
      case 'completed':
        setSubmitStatus('success');
        break;
      case 'error':
        setSubmitStatus('error');
        break;
      default:
        if (isSubmitting) {
          setSubmitStatus('loading');
        } else {
          setSubmitStatus('idle');
        }
        break;
    }
  }, [analysisStatus, isSubmitting]);

  // 處理關鍵字變更
  const handleKeywordChange = useCallback((value: string) => {
    setValue('keyword', value, { shouldValidate: true, shouldDirty: true });
    validateField('keyword', value, formValues);
  }, [setValue, validateField, formValues]);

  // 處理受眾描述變更
  const handleAudienceChange = useCallback((value: string) => {
    setValue('audience', value, { shouldValidate: true, shouldDirty: true });
    validateField('audience', value, formValues);
  }, [setValue, validateField, formValues]);

  // 處理分析選項變更
  const handleOptionsChange = useCallback((newOptions: AnalysisOptionsType) => {
    setValue('options', newOptions, { shouldValidate: true, shouldDirty: true });
    validateField('options', newOptions, formValues);
  }, [setValue, validateField, formValues]);

  // 處理關鍵字失焦
  const handleKeywordBlur = useCallback(() => {
    handleFieldBlur('keyword', keyword);
  }, [handleFieldBlur, keyword]);

  // 處理受眾描述失焦
  const handleAudienceBlur = useCallback(() => {
    handleFieldBlur('audience', audience);
  }, [handleFieldBlur, audience]);

  // 表單提交處理
  const handleFormSubmit = useCallback(async (data: AnalyzeFormData) => {
    try {
      setSubmitStatus('loading');
      await onSubmit(data);
      setSubmitStatus('success');
    } catch (error) {
      console.error('表單提交錯誤:', error);
      setSubmitStatus('error');
    }
  }, [onSubmit]);

  // 表單重置處理
  const handleFormReset = useCallback(() => {
    reset();
    resetValidation();
    setSubmitStatus('idle');
    onReset?.();
  }, [reset, resetValidation, onReset]);

  // 容器樣式
  const containerClasses = [
    'w-full max-w-2xl',
    'bg-white rounded-xl shadow-lg border border-gray-200',
    'p-6 space-y-6',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* 表單標題 */}
      <div className="text-center border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          SEO 關鍵字分析
        </h2>
        <p className="text-sm text-gray-600">
          輸入您的關鍵字和目標受眾，獲得專業的 SEO 分析報告
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* 關鍵字輸入欄位 */}
        <div>
          <KeywordInput
            value={keyword}
            onChange={handleKeywordChange}
            onBlur={handleKeywordBlur}
            validationState={getFieldState('keyword')}
            disabled={isSubmitting}
            maxLength={50}
          />
          {errors.keyword && (
            <p className="mt-1 text-sm text-red-600">
              {errors.keyword.message}
            </p>
          )}
        </div>

        {/* 受眾描述文字區域 */}
        <div>
          <AudienceTextArea
            value={audience}
            onChange={handleAudienceChange}
            onBlur={handleAudienceBlur}
            validationState={getFieldState('audience')}
            disabled={isSubmitting}
            maxLength={200}
            minRows={3}
            maxRows={8}
          />
          {errors.audience && (
            <p className="mt-1 text-sm text-red-600">
              {errors.audience.message}
            </p>
          )}
        </div>

        {/* 分析選項 */}
        <div>
          <AnalysisOptions
            options={options}
            onChange={handleOptionsChange}
            disabled={isSubmitting}
          />
          {errors.options && (
            <p className="mt-1 text-sm text-red-600">
              請選擇至少一個分析選項
            </p>
          )}
        </div>

        {/* 提交按鈕 */}
        <div>
          <SubmitButton
            onSubmit={() => handleSubmit(handleFormSubmit)()}
            onReset={handleFormReset}
            status={submitStatus}
            isFormValid={isValid}
            disabled={isSubmitting}
          />
        </div>
      </form>

      {/* 表單狀態資訊 */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className={`${isValid ? 'text-green-600' : 'text-orange-600'}`}>
              {isValid ? '✅ 表單驗證通過' : '⚠️ 請完成必填欄位'}
            </span>
            {isDirty && (
              <span className="text-blue-600">
                📝 表單已修改
              </span>
            )}
          </div>
          
          <div className="text-right">
            <div>關鍵字: {keyword.length}/50</div>
            <div>受眾描述: {audience.length}/200</div>
          </div>
        </div>
      </div>
    </div>
  );
};