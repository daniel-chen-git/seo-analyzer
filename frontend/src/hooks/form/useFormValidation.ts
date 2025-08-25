import { useState, useCallback } from 'react';
import { z } from 'zod';
import type { ValidationConfig, FormValidationState, FieldValidationState } from '../../types/form';

/**
 * useFormValidation Hook
 * 提供表單欄位驗證功能
 */
export function useFormValidation<T extends Record<string, unknown>>(
  schema: z.ZodSchema<T>,
  options: ValidationConfig = {}
) {
  const {
    validateOnBlur = true
  } = options;

  const [validationState, setValidationState] = useState<FormValidationState>({
    isValid: false,
    isValidating: false,
    fields: {},
    globalErrors: []
  });

  /**
   * 驗證單一欄位 - 簡化版本
   */
  const validateField = useCallback((fieldName: string, value: unknown, formData: T) => {
    setValidationState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: {
          status: 'validating',
          errors: [],
          characterCount: typeof value === 'string' ? value.length : undefined
        }
      }
    }));

    // 使用 setTimeout 模擬防抖
    setTimeout(() => {
      try {
        schema.parse({ ...formData, [fieldName]: value } as T);
        
        setValidationState(prev => ({
          ...prev,
          fields: {
            ...prev.fields,
            [fieldName]: {
              status: 'valid',
              errors: [],
              characterCount: typeof value === 'string' ? value.length : undefined
            }
          }
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors = error.issues
            .filter(issue => issue.path.join('.') === fieldName)
            .map(issue => issue.message);
          
          setValidationState(prev => ({
            ...prev,
            fields: {
              ...prev.fields,
              [fieldName]: {
                status: 'invalid',
                errors: fieldErrors,
                characterCount: typeof value === 'string' ? value.length : undefined
              }
            }
          }));
        }
      }
    }, 300);
  }, [schema]);

  /**
   * 驗證整個表單
   */
  const validateForm = useCallback((data: T) => {
    try {
      schema.parse(data);
      setValidationState(prev => ({
        ...prev,
        isValid: true,
        globalErrors: []
      }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationState(prev => ({
          ...prev,
          isValid: false,
          globalErrors: error.issues.map(issue => issue.message)
        }));
      }
    }
  }, [schema]);

  /**
   * 即時驗證
   */
  const validateFieldImmediate = useCallback((fieldName: string, value: unknown) => {
    const errors: string[] = [];
    
    // 簡化驗證邏輯
    if (fieldName === 'keyword' && typeof value === 'string') {
      if (value.length === 0) {
        errors.push('關鍵字不可為空');
      } else if (value.length > 50) {
        errors.push('關鍵字長度不可超過 50 字元');
      }
    }
    
    if (fieldName === 'audience' && typeof value === 'string') {
      if (value.length === 0) {
        errors.push('受眾描述不可為空');
      } else if (value.length > 200) {
        errors.push('受眾描述長度不可超過 200 字元');
      }
    }
    
    setValidationState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: {
          status: errors.length > 0 ? 'invalid' : 'valid',
          errors,
          characterCount: typeof value === 'string' ? value.length : undefined
        }
      }
    }));
  }, []);

  /**
   * 處理欄位失焦
   */
  const handleFieldBlur = useCallback((fieldName: string, value: unknown) => {
    if (validateOnBlur) {
      validateFieldImmediate(fieldName, value);
    }
  }, [validateFieldImmediate, validateOnBlur]);

  /**
   * 清除錯誤
   */
  const clearErrors = useCallback((fieldName?: string) => {
    if (fieldName) {
      setValidationState(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldName]: {
            status: 'idle',
            errors: []
          }
        }
      }));
    } else {
      setValidationState({
        isValid: false,
        isValidating: false,
        fields: {},
        globalErrors: []
      });
    }
  }, []);

  /**
   * 重置驗證狀態
   */
  const resetValidation = useCallback(() => {
    setValidationState({
      isValid: false,
      isValidating: false,
      fields: {},
      globalErrors: []
    });
  }, []);

  /**
   * 獲取欄位驗證狀態
   */
  const getFieldState = useCallback((fieldName: string): FieldValidationState => {
    return validationState.fields[fieldName] || {
      status: 'idle',
      errors: []
    };
  }, [validationState.fields]);

  /**
   * 檢查欄位是否有錯誤
   */
  const hasFieldError = useCallback((fieldName: string): boolean => {
    const fieldState = validationState.fields[fieldName];
    return fieldState ? fieldState.errors.length > 0 : false;
  }, [validationState.fields]);

  /**
   * 獲取欄位錯誤訊息
   */
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    const fieldState = validationState.fields[fieldName];
    return fieldState && fieldState.errors.length > 0 ? fieldState.errors[0] : undefined;
  }, [validationState.fields]);

  return {
    ...validationState,
    validateField,
    validateForm,
    validateFieldImmediate,
    handleFieldBlur,
    clearErrors,
    resetValidation,
    getFieldState,
    hasFieldError,
    getFieldError
  };
}